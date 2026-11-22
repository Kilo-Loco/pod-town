// Authoritative town simulation: players, activities, rewards, hourly raffle.
import * as world from "./world.js";
import { Town } from "./town.js";

export const ACTS = {
  train: { name: "Train a model at the Training Gym", short: "Train a model", loc: "gym", verb: "Training a model", icon: "🏋️", mins: 6, xp: 35, tickets: 2 },
  deploy: { name: "Deploy an endpoint at Runpod HQ", short: "Deploy", loc: "lab", verb: "Deploying an endpoint", icon: "🚀", mins: 15, xp: 100, tickets: 3 },
  sandbox: { name: "Play in the Sandbox", short: "Sandbox", loc: "sandbox", verb: "Experimenting", icon: "🏖️", mins: 3, xp: 15, tickets: 1 },
  benchmark: { name: "Run benchmarks at the Benchmark Arcade", short: "Benchmark", loc: "arcade", verb: "Running benchmarks", icon: "🕹️", mins: 3, xp: 15, tickets: 1 },
  data: { name: "Fish for datasets in the Data Lake", short: "Fish for data", loc: "pond", verb: "Fishing for data", icon: "🎣", mins: 3, xp: 15, tickets: 1 },
  farm: { name: "Grow GPUs at the GPU Farm", short: "Grow GPUs", loc: "garden", verb: "Growing GPUs", icon: "🌱", mins: 8, xp: 40, tickets: 2 },
  read: { name: "Read papers at the Library", short: "Read papers", loc: "library", verb: "Reading papers", icon: "📖", mins: 4, xp: 20, tickets: 1 },
  warmup: { name: "Warm up at the Cache Cafe", short: "Warm up", loc: "cafe", verb: "Warming up", icon: "☕", mins: 2, xp: 5, tickets: 1 },
  shop: { name: "Grab swag at the Swag Shop", short: "Get swag", loc: "market", verb: "Browsing swag", icon: "🛍️", mins: 2, xp: 5, tickets: 1 },
  chat: { name: "Network at the Plaza", short: "Network", loc: "plaza", verb: "Networking", icon: "📡", mins: 2, xp: 10, tickets: 1 },
};

// Must match the lists in public/art.js
export const LOOK_LIMITS = { skin: 4, hair: 6, hairColor: 6, shirt: 8, pants: 4 };
export const ACCS = ["none", "glasses", "cap", "bow", "headphones", "crown", "wizard", "halo"];
export const FREE_ACCS = ["none", "glasses", "cap", "bow"];
const SHOP_PRICE = 25;
// "Find me": how long a player is highlighted on the big screen, and how often
// they may ask. The cooldown keeps a crowd from turning the screen into arrows.
export const PING_MS = 6000;
export const PING_COOLDOWN_MS = 15000;

const DATASETS = [
  ["a tidy CSV", 38, 3], ["a labeled image set", 25, 5], ["a multilingual corpus", 15, 8],
  ["a clean benchmark split", 10, 12], ["a corrupted parquet file", 6, 1],
  ["a golden eval set", 5, 25], ["the Legendary Perfectly Labeled Dataset", 1, 100],
];
const BOOKS = [
  "Attention Is All You Need: The Picture Book", "Cold Starts and Warm Hearts",
  "The Very Hungry GPU", "Zen and the Art of Container Maintenance",
  "A Brief History of VRAM", "Gradient Descent for Hikers", "The Serverless Almanac",
  "Goodnight, Kernel", "Tokens: A Love Story", "The Little Model That Could",
  "Latency: A Mystery", "Quantize Your Life",
];
const MODELS = [
  "a tiny LLM that only speaks in haiku", "a cat-vs-croissant classifier",
  "a LoRA of the town fountain", "a model that predicts the next raffle (badly)",
  "a diffusion model for pixel hats", "a speech model fluent in whale",
  "a recommender for cafe orders", "an agent that waters the GPU farm",
  "a 2-billion-parameter turnip detector", "a voice clone of the Gym instructor",
];
const DEPLOYS = [
  "a serverless endpoint that scales to zero", "a pod running a haiku-only chatbot",
  "an image generator for pixel hats", "a 4-GPU cluster for turnip detection",
  "an endpoint with zero cold starts", "a voice agent that answers the town phone",
  "an inference API for the Cache Cafe menu",
];
const GPUS = [["a baby T4", 8], ["a ripe RTX 4090", 10], ["a bunch of A100s", 14], ["a fresh H100", 16], ["a Giant B200", 22]];
const DRINKS = ["a KV-cache latte", "a warm-start espresso", "a hot cup of cached tokens", "a low-latency cold brew", "a batch-size-8 matcha"];
const SANDBOX = [
  "built a sandcastle-shaped neural net", "ran some very untrusted code, safely",
  "taught an agent to dig holes", "prototyped a chatbot that only says \"sand\"",
  "broke everything and nobody noticed", "stress-tested a sandcastle (it held)",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weighted(table) {
  let total = 0;
  for (const row of table) total += row[1];
  let r = Math.random() * total;
  for (const row of table) { if ((r -= row[1]) < 0) return row; }
  return table[table.length - 1];
}
const rid = (n = 16) => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (v) => v.toString(16).padStart(2, "0")).join("");
};

