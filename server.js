// Pod Town server: static pages, player API, display feed, admin API.
// Run: deno task start
import QRCode from "npm:qrcode@1.5.4";
import * as world from "./game/world.js";
import { ACTS, cleanLook, levelOf, Sim } from "./game/sim.js";
import { interpret } from "./game/llm.js";

const env = (k, d) => Deno.env.get(k) ?? d;
const randomHex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (v) => v.toString(16).padStart(2, "0")).join("");

const PORT = Number(env("PORT", "8080"));
const cfg = {
  timeScale: Math.max(0.1, Number(env("TIME_SCALE", "1"))),
  rafflePrize: env("RAFFLE_PRIZE", "$25 in Runpod Credits"),
  raffleWinners: Math.max(1, Number(env("RAFFLE_WINNERS", "1"))),
  raffleOneWin: env("RAFFLE_ONE_WIN", "1") !== "0",
  claimHours: Number(env("CLAIM_HOURS", "24")),
  llmBaseUrl: env("LLM_BASE_URL", ""),
  llmApiKey: env("LLM_API_KEY", ""),
  llmModel: env("LLM_MODEL", ""),
  llmTimeoutMs: Number(env("LLM_TIMEOUT_MS", "10000")),
};
const DATA_FILE = env("DATA_FILE", new URL("./data/state.json", import.meta.url).pathname);
const MAX_PLAYERS = Number(env("MAX_PLAYERS", "2000"));
const TICK_MS = 350;

let ADMIN_TOKEN = env("ADMIN_TOKEN", "");
if (!ADMIN_TOKEN) {
  ADMIN_TOKEN = randomHex(12);
  console.log(`[admin] ADMIN_TOKEN not set. Generated for this run: ${ADMIN_TOKEN}`);
}

function lanIp() {
  try {
    for (const i of Deno.networkInterfaces()) {
      if (i.family === "IPv4" && !i.address.startsWith("127.") && !i.address.startsWith("169.254.")) return i.address;
    }
  } catch { /* no permission */ }
  return "localhost";
}
// On a Runpod Pod the public address is the HTTP proxy URL for this Pod and port.
const podId = env("RUNPOD_POD_ID", "");
const defaultUrl = podId ? `https://${podId}-${PORT}.proxy.runpod.net` : `http://${lanIp()}:${PORT}`;
const PUBLIC_URL = (env("PUBLIC_URL", "") || defaultUrl).replace(/\/$/, "");
const JOIN_URL = PUBLIC_URL + "/play";

// ---- state ----
let saved = null;
try {
  saved = JSON.parse(await Deno.readTextFile(DATA_FILE));
  console.log(`[state] loaded ${saved.players?.length || 0} players from ${DATA_FILE}`);
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) throw e; // never silently discard a corrupt save
}
const sim = new Sim(cfg, saved);

let saving = false;
async function save() {
  if (!sim.dirty || saving) return;
  saving = true;
  sim.dirty = false;
  try {
    const tmp = DATA_FILE + ".tmp";
    await Deno.writeTextFile(tmp, JSON.stringify(sim.serialize()));
    await Deno.rename(tmp, DATA_FILE);
  } catch (e) {
    sim.dirty = true;
    console.error("[state] save failed:", e.message);
  } finally {
    saving = false;
  }
}
setInterval(save, 5000);
for (const sig of ["SIGINT", "SIGTERM"]) {
  Deno.addSignalListener(sig, async () => { sim.dirty = true; await save(); Deno.exit(0); });
}

// ---- display feed ----
// The big screen polls plain HTTP rather than holding a WebSocket open:
// proxies and browser shields sometimes stall WebSockets, and a stalled feed
// leaves the public display blank. The snapshot is built once per tick and
// served as a ready-made string, so each poll costs almost nothing.
let lastRaffle = null;
sim.onRaffle = (r) => { lastRaffle = { ...r, at: Date.now() }; };

let stateMsg = "{}";
function tick() {
  const now = Date.now();
  sim.tick(now);
  stateMsg = JSON.stringify({ ...sim.snapshot(now), raffle: lastRaffle });
}
tick();
setInterval(tick, TICK_MS);

