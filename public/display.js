// Big-screen display: renders the town and everyone in it from server snapshots.
(function () {
  const { TS, spriteSheet, bakeWorld } = Art;
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);

  let init = null, bg = [null, null], scale = 2;
  let offset = 0; // server clock - local clock
  let nextRaffle = 0;
  const players = new Map();
  const DX = [0, -1, 1, 0], DY = [1, 0, 0, -1];
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  const STACKED = "(max-width: 1000px), (orientation: portrait)";
  function resize() {
    if (!init) return;
    // Narrow or portrait windows stack the sidebar under the map (see the
    // matching media query in display.html), so the map gets the full width.
    const stacked = window.matchMedia(STACKED).matches;
    // The town is the main attraction: give it every pixel the slim sidebar
    // doesn't need. CHROME is the page padding, the gap and the stage border.
    const CHROME = 8 * 2 + 4;
    const side = stacked ? 0 : Math.round(Math.max(230, Math.min(340, window.innerWidth * 0.16)));
    $("side").style.width = stacked ? "" : side + "px";
    const availW = window.innerWidth - CHROME - (stacked ? 0 : side + 8);
    const availH = stacked ? Infinity : window.innerHeight - CHROME;
    const fit = Math.max(0.25, Math.min(availW / (init.w * TS), availH / (init.h * TS)));
    const cssW = Math.floor(init.w * TS * fit), cssH = Math.floor(init.h * TS * fit);
    // Draw at the screen's real pixel density so a non-whole zoom still looks sharp.
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    scale = (cssW * dpr) / (init.w * TS);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
  }
  window.addEventListener("resize", resize);

  // ---------- network ----------
  // Plain HTTP polling (no WebSocket), so the screen works through any proxy.
  let fails = 0, lastRaffleId; // undefined until the first successful poll
  const banner = (text) => { $("conn").textContent = text || ""; $("conn").style.display = text ? "block" : "none"; };
  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }
  async function poll() {
    try {
      if (!init) {
        const m = await getJSON("/api/world");
        bg = [bakeWorld(m, 0), bakeWorld(m, 1)];
        init = m; // only once the map is ready to draw
        $("joinUrl").textContent = m.joinUrl.replace(/^https?:\/\//, "");
        $("prize").textContent = "Prize: " + m.prize;
        resize();
      }
      const s = await getJSON("/api/state");
      onState(s);
      const id = s.raffle ? s.raffle.id : null;
      // announce a draw once, and only if it just happened (not on page load)
      if (lastRaffleId !== undefined && id && id !== lastRaffleId && s.now - s.raffle.at < 60000) showRaffle(s.raffle);
      lastRaffleId = id;
      fails = 0;
      banner("");
    } catch (e) {
      if (++fails >= 3) banner(init ? "Reconnecting…" : "Connecting to Pod Town… (" + e.message + ")");
    }
    setTimeout(poll, init ? init.tickMs : 1000);
  }
  // Never fail silently on a public screen: show script errors in the banner.
  window.addEventListener("error", (e) => banner("Display error: " + e.message));

  function onState(m) {
    offset = m.now - Date.now();
    nextRaffle = m.nextRaffle;
    const seen = new Set();
    for (const s of m.players) {
      seen.add(s.id);
      let p = players.get(s.id);
      if (!p) { p = { rx: s.x, ry: s.y }; players.set(s.id, p); }
      Object.assign(p, s);
      if (Math.abs(p.rx - s.x) + Math.abs(p.ry - s.y) > 3) { p.rx = s.x; p.ry = s.y; }
    }
    for (const id of players.keys()) if (!seen.has(id)) players.delete(id);

    $("pop").textContent = m.players.length;
    const top = m.players.slice().sort((a, b) => b.xp - a.xp).slice(0, 6);
    $("board").innerHTML = top.map((p, i) => `<li><span>${i + 1}. ${esc(p.n)}</span><span>Lv ${p.lv} · 🎟 ${p.tk}</span></li>`).join("") ||
      '<li><span>Nobody yet. Be the first!</span><span></span></li>';
    $("feed").innerHTML = m.events.slice().reverse().map((e) => `<li>${esc(e.text)}</li>`).join("");
    $("lastWin").textContent = m.lastWinners.length ? "Last winner: " + m.lastWinners.join(", ") : "Every activity earns raffle tickets";
  }

  // ---------- raffle overlay ----------
  let raffleTimer = null;
  function showRaffle(r) {
    const ov = $("overlay"), name = $("ovName"), text = $("ovText");
    clearInterval(raffleTimer);
    ov.classList.add("on");
    if (!r.winners.length) {
      name.textContent = "No entries!";
      text.textContent = "Do any activity this hour to earn tickets.";
      setTimeout(() => ov.classList.remove("on"), 8000);
      return;
    }
    text.textContent = `Drawing from ${r.entrants} townsfolk…`;
    const pool = r.names.length ? r.names : r.winners;
    let i = 0;
    const started = Date.now();
    raffleTimer = setInterval(() => {
      name.textContent = pool[i++ % pool.length];
      if (Date.now() - started > 5000) {
        clearInterval(raffleTimer);
        name.textContent = r.winners.join(" & ");
        text.textContent = `wins ${r.prize}! Check your phone for your claim code.`;
        setTimeout(() => ov.classList.remove("on"), 25000);
      }
    }, 90);
  }

  // ---------- rendering ----------
  function label(text, x, y, size, fg, bgc) {
    ctx.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
    const w = ctx.measureText(text).width + size * 0.8;
    ctx.fillStyle = bgc;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - size * 0.75), Math.round(w), Math.round(size * 1.45));
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, Math.round(x), Math.round(y));
  }

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!init) return;
    const now = Date.now() + offset;
    const u = TS * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg[Math.floor(t / 600) % 2], 0, 0, canvas.width, canvas.height);

    const speed = (1000 / init.tickMs) * 1.1;
    const list = [];
    const inside = {};
    for (const p of players.values()) {
      const dx = p.x - p.rx, dy = p.y - p.ry;
      const dist = Math.abs(dx) + Math.abs(dy);
      p.moving = dist > 0.02;
      if (p.moving) {
        const step = speed * dt;
        p.rx += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
        p.ry += Math.abs(dy) <= step ? dy : Math.sign(dy) * step;
      }
      if (p.i) { const loc = init.acts[p.a]?.loc; inside[loc] = (inside[loc] || 0) + 1; continue; }
      list.push(p);
    }
    list.sort((a, b) => a.ry - b.ry);

    // things drawn under the characters: sprouts and fishing lines
    for (const p of list) {
      if (p.moving || !p.a) continue;
      const prog = Math.max(0, Math.min(1, (now - p.as) / (p.ae - p.as)));
      const fx = (p.rx + DX[p.d]) * u, fy = (p.ry + DY[p.d]) * u;
      if (p.a === "farm") {
        const hgt = Math.round(2 + prog * 9);
        ctx.fillStyle = "#3f8f4a";
        ctx.fillRect(fx + 7 * scale, fy + (12 - hgt) * scale, 2 * scale, hgt * scale);
        ctx.fillStyle = "#72c05c";
        ctx.fillRect(fx + 5 * scale, fy + (12 - hgt) * scale, 2 * scale, 2 * scale);
        ctx.fillRect(fx + 9 * scale, fy + (13 - hgt) * scale, 2 * scale, 2 * scale);
        if (prog > 0.6) { // a little GPU chip ripens on the stalk
          const cy = fy + (8 - hgt) * scale;
          ctx.fillStyle = "#ffca28"; ctx.fillRect(fx + 3 * scale, cy + scale, 10 * scale, scale); ctx.fillRect(fx + 3 * scale, cy + 3 * scale, 10 * scale, scale);
          ctx.fillStyle = "#2a2233"; ctx.fillRect(fx + 4 * scale, cy, 8 * scale, 5 * scale);
          ctx.fillStyle = "#874BFF"; ctx.fillRect(fx + 6 * scale, cy + scale, 4 * scale, 3 * scale);
        }
      } else if (p.a === "data") {
        const bobY = Math.sin(t / 400 + p.rx) * scale;
        const cx = (p.rx + 0.5) * u, cy = (p.ry + 0.5) * u;
        const bx = fx + 8 * scale + DX[p.d] * 6 * scale, by = fy + 8 * scale + DY[p.d] * 4 * scale + bobY;
        ctx.strokeStyle = "#2a2233"; ctx.lineWidth = Math.max(1, scale / 2);
        ctx.beginPath(); ctx.moveTo(cx, cy - 4 * scale); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = "#e53935"; ctx.fillRect(bx - scale, by - scale, 2 * scale, 2 * scale);
        ctx.fillStyle = "#fff"; ctx.fillRect(bx - scale, by - scale, 2 * scale, scale);
      }
    }

    // characters
    for (const p of list) {
      const f = p.moving ? [1, 0, 2, 0][Math.floor(t / 140) % 4] : 0;
      ctx.drawImage(spriteSheet(p.l), f * TS, p.d * TS, TS, TS, Math.round(p.rx * u), Math.round((p.ry - 0.25) * u), u, u);
    }

    // building / area signs
    const fs = Math.max(7, Math.round(5.5 * scale));
    for (const l of init.labels) {
      const n = inside[l.id];
      label(l.name.toUpperCase() + (n ? `  ×${n}` : ""), l.x * u, (l.y + 0.55) * u, fs, "#fff", l.id === "lab" ? "#5D29F0" : "rgba(0,0,16,0.82)");
    }

    // name tags, activity icons, speech
    const ns = Math.max(7, Math.round(4.6 * scale));
    for (const p of list) {
      const cx = (p.rx + 0.5) * u, top = (p.ry - 0.25) * u;
      label(p.n, cx, top + u + ns * 0.6, ns, "#fff", "rgba(0,0,16,0.6)");
      if (p.a && !p.moving) {
        const prog = Math.max(0, Math.min(1, (now - p.as) / (p.ae - p.as)));
        ctx.font = `${Math.round(7 * scale)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(init.acts[p.a].icon, cx, top - scale + Math.sin(t / 300 + p.rx) * scale);
        ctx.fillStyle = "#2a2233"; ctx.fillRect(cx - 6 * scale, top - scale, 12 * scale, 2 * scale);
        ctx.fillStyle = "#FCB1FF"; ctx.fillRect(cx - 6 * scale + 1, top - scale + 1, Math.max(0, (12 * scale - 2) * prog), 2 * scale - 2);
      }
    }
    for (const p of list) {
      if (!p.s) continue;
      const cx = (p.rx + 0.5) * u, top = (p.ry - 0.25) * u - (p.a ? 10 * scale : 3 * scale);
      const size = Math.max(10, Math.round(5 * scale));
      ctx.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      const w = ctx.measureText(p.s).width + size;
      const x = Math.max(2, Math.min(canvas.width - w - 2, cx - w / 2)), y = Math.max(2, top - size * 1.7);
      ctx.fillStyle = "#2a2233"; ctx.fillRect(x - 2, y - 2, w + 4, size * 1.6 + 4);
      ctx.fillStyle = "#fff"; ctx.fillRect(x, y, w, size * 1.6);
      ctx.fillStyle = "#2a2233"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(p.s, x + size / 2, y + size * 0.85);
    }

    // countdown
    const left = Math.max(0, nextRaffle - now);
    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    $("count").textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  poll();
  requestAnimationFrame(frame);
})();