/** "Built by Ana, Bo, Cy + 9 others" for an upgrade's credit line. */
export const builtBy = (up) => !up.by?.length ? "" :
  "Built by " + up.by.join(", ") + (up.more ? ` + ${up.more} other${up.more > 1 ? "s" : ""}` : "");
const placeName = (loc) => (loc === "lab" ? "" : "the ") + world.locs[loc].name;
const newItems = () => ({ data: {}, books: [], models: 0, deploys: 0, gpus: 0, bench: 0, sand: 0, peers: 0 });
/** Short code a winner shows at the booth. No look-alike characters (0/O, 1/I/L). */
function claimCode() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (v) => abc[v % abc.length]).join("");
}
export const levelOf = (xp) => Math.floor(Math.sqrt(xp / 40)) + 1;

export function cleanLook(look, unlocked = FREE_ACCS) {
  const out = {};
  for (const [k, max] of Object.entries(LOOK_LIMITS)) {
    const v = Number(look?.[k]);
    out[k] = Number.isInteger(v) && v >= 0 && v < max ? v : 0;
  }
  out.acc = unlocked.includes(look?.acc) ? look.acc : "none";
  return out;
}

export class Sim {
  constructor(cfg, saved) {
    this.cfg = cfg;
    this.players = new Map();
    this.byToken = new Map();
    this.byName = new Map(); // lower-cased name -> player; names are unique
    this.pings = new Map(); // player id -> { until, next }; never saved
    this.raffles = saved?.raffles || [];
    for (const r of this.raffles) for (const w of r.winners) {
      // saves from the email-based version: drop the address, issue a booth code
      delete w.email; delete w.claimedAt; delete w.sentAt;
      if (!w.code) w.code = claimCode();
      if (w.status !== "given") w.status = w.status === "sent" ? "given" : "unclaimed";
      if (w.givenAt === undefined) w.givenAt = null;
    }
    this.events = saved?.events || [];
    this.arcadeHigh = saved?.arcadeHigh || { score: 0, name: "" };
    this.town = new Town(cfg.town || { mode: "auto", statues: true }, saved?.town);
    this.raffleMs = (cfg.raffleMinutes || 60) * 60000;
    this.lastRaffleHour = Math.floor(Date.now() / this.raffleMs); // never draw on boot
    this.dirty = false;
    this.onRaffle = null;
    for (const p of saved?.players || []) {
      // tolerate saves from older versions: unknown activities are dropped
      delete p.email; // no longer collected
      p.log = (p.log || []).filter((e) => !e.text.includes("@")); // old diary lines quoted the address
      p.items = { ...newItems(), ...p.items };
      p.queue = (p.queue || []).filter((id) => Object.hasOwn(ACTS, id));
      if (p.act && !Object.hasOwn(ACTS, p.act.id)) { p.act = null; p.inside = false; }
      if (p.goal && !Object.hasOwn(ACTS, p.goal.act)) { p.goal = null; p.path = []; }
      this.index(p);
    }
    if (saved) this.dirty = true; // write the cleaned-up save back to disk straight away
  }

  index(p) {
    this.players.set(p.id, p);
    this.byToken.set(p.token, p);
    this.byName.set(p.name.toLowerCase(), p);
  }

  serialize() {
    return {
      players: [...this.players.values()],
      raffles: this.raffles,
      events: this.events.slice(-30),
      arcadeHigh: this.arcadeHigh,
      town: this.town.serialize(),
    };
  }