const initMsg = JSON.stringify({
  w: world.W, h: world.H, grid: world.grid, buildings: world.BUILDINGS,
  labels: Object.entries(world.locs).map(([id, l]) => ({ id, name: l.name, indoor: l.indoor, ...l.label })),
  acts: Object.fromEntries(Object.entries(ACTS).map(([id, a]) => [id, { icon: a.icon, loc: a.loc }])),
  tickMs: TICK_MS, joinUrl: JOIN_URL, prize: cfg.rafflePrize,
});

// ---- helpers ----
const BLOCK = ["fuck", "shit", "bitch", "cunt", "nigg", "fag", "rape", "nazi", "hitler", "penis", "vagina", "porn", "dick", "cock", "pussy", "whore", "slut", "kill"];
const isRude = (s) => {
  const t = s.toLowerCase().replace(/[^a-z]/g, "");
  return BLOCK.some((b) => t.includes(b));
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (status, error) => json({ error }, status);

async function body(req) {
  const text = await req.text();
  if (text.length > 10000) throw new Error("too large");
  return text ? JSON.parse(text) : {};
}

const MIME = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", svg: "image/svg+xml", png: "image/png" };
async function staticFile(name) {
  if (!/^[\w-]+\.(html|js|css|svg|png)$/.test(name)) return fail(404, "not found");
  try {
    const data = await Deno.readFile(new URL("./public/" + name, import.meta.url));
    return new Response(data, { headers: { "content-type": MIME[name.split(".").pop()], "cache-control": "no-cache" } });
  } catch {
    return fail(404, "not found");
  }
}

function meView(p) {
  const now = Date.now();
  return {
    now, id: p.id, name: p.name, look: p.look, unlocked: p.unlocked,
    level: levelOf(p.xp), xp: p.xp, nextLevelXp: 40 * levelOf(p.xp) ** 2, coins: p.coins,
    tickets: p.tickets, buff: p.buff,
    status: sim.statusOf(p),
    act: p.act ? { id: p.act.id, start: p.act.start, end: p.act.end, icon: ACTS[p.act.id].icon } : null,
    queue: [...(p.goal && !p.act ? [p.goal.act] : []), ...p.queue].map((id) => ACTS[id].short),
    items: p.items, log: p.log.slice(-8).reverse(),
    wins: sim.winsFor(p),
    nextRaffle: (Math.floor(now / 3600000) + 1) * 3600000,
    prize: cfg.rafflePrize,
    acts: Object.entries(ACTS).map(([id, a]) => ({ id, short: a.short, icon: a.icon, mins: Math.max(1, Math.round(a.mins / cfg.timeScale * 10) / 10), tickets: a.tickets })),
  };
}

const lastCmd = new Map();

function csvCell(v) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
  return `"${s.replace(/"/g, '""')}"`;
}

