// Big-screen display: renders the town and everyone in it from server snapshots.
(function () {
  const { TS, spriteSheet, bakeWorld, roofRect, seatsFor, bakeInterior, drawUpgrades, drawRoofUpgrades, drawLandmarkFx, drawSeasonDecor, drawSeasonRoofs, drawSeasonFx, inkBox, statueSprite, STATUE_SPOTS } = Art;
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);

  let init = null, bg = [null, null], scale = 2;
  let offset = 0; // server clock - local clock
  let nextRaffle = 0;
  const players = new Map();
  const DX = [0, -1, 1, 0], DY = [1, 0, 0, -1];

  // Indoor buildings show a cutaway of the room while anyone is inside.
  // rooms: loc id -> { rect, seats, who (seat index -> player id or null),
  //                    over (ids with no seat left), count, alpha, img }
  // seatOf: player id -> { loc, i } for everyone holding a seat.
  const rooms = {};
  const seatOf = new Map();
  const SPOT_MS = 2200; // how long the roll call stays on each person

  // Town upgrades and winner statues (see game/town.js). Features that are
  // switched off on the admin page are simply missing from the feed.
  let town = {}, decor = null, roofs = null, decorKey = "";
  let weather = null; // { c, icon, text, boost } or null when weather is off
  let season = null, seasonDecor = null, seasonRoofs = null; // season: { id, name, icon, act } or null
  // A brand-new upgrade stays hidden under the raffle screen, then drops into
  // place with a puff of dust once the screen closes, and a gold arrow points
  // at it for a few seconds. reveal: { up, piece, box, start } (start is 0
  // while the raffle screen is still up).
  let reveal = null;
  const DROP_MS = 1000, ARROW_MS = 9000;
  /** "built by Ana + 9 others" (top builder only, to keep the screen short). */
  const builtBy = (up) => !up.by?.length ? "" :
    "built by " + up.by[0] + (up.by.length + up.more > 1 ? ` + ${up.by.length + up.more - 1} other${up.by.length + up.more > 2 ? "s" : ""}` : "");

  /** Rebake the upgrade layer, leaving out a piece that is waiting to drop in. */
  function refreshDecor() {
    const hide = reveal && Date.now() - (reveal.start || Infinity) < DROP_MS ? reveal.up : null;
    const key = JSON.stringify([town.lv || null, hide && [hide.loc, hide.level]]);
    if (key === decorKey) return;
    decorKey = key;
    const keep = (id, lv) => !hide || id !== hide.loc || lv !== hide.level;
    decor = town.lv ? drawUpgrades(init, town.lv, keep) : null;
    roofs = town.lv ? drawRoofUpgrades(init, town.lv, keep) : null;
    // a level 3 building is done up inside too
    for (const [id, room] of Object.entries(rooms)) {
      const fancy = !!town.lv && town.lv[id] >= 3 && keep(id, 3);
      if (room.fancy !== fancy) { room.fancy = fancy; room.img = bakeInterior(init.buildings.find((b) => b.id === id), fancy); }
    }
  }
  function startReveal(up) {
    if (!town.lv) return;
    const piece = drawUpgrades(init, { [up.loc]: up.level }, (id, lv) => id === up.loc && lv === up.level);
    reveal = { up, piece, box: inkBox(piece), start: 0 };
    refreshDecor();
  }

  function setupRooms(m) {
    for (const b of m.buildings) {
      if (!m.labels.find((l) => l.id === b.id)?.indoor) continue;
      const seats = seatsFor(b);
      rooms[b.id] = { rect: roofRect(b), seats, who: seats.map(() => null), over: [], count: 0, alpha: 0, img: bakeInterior(b) };
    }
  }

  /**
   * Keep seats stable: a person keeps their seat for as long as they stay
   * inside, and only free seats are handed out, so a busy room never
   * reshuffles. When a room is full, later arrivals wait in `over` in arrival
   * order and the earliest of them gets the next seat that frees up.
   */
  function seatPeople() {
    const wanting = {};
    for (const p of players.values()) {
      const loc = p.i ? init.acts[p.a]?.loc : null;
      const held = seatOf.get(p.id);
      if (held && held.loc !== loc) { rooms[held.loc].who[held.i] = null; seatOf.delete(p.id); }
      if (rooms[loc]) (wanting[loc] ||= []).push(p);
    }
    for (const [id, held] of seatOf) {
      if (!players.has(id)) { rooms[held.loc].who[held.i] = null; seatOf.delete(id); }
    }
    for (const [loc, room] of Object.entries(rooms)) {
      const list = (wanting[loc] || []).sort((a, b) => a.as - b.as || (a.id < b.id ? -1 : 1));
      room.over = [];
      room.count = list.length;
      for (const p of list) {
        if (seatOf.has(p.id)) continue;
        const free = room.who.indexOf(null);
        if (free >= 0) { room.who[free] = p.id; seatOf.set(p.id, { loc, i: free }); }
        else room.over.push(p.id);
      }
    }
  }

  /**
   * Whose turn it is in a room's roll call: seated people by seat, then the
   * overflow. Anyone who just pressed "Find me" jumps the queue; if several in
   * one room did, the spotlight alternates between them every second.
   */
  function spotlight(room, t) {
    const all = room.who.filter(Boolean).concat(room.over);
    if (!all.length) return null;
    const called = all.filter((id) => players.get(id)?.pg);
    if (called.length) return called[Math.floor(t / 1000) % called.length];
    return all[Math.floor(t / SPOT_MS) % all.length];
  }

  /** "Find me" marker: a ripple around the character and a bouncing arrow above. */
  function findMark(cx, cy, top, t) {
    const ph = (t % 1000) / 1000;
    ctx.strokeStyle = `rgba(252,177,255,${1 - ph})`;
    ctx.lineWidth = Math.max(2, 1.5 * scale);
    ctx.beginPath();
    ctx.arc(cx, cy, (6 + ph * 14) * scale, 0, Math.PI * 2);
    ctx.stroke();
    const tip = top - (10 + Math.abs(Math.sin(t / 180)) * 3) * scale;
    const w = 5 * scale, h = 5 * scale, o = Math.max(1, scale * 0.75);
    const tri = (pad, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx, tip + pad);
      ctx.lineTo(cx - w - pad, tip - h - pad);
      ctx.lineTo(cx + w + pad, tip - h - pad);
      ctx.closePath();
      ctx.fill();
    };
    tri(o, "#000010");
    tri(0, "#FCB1FF");
  }
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
        setupRooms(m);
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
      // the server leaves `pg` out once "Find me" ends, and Object.assign never
      // clears a missing key, so reset it here or the arrow would stay forever
      p.pg = s.pg || 0;
      if (Math.abs(p.rx - s.x) + Math.abs(p.ry - s.y) > 3) { p.rx = s.x; p.ry = s.y; }
    }
    for (const id of players.keys()) if (!seen.has(id)) players.delete(id);
    seatPeople();

    town = m.town || {};
    weather = m.weather || null;
    const nextSeason = m.season || null;
    if ((nextSeason?.id || null) !== (season?.id || null)) {
      seasonDecor = nextSeason ? drawSeasonDecor(init, nextSeason.id) : null;
      seasonRoofs = nextSeason ? drawSeasonRoofs(init, nextSeason.id) : null;
    }
    season = nextSeason;
    $("seasonLine").textContent = season ? `Limited time: ${season.actName}` : "";
    const BOOST_NAMES = { sandbox: "Sandbox", read: "Reading", data: "Fishing", warmup: "Cafe", benchmark: "Benchmarks", farm: "GPU Farm" };
    $("wx").textContent = weather ? `${weather.icon} ${weather.c[0].toUpperCase() + weather.c.slice(1)}` + (weather.where ? ` in ${weather.where}` : "") +
      (weather.boost ? ` · ${BOOST_NAMES[weather.boost] || weather.boost} tickets ×2` : "") : "";
    refreshDecor();
    const placeName = (id) => init.labels.find((l) => l.id === id)?.name || id;
    $("projcard").style.display = town.sc ? "" : "none";
    if (town.sc) {
      $("proj").innerHTML = town.sc.map(([id, n], i) => `<li><span>${i + 1}. ${esc(placeName(id))}</span><span>🎟 ${n}</span></li>`).join("") ||
        '<li><span>No votes yet: do an activity!</span><span></span></li>';
    }

    $("pop").textContent = m.players.length;
    const top = m.players.slice().sort((a, b) => b.xp - a.xp).slice(0, 6);
    $("board").innerHTML = top.map((p, i) => `<li><span>${i + 1}. ${esc(p.n)}</span><span>Lv ${p.lv} · 🎟 ${p.tk}</span></li>`).join("") ||
      '<li><span>Nobody yet. Be the first!</span><span></span></li>';
    $("feed").innerHTML = m.events.slice().reverse().map((e) => `<li>${esc(e.text)}</li>`).join("");
    $("lastWin").textContent = m.lastWinners.length ? "Last winner: " + m.lastWinners.join(", ") : "Every activity earns raffle tickets";
  }

  // ---------- raffle overlay ----------
  let raffleTimer = null;
  // How long the winner stays up: 25 s for hourly raffles, less when raffles
  // come every few minutes (rehearsals, demos) so the town stays watchable.
  const holdMs = () => Math.max(6000, Math.min(25000, (init.raffleMs || 3600000) * 0.12));
  function showRaffle(r) {
    const ov = $("overlay"), name = $("ovName"), text = $("ovText"), up = $("ovUp");
    clearInterval(raffleTimer);
    ov.classList.add("on");
    up.textContent = "";
    const upText = !r.upgrade ? "" : `New in town: ${r.upgrade.name} at ${init.labels.find((l) => l.id === r.upgrade.loc)?.name}, ${builtBy(r.upgrade) || "built by the town"}!`;
    if (r.upgrade) startReveal(r.upgrade);
    const close = () => { ov.classList.remove("on"); if (reveal && !reveal.start) reveal.start = Date.now(); };
    if (!r.winners.length) {
      name.textContent = "No entries!";
      text.textContent = "Do any activity this hour to earn tickets.";
      up.textContent = upText;
      setTimeout(close, Math.min(8000, holdMs()));
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
        up.textContent = upText;
        setTimeout(close, holdMs());
      }
    }, 90);
  }

  // ---------- rendering ----------
  /**
   * The weather: a light overlay over the town, drawn above the characters
   * and below the name tags and signs so those stay readable. Every particle's
   * position is worked out from the time, so there is no state to keep.
   */
  function drawWeather(t) {
    if (!weather) return;
    const W = canvas.width, H = canvas.height, s = scale;
    const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
    const tint = (col) => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
    switch (weather.c) {
      case "overcast":
        tint("rgba(50,55,80,0.16)");
        break;
      case "rain": {
        tint("rgba(40,60,110,0.16)");
        ctx.strokeStyle = "rgba(200,222,255,0.7)";
        ctx.lineWidth = Math.max(1, s * 0.7);
        ctx.beginPath();
        for (let i = 0; i < 320; i++) {
          const speed = 0.55 + rnd(i, 1) * 0.35; // screen heights per second
          const y = ((t / 1000) * speed * H + rnd(i, 2) * H) % (H + 20 * s) - 10 * s;
          const x = (rnd(i, 3) * (W + 40 * s) + y * 0.25) % (W + 40 * s) - 20 * s;
          ctx.moveTo(x, y); ctx.lineTo(x - 3 * s, y + 12 * s);
        }
        ctx.stroke();
        break;
      }
      case "snow":
        tint("rgba(220,230,255,0.08)");
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (let i = 0; i < 260; i++) {
          const speed = 0.06 + rnd(i, 1) * 0.06;
          const y = ((t / 1000) * speed * H + rnd(i, 2) * H) % H;
          const x = rnd(i, 3) * W + Math.sin(t / 1100 + i) * 8 * s;
          const r = (1 + rnd(i, 4) * 1.1) * s;
          ctx.fillRect(Math.round(x - r), Math.round(y - r), Math.ceil(r * 2), Math.ceil(r * 2));
        }
        break;
      case "fog": {
        tint("rgba(225,228,238,0.16)");
        for (let i = 0; i < 6; i++) {
          const y = (0.1 + i * 0.16) * H;
          const x = (((t / 1000) * (8 + i * 3) * s + rnd(i, 1) * W) % (W * 1.6)) - W * 0.3;
          const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.28);
          g.addColorStop(0, "rgba(240,242,248,0.38)"); g.addColorStop(1, "rgba(240,242,248,0)");
          ctx.fillStyle = g; ctx.fillRect(x - W * 0.3, y - W * 0.3, W * 0.6, W * 0.6);
        }
        break;
      }
      case "blossoms":
        for (let i = 0; i < 110; i++) {
          const speed = 0.05 + rnd(i, 1) * 0.05;
          const k = ((t / 1000) * speed + rnd(i, 2)) % 1;
          const x = (rnd(i, 3) * W + k * W * 0.4 + Math.sin(t / 900 + i) * 6 * s) % W;
          const y = k * H;
          ctx.fillStyle = i % 3 ? "rgba(255,183,213,0.9)" : "rgba(255,255,255,0.85)";
          const w = (Math.abs(Math.sin(t / 300 + i)) * 2.2 + 0.8) * s; // a tumbling petal
          ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(2 * s));
        }
        break;
    }
  }

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
    if (roofs) ctx.drawImage(roofs, 0, 0, canvas.width, canvas.height); // under the cutaways
    if (seasonRoofs) ctx.drawImage(seasonRoofs, 0, 0, canvas.width, canvas.height);

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

    // building cutaways: fade the roof away while anyone is inside
    for (const room of Object.values(rooms)) {
      room.alpha += ((room.count ? 1 : 0) - room.alpha) * Math.min(1, dt * 5);
      if (room.alpha < 0.01) continue;
      const r = room.rect;
      ctx.globalAlpha = room.alpha;
      ctx.drawImage(room.img, Math.round(r.x * scale), Math.round(r.y * scale), Math.round(r.w * scale), Math.round(r.h * scale));
      const spot = spotlight(room, t);
      // back row first, so the front rows overlap it like a crowd
      for (let i = room.seats.length - 1; i >= 0; i--) {
        const p = players.get(room.who[i]);
        if (!p) continue;
        const s = room.seats[i];
        const hop = p.id === spot ? Math.round(Math.abs(Math.sin(t / 160)) * 2) : 0;
        ctx.drawImage(spriteSheet(p.l), 0, 0, TS, TS, Math.round(s.x * scale), Math.round((s.y - hop) * scale), u, u);
      }
      ctx.globalAlpha = 1;
    }

    // town upgrades, then winner statues on their plinths around the Plaza
    if (decor) ctx.drawImage(decor, 0, 0, canvas.width, canvas.height);
    if (seasonDecor) ctx.drawImage(seasonDecor, 0, 0, canvas.width, canvas.height);
    const dropAge = reveal && reveal.start ? Date.now() - reveal.start : -1;
    if (dropAge >= 0 && dropAge < DROP_MS) {
      // falls in, lands at 70% of the time, then a little bounce
      const k = dropAge / DROP_MS;
      const off = k < 0.7 ? -Math.pow(1 - k / 0.7, 2) * 70 : -Math.sin(((k - 0.7) / 0.3) * Math.PI) * 4;
      ctx.drawImage(reveal.piece, 0, Math.round(off * scale), canvas.width, canvas.height);
    } else if (dropAge >= DROP_MS) refreshDecor();
    if (town.lv) {
      // an upgrade that is still waiting to drop in doesn't animate yet
      const waiting = reveal && dropAge < DROP_MS ? reveal.up : null;
      drawLandmarkFx(ctx, init, waiting ? { ...town.lv, [waiting.loc]: waiting.level - 1 } : town.lv, t, scale);
    }
    if (season) drawSeasonFx(ctx, init, season.id, t, scale);
    (town.st || []).slice().reverse().forEach((st, i) => {
      const [sx, sy] = STATUE_SPOTS[i];
      ctx.drawImage(statueSprite(st.l), Math.round(sx * u), Math.round((sy - 1) * u), u, u * 2);
    });

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
      } else if (p.a === "snowman") { // a snowman grows one ball at a time beside them
        const n = prog < 0.33 ? 1 : prog < 0.66 ? 2 : 3;
        const balls = [[8, 12, 5], [8, 7, 4], [8, 3, 3]];
        for (let i = 0; i < n; i++) {
          const [bx, by, r] = balls[i];
          ctx.fillStyle = "#2a2233"; ctx.beginPath(); ctx.arc(fx + bx * scale, fy + by * scale, (r + 0.6) * scale, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(fx + bx * scale, fy + by * scale, r * scale, 0, Math.PI * 2); ctx.fill();
        }
        if (n === 3) { ctx.fillStyle = "#ff7a1a"; ctx.fillRect(fx + 8 * scale, fy + 3 * scale, 3 * scale, scale); }
      } else if (p.a === "pumpkin") { // a pumpkin gets its face, then glows
        ctx.fillStyle = "#2a2233"; ctx.fillRect(fx + 3 * scale, fy + 6 * scale, 10 * scale, 9 * scale);
        ctx.fillStyle = "#ff7a1a"; ctx.fillRect(fx + 4 * scale, fy + 7 * scale, 8 * scale, 7 * scale);
        ctx.fillStyle = "#3f8f4a"; ctx.fillRect(fx + 7 * scale, fy + 4 * scale, 2 * scale, 3 * scale);
        if (prog > 0.5) {
          ctx.fillStyle = prog > 0.85 && Math.sin(t / 90) > -0.5 ? "#fff176" : "#2a2233";
          ctx.fillRect(fx + 5 * scale, fy + 9 * scale, 2 * scale, 2 * scale); ctx.fillRect(fx + 9 * scale, fy + 9 * scale, 2 * scale, 2 * scale);
          ctx.fillRect(fx + 6 * scale, fy + 12 * scale, 4 * scale, scale);
        }
      } else if (p.a === "kite") { // a kite climbs on its string and bobs in the breeze
        const cx = (p.rx + 0.5) * u, cy = (p.ry + 0.3) * u;
        const kx = cx + (14 + Math.sin(t / 800 + p.rx) * 4) * scale, ky = cy - (10 + prog * 26 + Math.sin(t / 500) * 2) * scale;
        ctx.strokeStyle = "#2a2233"; ctx.lineWidth = Math.max(1, scale / 2);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + 10 * scale, cy - 4 * scale, kx, ky); ctx.stroke();
        ctx.fillStyle = "#874BFF";
        ctx.beginPath(); ctx.moveTo(kx, ky - 6 * scale); ctx.lineTo(kx + 4 * scale, ky); ctx.lineTo(kx, ky + 6 * scale); ctx.lineTo(kx - 4 * scale, ky); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#FCB1FF"; ctx.fillRect(kx - scale, ky - 3 * scale, 2 * scale, 6 * scale);
        for (let i = 1; i <= 3; i++) ctx.fillRect(kx + Math.sin(t / 300 + i) * 2 * scale - scale, ky + (6 + i * 3) * scale, 2 * scale, 2 * scale);
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

    drawWeather(t);

    // inside each open building: a name tag for whoever's turn it is in the
    // roll call, and a count of anyone who didn't fit
    const ns = Math.max(7, Math.round(4.6 * scale));
    const marks = []; // [cx, cy, top] for everyone who pressed "Find me", drawn last
    for (const room of Object.values(rooms)) {
      if (!room.count || room.alpha < 0.5) continue;
      const r = room.rect;
      const spot = spotlight(room, t);
      const called = spot && players.get(spot)?.pg;
      const si = room.who.indexOf(spot);
      if (si >= 0) {
        const s = room.seats[si];
        // above the head: below would land on the wall, where the overflow badge goes
        label(players.get(spot).n, (s.x + TS / 2) * scale, s.y * scale - ns * 0.3, ns, "#000010", "#FCB1FF");
        // arrow tip rests on the name tag: any higher and the back row's arrow hits the sign
        if (called) marks.push([(s.x + TS / 2) * scale, (s.y + 9) * scale, s.y * scale - ns * 1.1 + 10 * scale]);
      } else if (called) {
        const by = (r.y + r.h + 6) * scale; // no seat: point at the overflow badge, which names them
        marks.push([(r.x + r.w / 2) * scale, by, by + 4 * scale]);
      }
      if (room.over.length) {
        // The sign has the total; this counts only the people with no seat,
        // so say so outright (seated + not shown = the sign's number).
        const n = room.over.length;
        const waiting = si < 0 && spot ? players.get(spot)?.n : null;
        const text = waiting
          ? (n > 1 ? `${waiting} + ${n - 1} more not shown` : `${waiting} not shown`)
          : `+${n} not shown`;
        label(text, (r.x + r.w / 2) * scale, (r.y + r.h + 6) * scale, ns,
          waiting ? "#000010" : "#fff", waiting ? "#FCB1FF" : "rgba(0,0,16,0.82)");
      }
    }

    // name tags, activity icons, speech
    for (const p of list) {
      const cx = (p.rx + 0.5) * u, top = (p.ry - 0.25) * u;
      label(p.n, cx, top + u + ns * 0.6, ns, p.pg ? "#000010" : "#fff", p.pg ? "#FCB1FF" : "rgba(0,0,16,0.6)");
      if (p.pg) marks.push([cx, (p.ry + 0.45) * u, top]);
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

    // statue name plates
    (town.st || []).slice().reverse().forEach((st, i) => {
      const [sx, sy] = STATUE_SPOTS[i];
      label(st.n, (sx + 0.5) * u, (sy + 1) * u + ns * 0.4, ns, "#000010", "#ffca28");
    });

    // dust where a new upgrade lands, then a gold arrow pointing at it
    if (dropAge >= 0 && reveal.box) {
      const bx = reveal.box;
      const landed = dropAge - DROP_MS * 0.7;
      if (landed >= 0 && landed < 700) {
        const ph = landed / 700;
        ctx.fillStyle = `rgba(235,225,205,${0.8 * (1 - ph)})`;
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
          const x = ((side < 0 ? bx.x0 : bx.x1) + side * (2 + ph * (6 + i * 4))) * scale;
          const y = (bx.y1 - i * 2 - ph * 3) * scale;
          const r = (2 + ph * 3 + i) * scale;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (dropAge >= DROP_MS && dropAge < ARROW_MS) {
        const cx = ((bx.x0 + bx.x1) / 2) * scale;
        const tip = (bx.y0 - 3 - Math.abs(Math.sin(t / 180)) * 4) * scale;
        const w = 5 * scale, h = 6 * scale, o = Math.max(1, scale * 0.75);
        for (const [pad, col] of [[o, "#000010"], [0, "#ffca28"]]) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(cx, tip + pad); ctx.lineTo(cx - w - pad, tip - h - pad); ctx.lineTo(cx + w + pad, tip - h - pad); ctx.closePath(); ctx.fill();
        }
      }
      if (dropAge >= ARROW_MS) reveal = null;
    }

    // "Find me" markers go on top of everything else
    for (const [cx, cy, top] of marks) findMark(cx, cy, top, t);

    // building / area signs, drawn last so nothing covers them (an open
    // building's sign lifts off the roof so it doesn't cover the back row)
    const fs = Math.max(7, Math.round(5.5 * scale));
    for (const l of init.labels) {
      const n = inside[l.id];
      const lift = rooms[l.id] ? rooms[l.id].alpha * (0.55 * u + 5 * scale) : 0;
      label(l.name.toUpperCase() + (n ? ` · ${n} INSIDE` : ""), l.x * u, (l.y + 0.55) * u - lift, fs, "#fff", "rgba(0,0,16,0.82)");
    }

    // countdown
    const left = Math.max(0, nextRaffle - now);
    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    $("count").textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  poll();
  requestAnimationFrame(frame);
})();