  addPlayer({ name, look }) {
    const p = {
      id: rid(5), token: rid(24), name,
      look: cleanLook(look),
      x: world.SPAWN.x + Math.floor(Math.random() * 6), y: world.SPAWN.y,
      dir: 0, path: [], queue: [], goal: null, act: null, inside: false,
      xp: 0, coins: 0, tickets: 0, done: 0, buff: false,
      unlocked: [...FREE_ACCS],
      items: newItems(),
      log: [], say: null, nextWander: 0,
      createdAt: Date.now(), lastSeen: Date.now(),
    };
    this.index(p);
    this.event(`${p.name} moved into town!`);
    this.dirty = true;
    return p;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return false;
    this.players.delete(id);
    this.byToken.delete(p.token);
    this.byName.delete(p.name.toLowerCase());
    this.pings.delete(id);
    this.dirty = true;
    return true;
  }

  /** "Find me": highlight a player on the big screen for a few seconds. */
  ping(p, now) {
    const cur = this.pings.get(p.id);
    if (cur && now < cur.next) return { ok: false, retryMs: cur.next - now };
    this.pings.set(p.id, { until: now + PING_MS, next: now + PING_COOLDOWN_MS });
    return { ok: true };
  }

  pingReadyAt(p) {
    return this.pings.get(p.id)?.next || 0;
  }

  event(text) {
    this.events.push({ t: Date.now(), text });
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
  }

  logFor(p, text) {
    p.log.push({ t: Date.now(), text });
    if (p.log.length > 15) p.log.splice(0, p.log.length - 15);
  }

  /** Apply a parsed command. steps: activity ids, or ["stop"]. */
  command(p, steps, say) {
    if (steps.includes("stop")) {
      p.queue = []; p.goal = null; p.path = [];
      if (p.act) { p.act = null; p.inside = false; }
    } else if (steps.length) {
      p.queue = steps.slice(0, 3);
      // a walk already under way is redirected; a running activity finishes first
      if (!p.act) { p.goal = null; p.path = []; }
    }
    if (say) p.say = { text: say, until: Date.now() + 7000 };
    this.dirty = true;
  }

  pickSpot(locId) {
    const spots = world.locs[locId].spots;
    if (spots.length === 1) return spots[0];
    const used = new Map();
    for (const o of this.players.values()) {
      const s = o.goal?.spot || (o.act && { x: o.x, y: o.y });
      if (s) used.set(s.x + "," + s.y, (used.get(s.x + "," + s.y) || 0) + 1);
    }
    let best = Infinity, cands = [];
    for (const s of spots) {
      const n = used.get(s.x + "," + s.y) || 0;
      if (n < best) { best = n; cands = [s]; } else if (n === best) cands.push(s);
    }
    return pick(cands);
  }

  tick(now) {
    for (const p of this.players.values()) this.stepPlayer(p, now);
    const hour = Math.floor(now / this.raffleMs);
    if (hour !== this.lastRaffleHour) {
      this.lastRaffleHour = hour;
      this.draw(now);
    }
  }

  stepPlayer(p, now) {
    if (p.act) {
      if (now >= p.act.end) this.complete(p);
      return;
    }
    if (p.path.length) {
      const [nx, ny] = p.path.shift();
      p.dir = world.dirOf(nx - p.x, ny - p.y);
      p.x = nx; p.y = ny;
      if (!p.path.length && p.goal) this.arrive(p, now);
      return;
    }
    if (p.goal) { this.arrive(p, now); return; }
    if (p.queue.length) {
      const id = p.queue.shift();
      const spot = this.pickSpot(ACTS[id].loc);
      const path = world.findPath(p.x, p.y, spot.x, spot.y);
      if (!path) return;
      p.goal = { act: id, spot };
      p.path = path;
      this.dirty = true;
      return;
    }
    if (now >= p.nextWander) {
      p.nextWander = now + 5000 + Math.random() * 15000;
      const tx = p.x + Math.floor(Math.random() * 9) - 4;
      const ty = p.y + Math.floor(Math.random() * 9) - 4;
      // never idle on a doorstep: a character there is drawn over the building's front
      const path = world.walkable(tx, ty) && world.grid[ty][tx] !== world.T.DOOR && world.findPath(p.x, p.y, tx, ty);
      if (path && path.length <= 8) p.path = path;
    }
  }