// ---- routes ----
async function handle(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET") {
    if (path === "/") return staticFile("display.html");
    if (path === "/play") return staticFile("play.html");
    if (path === "/admin") return staticFile("admin.html");
    if (path === "/api/world") return new Response(initMsg, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    if (path === "/api/state") return new Response(stateMsg, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    if (path === "/api/qr.svg") {
      const svg = await QRCode.toString(JOIN_URL, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
      return new Response(svg, { headers: { "content-type": MIME.svg } });
    }
    if (!path.startsWith("/api/")) return staticFile(path.slice(1));
  }

  // --- player API ---
  if (path === "/api/register" && req.method === "POST") {
    const b = await body(req);
    const name = String(b.name || "").trim().replace(/\s+/g, " ");
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,11}$/.test(name)) return fail(400, "Name must be 2-12 letters or numbers.");
    if (isRude(name)) return fail(400, "Please pick a different name.");
    if (sim.byName.has(name.toLowerCase())) return fail(409, "That name is taken. Please pick another.");
    if (sim.players.size >= MAX_PLAYERS) return fail(503, "The town is full right now!");
    const p = sim.addPlayer({ name, look: b.look });
    return json({ token: p.token, me: meView(p) });
  }

  if (path.startsWith("/api/") && !path.startsWith("/api/admin/")) {
    const p = sim.byToken.get(req.headers.get("x-token") || "");
    if (!p) return fail(401, "Not registered.");
    p.lastSeen = Date.now();

    if (path === "/api/me" && req.method === "GET") return json(meView(p));

    if (path === "/api/command" && req.method === "POST") {
      const now = Date.now();
      if (now - (lastCmd.get(p.id) || 0) < 2500) return fail(429, "Slow down a moment!");
      lastCmd.set(p.id, now);
      const b = await body(req);
      let result;
      if (Array.isArray(b.steps)) {
        const steps = b.steps.filter((s) => s === "stop" || Object.hasOwn(ACTS, s)).slice(0, 3);
        result = { steps, say: null, via: "button" };
      } else {
        const text = String(b.text || "").trim().slice(0, 200);
        if (!text) return fail(400, "Type what your character should do.");
        result = await interpret(text, cfg);
      }
      if (result.say && isRude(result.say)) result.say = null;
      if (!sim.players.has(p.id)) return fail(401, "Not registered.");
      const wasBusy = !!p.act;
      sim.command(p, result.steps, result.say);
      let reply;
      if (!result.steps.length) reply = "Hmm, I'm not sure how to do that. Try something like \"train a model at the gym\" or \"fish for data, then play in the sandbox\".";
      else if (result.steps[0] === "stop") reply = "Okay! Dropping everything.";
      else {
        const names = result.steps.map((s) => ACTS[s].short).join(" → ");
        reply = wasBusy ? `Queued after the current activity: ${names}` : `On my way: ${names}`;
      }
      return json({ reply, steps: result.steps, via: result.via, me: meView(p) });
    }

    if (path === "/api/look" && req.method === "POST") {
      const b = await body(req);
      p.look = cleanLook(b.look, p.unlocked);
      sim.dirty = true;
      return json({ me: meView(p) });
    }

    return fail(404, "not found");
  }

  // --- admin API ---
  if (path.startsWith("/api/admin/")) {
    if ((req.headers.get("x-admin-token") || "") !== ADMIN_TOKEN) return fail(401, "Bad admin token.");

    if (path === "/api/admin/state" && req.method === "GET") {
      return json({
        now: Date.now(), joinUrl: JOIN_URL, prize: cfg.rafflePrize, llm: cfg.llmBaseUrl ? cfg.llmModel || "configured" : "keywords only",
        players: [...sim.players.values()].map((p) => ({
          id: p.id, name: p.name, level: levelOf(p.xp), xp: p.xp,
          tickets: p.tickets, done: p.done, status: sim.statusOf(p), lastSeen: p.lastSeen,
        })),
        raffles: sim.raffles.slice().reverse(),
      });
    }
    if (path === "/api/admin/winners.csv" && req.method === "GET") {
      const rows = [["raffle_id", "drawn_at", "prize", "name", "claim_code", "status", "given_at"]];
      for (const r of sim.raffles) for (const w of r.winners) {
        rows.push([r.id, new Date(r.at).toISOString(), r.prize, w.name, w.code, w.status,
          w.givenAt ? new Date(w.givenAt).toISOString() : ""]);
      }
      return new Response(rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n", {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="pod-town-winners.csv"' },
      });
    }
    if (req.method === "POST") {
      const b = await body(req);
      if (path === "/api/admin/draw") return json({ raffle: sim.draw(Date.now(), true) });
      if (path === "/api/admin/mark-given") {
        const w = sim.raffles.find((r) => r.id === b.raffleId)?.winners.find((x) => x.playerId === b.playerId);
        if (!w) return fail(404, "Winner not found.");
        w.status = b.given === false ? "unclaimed" : "given";
        w.givenAt = b.given === false ? null : Date.now();
        sim.dirty = true;
        return json({ ok: true });
      }
      if (path === "/api/admin/remove-player") {
        return sim.removePlayer(String(b.playerId || "")) ? json({ ok: true }) : fail(404, "Player not found.");
      }
    }
    return fail(404, "not found");
  }

  return fail(404, "not found");
}

Deno.serve({ port: PORT, hostname: "0.0.0.0", onListen: () => {} }, async (req) => {
  try {
    return await handle(req);
  } catch (e) {
    if (e instanceof SyntaxError || e.message === "too large") return fail(400, "Bad request.");
    console.error("[http]", e);
    return fail(500, "Server error.");
  }
});

console.log(`Pod Town is running.
  Big screen:  http://localhost:${PORT}/
  Players:     ${JOIN_URL}   (this is what the QR code points to)
  Admin:       http://localhost:${PORT}/admin
  Prompt AI:   ${cfg.llmBaseUrl ? `${cfg.llmModel} @ ${cfg.llmBaseUrl}` : "keyword matching (set LLM_BASE_URL to use a Runpod endpoint)"}
  Time scale:  ${cfg.timeScale}x`);