  arrive(p, now) {
    const { act: id, spot } = p.goal;
    const a = ACTS[id];
    p.goal = null;
    p.dir = spot.dir;
    let ms = (a.mins * 60000) / this.cfg.timeScale;
    if (p.buff) { ms *= 0.75; p.buff = false; }
    p.act = { id, start: now, end: now + ms };
    p.inside = world.locs[a.loc].indoor;
    this.dirty = true;
  }

  complete(p) {
    const id = p.act.id;
    const a = ACTS[id];
    p.act = null;
    p.inside = false;
    p.dir = 0;
    const before = levelOf(p.xp);
    p.xp += a.xp;
    p.tickets += a.tickets;
    p.done++;
    this.town.credit(a.loc, a.tickets, { id: p.id, name: p.name });
    const text = this.reward(p, id);
    this.event(`${p.name} ${text}`);
    this.logFor(p, `You ${text} (+${a.xp} XP, +${a.tickets} raffle ticket${a.tickets > 1 ? "s" : ""})`);
    const after = levelOf(p.xp);
    if (after > before) {
      this.event(`${p.name} reached level ${after}!`);
      this.logFor(p, `Level up! You are now level ${after}.`);
    }
    p.nextWander = Date.now() + 3000;
    // leaving a building: step off the doorstep onto the path below it
    if (world.grid[p.y][p.x] === world.T.DOOR && world.walkable(p.x, p.y + 1)) p.path = [[p.x, p.y + 1]];
    this.dirty = true;
  }

  reward(p, id) {
    const it = p.items;
    switch (id) {
      case "data": {
        const [name, , coins] = weighted(DATASETS);
        it.data[name] = (it.data[name] || 0) + 1;
        p.coins += coins;
        return `fished up ${name} (+${coins} coins)`;
      }
      case "read": {
        const unread = BOOKS.filter((b) => !it.books.includes(b));
        const book = pick(unread.length ? unread : BOOKS);
        if (!it.books.includes(book)) it.books.push(book);
        return `finished reading "${book}"`;
      }
      case "train": {
        it.models++;
        p.coins += 10;
        return `trained ${pick(MODELS)} (+10 coins)`;
      }
      case "deploy": {
        it.deploys++;
        p.coins += 30;
        return `deployed ${pick(DEPLOYS)} (+30 coins)`;
      }
      case "farm": {
        const [gpu, coins] = pick(GPUS);
        it.gpus++;
        p.coins += coins;
        return `harvested ${gpu} (+${coins} coins)`;
      }
      case "warmup":
        p.buff = true;
        return `drank ${pick(DRINKS)} and is warmed up (no cold start: next activity 25% faster)`;
      case "benchmark": {
        const score = Math.floor(1000 + Math.pow(Math.random(), 2) * 98000);
        p.coins += 5;
        if (score > it.bench) it.bench = score;
        if (score > this.arcadeHigh.score) {
          this.arcadeHigh = { score, name: p.name };
          return `set a new TOWN BENCHMARK RECORD of ${score.toLocaleString("en-US")}!`;
        }
        return `scored ${score.toLocaleString("en-US")} on the benchmark (+5 coins)`;
      }
      case "sandbox":
        it.sand++;
        return pick(SANDBOX);
      case "shop": {
        const locked = ACCS.filter((x) => !p.unlocked.includes(x));
        if (locked.length && p.coins >= SHOP_PRICE) {
          const got = pick(locked);
          p.coins -= SHOP_PRICE;
          p.unlocked.push(got);
          return `picked up new swag: ${got} (-${SHOP_PRICE} coins)`;
        }
        return locked.length
          ? `browsed the swag (it costs ${SHOP_PRICE} coins)`
          : "browsed the Swag Shop (owns all the swag!)";
      }
      case "chat": {
        const others = [...this.players.values()].filter((o) => o !== p && o.act?.id === "chat");
        it.peers++;
        return others.length ? `networked with ${pick(others).name} (low latency!)` : "pinged the fountain (no reply)";
      }
    }
    return "did something";
  }

  // ---- raffle ----

  hasWon(p) {
    return this.raffles.some((r) => r.winners.some((w) => w.playerId === p.id));
  }

  draw(now, manual = false) {
    const pool = [...this.players.values()].filter(
      (p) => p.tickets > 0 && !(this.cfg.raffleOneWin && this.hasWon(p)),
    );
    const totalTickets = pool.reduce((s, p) => s + p.tickets, 0);
    const names = pool.map((p) => p.name).sort(() => Math.random() - 0.5).slice(0, 24);
    const winners = [];
    const bag = pool.slice();
    for (let i = 0; i < this.cfg.raffleWinners && bag.length; i++) {
      let r = Math.random() * bag.reduce((s, p) => s + p.tickets, 0);
      let idx = 0;
      for (; idx < bag.length - 1; idx++) { if ((r -= bag[idx].tickets) < 0) break; }
      const p = bag.splice(idx, 1)[0];
      winners.push({
        playerId: p.id, name: p.name, tickets: p.tickets,
        code: claimCode(), status: "unclaimed", givenAt: null,
      });
      this.logFor(p, `You won the raffle: ${this.cfg.rafflePrize}! Show your claim code at the Runpod booth.`);
    }
    for (const p of this.players.values()) p.tickets = 0;
    const raffle = {
      id: rid(4), at: now, manual, prize: this.cfg.rafflePrize,
      entrants: pool.length, totalTickets, winners,
      claimBy: now + this.cfg.claimHours * 3600000,
    };
    this.raffles.push(raffle);
    this.event(
      winners.length
        ? `RAFFLE: ${winners.map((w) => w.name).join(", ")} won ${raffle.prize}!`
        : "RAFFLE: nobody entered this hour. Do an activity to earn tickets!",
    );
    const first = winners.length && this.players.get(winners[0].playerId);
    const built = this.town.onRaffle(now, first ? { name: first.name, look: first.look } : null);
    let upgrade = null;
    if (built) {
      const { ids, ...shown } = built;
      upgrade = shown;
      const place = world.locs[built.loc].name;
      this.event(`TOWN UPGRADE: ${built.name} for ${place}! ${builtBy(built)}`);
      for (const id of ids) {
        const p = this.players.get(id);
        if (p) this.logFor(p, `🏗️ You helped build ${world.locs[built.loc].name}'s new ${built.name}! Take a look on the big screen.`);
      }
    }
    this.dirty = true;
    if (this.onRaffle) this.onRaffle({ id: raffle.id, prize: raffle.prize, names, winners: winners.map((w) => w.name), entrants: pool.length, upgrade });
    return raffle;
  }

  winsFor(p) {
    const out = [];
    for (const r of this.raffles) {
      for (const w of r.winners) {
        if (w.playerId !== p.id) continue;
        const expired = w.status === "unclaimed" && Date.now() > r.claimBy;
        out.push({ raffleId: r.id, prize: r.prize, at: r.at, claimBy: r.claimBy, code: w.code, status: expired ? "expired" : w.status });
      }
    }
    return out;
  }

  // ---- views ----

  statusOf(p) {
    if (p.act) return `${ACTS[p.act.id].verb} at ${placeName(ACTS[p.act.id].loc)}`;
    if (p.goal) return `Walking to ${placeName(ACTS[p.goal.act].loc)}`;
    if (p.queue.length) return "Getting ready...";
    return "Wandering around town";
  }

  nextRaffle(now) {
    return (Math.floor(now / this.raffleMs) + 1) * this.raffleMs;
  }

  snapshot(now) {
    const players = [];
    for (const p of this.players.values()) {
      const row = {
        id: p.id, n: p.name, x: p.x, y: p.y, d: p.dir, l: p.look,
        a: p.act ? p.act.id : null, as: p.act?.start, ae: p.act?.end,
        i: p.inside ? 1 : 0, lv: levelOf(p.xp), xp: p.xp, tk: p.tickets,
        s: p.say && p.say.until > now ? p.say.text : null,
      };
      const pg = this.pings.get(p.id);
      if (pg) {
        if (pg.until > now) row.pg = 1; // only sent while active: the feed goes out every tick
        else if (pg.next <= now) this.pings.delete(p.id);
      }
      players.push(row);
    }
    const last = [...this.raffles].reverse().find((r) => r.winners.length);
    return {
      type: "state", now, players,
      events: this.events.slice(-9),
      nextRaffle: this.nextRaffle(now),
      lastWinners: last ? last.winners.map((w) => w.name) : [],
      town: this.town.feed(),
    };
  }
}
