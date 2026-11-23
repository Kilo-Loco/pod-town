// Original pixel art for Pod Town, drawn in code (no image assets).
// Shared by the big-screen display and the phone character creator.
(function () {
  const TS = 16;
  const OUT = "#2a2233";

  const SKIN = ["#f6d3b3", "#e0ac69", "#b0703c", "#6b4226"];
  const HAIRC = ["#2b2b2b", "#6b3e1e", "#d9a441", "#c0392b", "#874BFF", "#e8e8e8"];
  const SHIRT = ["#5D29F0", "#e53935", "#1e88e5", "#43a047", "#fdd835", "#fb8c00", "#ec407a", "#eceff1"];
  const PANTS = ["#37474f", "#3949ab", "#6d4c41", "#9e9e9e"];
  const HAIRS = ["Short", "Long", "Spiky", "Bun", "Bob", "Bald"];
  const ACCS = {
    none: "None", glasses: "Glasses", cap: "Cap", bow: "Bow",
    headphones: "Headphones", crown: "Crown", wizard: "Wizard hat", halo: "Halo",
  };

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }

  // ---------- characters ----------
  // dir: 0 down, 1 left, 2 right, 3 up.  frame: 0 stand, 1/2 steps.
  function drawSprite(ctx, ox, oy, look, dir, frame) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
    const skin = SKIN[look.skin] || SKIN[0];
    const hair = HAIRC[look.hairColor] || HAIRC[0];
    const shirt = SHIRT[look.shirt] || SHIRT[0];
    const pants = PANTS[look.pants] || PANTS[0];
    const side = dir === 1 || dir === 2;
    const bob = frame ? 1 : 0;

    p(4, 15, 8, 1, "rgba(0,0,0,0.22)"); // shadow

    // legs
    const legL = frame === 1 ? 1 : 2, legR = frame === 2 ? 1 : 2;
    if (side) {
      p(5, 13, 3, legL, pants); p(8, 13, 3, legR, pants);
      p(dir === 1 ? 4 : 5, 13 + legL, 3, 1, OUT); p(dir === 1 ? 8 : 9, 13 + legR, 3, 1, OUT);
    } else {
      p(5, 13, 2, legL, pants); p(9, 13, 2, legR, pants);
      p(5, 13 + legL, 2, 1, OUT); p(9, 13 + legR, 2, 1, OUT);
    }

    // body
    p(4, 9, 8, 5, OUT);
    p(5, 9, 6, 4, shirt);
    p(5, 12, 6, 1, shade(shirt, 0.8));
    if (side) {
      p(7, 10, 2, 2, shade(shirt, 0.8)); p(7, 12, 2, 1, skin);
    } else {
      p(3, 10, 1, 3, OUT); p(12, 10, 1, 3, OUT);
      p(4, 10, 1, 2, shirt); p(11, 10, 1, 2, shirt);
      p(4, 12, 1, 1, skin); p(11, 12, 1, 1, skin);
    }

    // head (bobs one pixel while stepping)
    const hy = bob ? 1 : 0;
    const h = (x, y, w, hh, c) => p(x, y + hy, w, hh, c);
    h(3, 1, 10, 9, OUT);
    h(4, 2, 8, 7, skin);

    // face
    if (dir === 0) { h(5, 5, 1, 2, OUT); h(10, 5, 1, 2, OUT); h(4, 7, 1, 1, shade(skin, 0.9)); h(11, 7, 1, 1, shade(skin, 0.9)); }
    if (dir === 1) h(5, 5, 1, 2, OUT);
    if (dir === 2) h(10, 5, 1, 2, OUT);

    // hair
    const style = look.hair | 0;
    if (style !== 5) {
      h(4, 1, 8, 2, hair);
      if (dir === 0) { h(4, 3, 8, 1, hair); h(6, 3, 4, 1, skin); }
      if (dir === 3) h(4, 3, 8, 4, hair);
      if (dir === 1) h(8, 3, 4, 4, hair);
      if (dir === 2) h(4, 3, 4, 4, hair);
      if (style === 1) { // long
        if (dir === 0) { h(3, 3, 2, 8, hair); h(11, 3, 2, 8, hair); }
        if (dir === 3) h(3, 3, 10, 8, hair);
        if (dir === 1) h(9, 3, 4, 8, hair);
        if (dir === 2) h(3, 3, 4, 8, hair);
      }
      if (style === 2) { h(4, 0, 1, 1, hair); h(6, 0, 2, 1, hair); h(9, 0, 1, 1, hair); h(11, 0, 1, 1, hair); }
      if (style === 3) { h(6, 0, 4, 1, hair); p(7, 0, 2, 1, hair); }
      if (style === 4) { // bob
        if (dir === 0) { h(3, 3, 2, 5, hair); h(11, 3, 2, 5, hair); }
        if (dir === 3) h(3, 3, 10, 5, hair);
        if (dir === 1) h(8, 3, 5, 5, hair);
        if (dir === 2) h(3, 3, 5, 5, hair);
      }
    }

    // accessory
    switch (look.acc) {
      case "glasses":
        if (dir === 0) { h(4, 5, 3, 2, "#cfe8ff"); h(9, 5, 3, 2, "#cfe8ff"); h(7, 5, 2, 1, OUT); h(5, 5, 1, 2, OUT); h(10, 5, 1, 2, OUT); }
        if (dir === 1) { h(4, 5, 3, 2, "#cfe8ff"); h(5, 5, 1, 2, OUT); h(7, 5, 3, 1, OUT); }
        if (dir === 2) { h(9, 5, 3, 2, "#cfe8ff"); h(10, 5, 1, 2, OUT); h(6, 5, 3, 1, OUT); }
        break;
      case "cap":
        h(4, 0, 8, 3, "#e53935"); h(4, 0, 8, 1, "#ff6f60");
        if (dir === 0) h(4, 3, 8, 1, "#b71c1c");
        if (dir === 1) h(1, 3, 5, 1, "#b71c1c");
        if (dir === 2) h(10, 3, 5, 1, "#b71c1c");
        break;
      case "bow":
        h(dir === 1 ? 9 : 10, 0, 4, 2, "#ff5fa2"); h(dir === 1 ? 10 : 11, 0, 2, 1, "#ffd1e3"); h(dir === 1 ? 10 : 11, 1, 2, 1, "#c2185b");
        break;
      case "headphones":
        h(4, 0, 8, 1, OUT);
        if (dir !== 2) h(3, 4, 2, 3, "#874BFF");
        if (dir !== 1) h(11, 4, 2, 3, "#874BFF");
        if (side) h(7, 4, 2, 3, "#874BFF");
        break;
      case "crown":
        h(4, 0, 8, 2, "#ffca28"); h(6, 0, 1, 1, OUT); h(9, 0, 1, 1, OUT); h(5, 1, 1, 1, "#e53935"); h(10, 1, 1, 1, "#42a5f5"); h(7, 1, 2, 1, "#fff59d");
        break;
      case "wizard":
        h(2, 2, 12, 1, "#5D29F0"); h(4, 1, 8, 1, "#5D29F0"); h(6, 0, 4, 1, "#5D29F0"); p(7, 0, 2, 1, "#874BFF"); h(7, 1, 1, 1, "#ffeb3b");
        break;
      case "halo":
        p(5, 0, 6, 1, "#fff176"); p(4, 0, 1, 1, "#fbc02d"); p(11, 0, 1, 1, "#fbc02d");
        break;
    }
  }

  const sheets = new Map();
  /** 4 directions x 3 frames, cached per look. Frame at (frame*16, dir*16). */
  function spriteSheet(look) {
    const key = JSON.stringify(look);
    let c = sheets.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = TS * 3; c.height = TS * 4;
    const ctx = c.getContext("2d");
    for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) drawSprite(ctx, f * TS, d * TS, look, d, f);
    if (sheets.size > 3000) sheets.clear();
    sheets.set(key, c);
    return c;
  }

  // ---------- world ----------
  const T = { GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, TREE: 4, BUILDING: 5, DOOR: 6, FENCE: 7, SOIL: 8, FOUNTAIN: 9, TABLE: 10, PLAZA: 11, SAND: 12 };
  const C = {
    g1: "#9bd45c", g2: "#84c44c", g3: "#5f9e3c",
    path: "#ead9a4", pathD: "#d3bd7e", pathE: "#b99e62",
    w1: "#58a8e8", w2: "#a4d6f7", w3: "#3f86c9",
    t1: "#2f6b3a", t2: "#3f8f4a", t3: "#72c05c", trunk: "#7a5230",
    plaza: "#d9d3c7", plazaD: "#b9b1a2",
    soil: "#8a5a3a", soilD: "#6e452b",
    wall: "#f3ead6", wallD: "#d9ccae",
  };
  const hash = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967296; };

  function grassTile(p, x, y) {
    p(0, 0, 16, 16, C.g1);
    const r = hash(x, y);
    const a = Math.floor(r * 10), b = Math.floor(hash(y, x) * 10);
    p(a, b, 2, 1, C.g2); p(a + 1, b - 1 < 0 ? 0 : b - 1, 1, 1, C.g2);
    p((a + 8) % 14, (b + 9) % 14, 2, 1, C.g2); p((a + 9) % 14, (b + 8) % 14, 1, 1, C.g2);
    if (r > 0.6) p((b + 5) % 13, (a + 4) % 13, 1, 2, C.g3);
  }

  function treeTile(p) {
    p(6, 11, 4, 4, C.trunk); p(6, 14, 4, 1, "#553820");
    p(2, 2, 12, 10, OUT); p(4, 0, 8, 14, OUT); p(1, 4, 14, 6, OUT);
    p(3, 2, 10, 9, C.t1); p(4, 1, 8, 12, C.t1); p(2, 4, 12, 5, C.t1);
    p(4, 2, 7, 7, C.t2); p(3, 4, 9, 4, C.t2);
    p(5, 2, 4, 3, C.t3); p(4, 4, 3, 2, C.t3);
  }

  function bakeWorld(init, waterFrame) {
    const { w, h, grid } = init;
    const c = document.createElement("canvas");
    c.width = w * TS; c.height = h * TS;
    const ctx = c.getContext("2d");
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? T.TREE : grid[y][x]);
    const hard = (t) => t === T.PATH || t === T.PLAZA || t === T.DOOR || t === T.BUILDING || t === T.FOUNTAIN || t === T.SAND;

    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = grid[y][x];
      const p = (px, py, pw, ph, col) => { ctx.fillStyle = col; ctx.fillRect(x * TS + px, y * TS + py, pw, ph); };
      switch (t) {
        case T.PATH: case T.DOOR: case T.BUILDING: {
          p(0, 0, 16, 16, C.path);
          const r = hash(x, y);
          p(Math.floor(r * 12) + 1, Math.floor(hash(y, x) * 12) + 1, 2, 1, C.pathD);
          p(Math.floor(hash(x + 7, y) * 12) + 1, Math.floor(hash(y + 3, x) * 12) + 1, 1, 1, C.pathD);
          break;
        }
        case T.PLAZA: case T.FOUNTAIN:
          p(0, 0, 16, 16, C.plaza);
          p(0, 0, 16, 1, C.plazaD); p(0, 8, 16, 1, C.plazaD);
          p((y % 2) * 8, 0, 1, 8, C.plazaD); p(((y + 1) % 2) * 8, 8, 1, 8, C.plazaD);
          break;
        case T.WATER: {
          p(0, 0, 16, 16, C.w1);
          const s = ((x + y) % 2 ? 4 : 0) + (waterFrame ? 3 : 0);
          p((2 + s) % 12, 4, 4, 1, C.w2); p((9 + s) % 12, 11, 3, 1, C.w2);
          p((6 + s) % 12, 8, 2, 1, C.w3);
          break;
        }
        case T.SAND:
          p(0, 0, 16, 16, "#f2cf7a");
          p(Math.floor(hash(x, y) * 12) + 1, Math.floor(hash(y, x) * 12) + 1, 2, 1, "#dcb45c");
          p(Math.floor(hash(x + 5, y) * 12) + 1, Math.floor(hash(y + 2, x) * 12) + 1, 1, 1, "#fff1c4");
          break;
        case T.SOIL:
          grassTile(p, x, y);
          p(1, 2, 14, 12, C.soilD); p(2, 3, 12, 10, C.soil);
          p(2, 5, 12, 1, C.soilD); p(2, 8, 12, 1, C.soilD); p(2, 11, 12, 1, C.soilD);
          break;
        default:
          grassTile(p, x, y);
      }
      if (t === T.FLOWER) {
        const cols = ["#ffffff", "#ff8fb8", "#ffe14d", "#c9a4ff"];
        const col = cols[Math.floor(hash(x + 1, y + 1) * 4)];
        const fx = 2 + Math.floor(hash(x, y + 9) * 4), fy = 3 + Math.floor(hash(x + 9, y) * 4);
        for (const [dx, dy] of [[0, 0], [7, 5]]) {
          p(fx + dx, fy + dy - 1, 1, 3, col); p(fx + dx - 1, fy + dy, 3, 1, col); p(fx + dx, fy + dy, 1, 1, "#f5a623");
        }
      }
      if (t === T.TREE) treeTile(p);
      if (t === T.FENCE) {
        const lr = at(x - 1, y) === T.FENCE || at(x + 1, y) === T.FENCE;
        const ud = at(x, y - 1) === T.FENCE || at(x, y + 1) === T.FENCE;
        if (lr) { p(0, 5, 16, 2, "#f5efe0"); p(0, 10, 16, 2, "#f5efe0"); p(0, 7, 16, 1, "#b9ad92"); p(0, 12, 16, 1, "#b9ad92"); }
        if (ud && !lr) { p(6, 0, 4, 16, "#f5efe0"); p(10, 0, 1, 16, "#b9ad92"); }
        p(5, 2, 6, 12, OUT); p(6, 3, 4, 10, "#f5efe0"); p(9, 3, 1, 10, "#b9ad92");
      }
      if (t === T.TABLE) {
        p(7, 9, 2, 5, "#7a5230"); p(5, 14, 6, 1, "#553820");
        p(2, 4, 12, 6, OUT); p(3, 5, 10, 4, "#f5efe0"); p(3, 8, 10, 1, "#cdbf9f");
        p(9, 5, 3, 2, "#c0504d"); p(4, 6, 2, 1, "#874BFF");
      }
      // soft edges where path/water meets grass
      if (t === T.PATH || t === T.DOOR) {
        if (!hard(at(x, y - 1))) p(0, 0, 16, 1, C.pathE);
        if (!hard(at(x, y + 1))) p(0, 15, 16, 1, C.pathE);
        if (!hard(at(x - 1, y))) p(0, 0, 1, 16, C.pathE);
        if (!hard(at(x + 1, y))) p(15, 0, 1, 16, C.pathE);
      }
      if (t === T.SAND) { // wooden frame, plus a sandcastle in the top-right corner
        const wood = "#8a5a3a", woodL = "#b07a4e";
        const top = at(x, y - 1) !== T.SAND, right = at(x + 1, y) !== T.SAND;
        if (top) { p(0, 0, 16, 3, wood); p(0, 0, 16, 1, woodL); }
        if (at(x, y + 1) !== T.SAND) { p(0, 13, 16, 3, wood); p(0, 13, 16, 1, woodL); }
        if (at(x - 1, y) !== T.SAND) { p(0, 0, 3, 16, wood); p(0, 0, 1, 16, woodL); }
        if (right) { p(13, 0, 3, 16, wood); p(13, 0, 1, 16, woodL); }
        if (top && right) {
          p(2, 9, 9, 6, "#c99a45"); p(3, 8, 7, 6, "#e0b860");
          p(2, 6, 2, 3, "#e0b860"); p(5, 6, 3, 2, "#e0b860"); p(9, 6, 2, 3, "#e0b860");
          p(6, 11, 2, 3, wood); p(6, 2, 1, 5, OUT); p(7, 2, 3, 2, "#874BFF");
        }
      }
      if (t === T.WATER) {
        if (at(x, y - 1) !== T.WATER) { p(0, 0, 16, 2, C.g3); p(0, 2, 16, 1, C.w2); }
        if (at(x, y + 1) !== T.WATER) p(0, 14, 16, 2, C.w3);
        if (at(x - 1, y) !== T.WATER) p(0, 0, 2, 16, C.g3);
        if (at(x + 1, y) !== T.WATER) p(14, 0, 2, 16, C.g3);
      }
    }

    // fountain (2x2 tiles)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (grid[y][x] === T.FOUNTAIN && at(x - 1, y) !== T.FOUNTAIN && at(x, y - 1) !== T.FOUNTAIN) {
        const p = (px, py, pw, ph, col) => { ctx.fillStyle = col; ctx.fillRect(x * TS + px, y * TS + py, pw, ph); };
        p(3, 6, 26, 22, OUT); p(1, 9, 30, 16, OUT);
        p(4, 7, 24, 20, "#b7b0a4"); p(2, 10, 28, 14, "#b7b0a4");
        p(5, 9, 22, 16, C.w1); p(4, 11, 24, 12, C.w1);
        p(7, 12, 5, 1, C.w2); p(19, 20, 5, 1, C.w2); p(8, 21, 3, 1, C.w3);
        p(13, 10, 6, 12, OUT); p(14, 11, 4, 10, "#d6d0c4");
        p(11, 3, 10, 5, OUT); p(12, 4, 8, 3, "#d6d0c4");
        const s = waterFrame ? 1 : 0;
        p(15, 1 - s + 1, 2, 3, C.w2); p(10 - s, 5, 2, 4, C.w2); p(20 + s, 5, 2, 4, C.w2);
      }
    }

    // buildings
    for (const b of init.buildings) {
      const X = b.x * TS, Y = b.y * TS, Wd = b.w * TS, Ht = b.h * TS;
      const r = (px, py, pw, ph, col) => { ctx.fillStyle = col; ctx.fillRect(X + px, Y + py, pw, ph); };
      const wallH = WALL_H;
      const roofH = Ht - wallH;
      r(0, 0, Wd, Ht, OUT);
      // roof
      r(1, 1, Wd - 2, roofH - 1, b.color);
      for (let yy = 6; yy < roofH - 2; yy += 6) r(1, yy, Wd - 2, 1, shade(b.color, 0.8));
      for (let yy = 1, k = 0; yy < roofH - 2; yy += 6, k++) {
        for (let xx = (k % 2) * 6 + 4; xx < Wd - 2; xx += 12) r(xx, yy, 1, 5, shade(b.color, 0.8));
      }
      r(1, 1, Wd - 2, 2, shade(b.color, 1.25));
      r(1, roofH - 3, Wd - 2, 3, shade(b.color, 0.65));
      // wall
      r(1, roofH + 1, Wd - 2, wallH - 2, C.wall);
      r(1, Ht - 4, Wd - 2, 3, C.wallD);
      // door
      const dx = (b.door.x - b.x) * TS;
      r(dx + 1, Ht - 20, 14, 20, OUT);
      r(dx + 3, Ht - 18, 10, 18, shade(b.color, 0.7));
      r(dx + 3, Ht - 18, 10, 2, shade(b.color, 1.2));
      r(dx + 10, Ht - 9, 2, 2, "#ffd54f");
      // windows
      for (let tx = 0; tx < b.w; tx++) {
        if (Math.abs(tx - (b.door.x - b.x)) < 1) continue;
        if (b.w > 5 && (tx === 0 || tx === b.w - 1)) continue;
        const wx = tx * TS + 3;
        r(wx, roofH + 6, 10, 11, OUT);
        r(wx + 1, roofH + 7, 8, 9, "#9fd8ff");
        r(wx + 1, roofH + 7, 8, 2, "#d9f1ff");
        r(wx + 4, roofH + 7, 1, 9, OUT); r(wx + 1, roofH + 11, 8, 1, OUT);
      }
    }
    return c;
  }

  // ---------- building interiors ----------
  // While a building has people in it, the display swaps its roof for a
  // cutaway of the room so everyone inside stays visible.
  const WALL_H = 28; // height of a building's front wall, in pixels
  const SEAT_DX = 13, SEAT_DY = 13, SEAT_TOP = 3; // rows overlap a little, like a crowd

  /** The roof area of a building in world pixels: where the cutaway is drawn. */
  function roofRect(b) {
    return { x: b.x * TS + 1, y: b.y * TS + 1, w: b.w * TS - 2, h: b.h * TS - WALL_H - 1 };
  }

  /**
   * Seat positions (sprite top-left, world pixels) in the order they fill:
   * front row first, from the middle outwards, so the first visitors stand
   * nearest the door. Every other row has one seat fewer, which staggers it
   * half a seat sideways (like theatre seating) so heads don't stack into
   * columns.
   */
  function seatsFor(b) {
    const r = roofRect(b);
    const cols = Math.max(1, Math.floor((r.w - 4 - TS) / SEAT_DX) + 1);
    const rows = Math.max(1, Math.floor((r.h - SEAT_TOP - TS) / SEAT_DY) + 1);
    const seats = [];
    for (let k = 0; k < rows; k++) {
      const n = k % 2 && cols > 1 ? cols - 1 : cols;
      const x0 = r.x + Math.round((r.w - ((n - 1) * SEAT_DX + TS)) / 2);
      const mid = (n - 1) / 2;
      const order = [...Array(n).keys()].sort((a, c) => Math.abs(a - mid) - Math.abs(c - mid) || a - c);
      for (const c of order) seats.push({ x: x0 + c * SEAT_DX, y: r.y + r.h - TS - k * SEAT_DY });
    }
    return seats;
  }

  const ROOMS = {
    library: { floor: "#9a6a44", line: "#7f5434" },
    arcade: { floor: "#2f2546", line: "#3d3060" },
    lab: { floor: "#e4e0f2", line: "#c9c2e6" },
    gym: { floor: "#c99a5b", line: "#a97c42" },
    market: { floor: "#e8efe9", line: "#c6d6ca" },
  };

  /** The cutaway room for one building, sized to roofRect(b). */
  function bakeInterior(b, fancy = false) {
    const { w, h } = roofRect(b);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const p = (x, y, pw, ph, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, pw, ph); };
    const theme = ROOMS[b.id] || { floor: C.wall, line: C.wallD };
    const band = Math.min(12, Math.floor(h / 3)); // back wall, with props along it

    // floor: planks or tiles
    p(0, 0, w, h, theme.floor);
    for (let y = band + 5; y < h; y += 6) p(0, y, w, 1, theme.line);
    for (let y = band, k = 0; y < h; y += 6, k++) {
      for (let x = (k % 2) * 8 + 3; x < w; x += 16) p(x, y, 1, 6, theme.line);
    }

    // back wall
    p(0, 0, w, band, shade(b.color, 0.55));
    p(0, band - 1, w, 1, shade(b.color, 0.35));
    const props = (step, draw) => { for (let x = 3; x + step - 3 <= w; x += step) draw(x); };
    switch (b.id) {
      case "library": // bookshelves
        props(12, (x) => {
          p(x, 1, 10, band - 2, "#5a3a22");
          const spines = ["#c0504d", "#3f7fbf", "#e8c547", "#3a9d6a", "#874BFF", "#f3ead6"];
          for (let i = 0; i < 8; i++) p(x + 1 + i, 2, 1, Math.floor((band - 4) / 2), spines[(i + x) % spines.length]);
          for (let i = 0; i < 8; i++) p(x + 1 + i, 3 + Math.floor((band - 4) / 2), 1, Math.floor((band - 4) / 2) - 1, spines[(i * 3 + x) % spines.length]);
        });
        break;
      case "arcade": // cabinets with glowing screens
        props(12, (x) => {
          p(x, 1, 9, band - 1, OUT);
          p(x + 1, 2, 7, 4, ["#FCB1FF", "#58a8e8", "#72c05c", "#ffca28"][(x >> 2) % 4]);
          p(x + 2, band - 4, 2, 1, "#e53935"); p(x + 5, band - 4, 2, 1, "#ffca28");
        });
        break;
      case "lab": // server racks, Runpod purple
        props(11, (x) => {
          p(x, 1, 8, band - 1, OUT);
          for (let y = 2; y < band - 1; y += 2) {
            p(x + 1, y, 6, 1, "#3d3060");
            p(x + 5, y, 1, 1, (x + y) % 3 ? "#874BFF" : "#72c05c");
          }
        });
        break;
      case "gym": // mirrors and dumbbell racks
        props(16, (x) => {
          p(x, 1, 8, band - 3, "#cfe8ff"); p(x + 1, 2, 2, band - 6, "#ffffff");
          p(x + 10, band - 4, 4, 1, "#555"); p(x + 9, band - 5, 2, 3, OUT); p(x + 13, band - 5, 2, 3, OUT);
        });
        break;
      case "market": // shelves of swag
        props(12, (x) => {
          p(x, 1, 10, band - 2, "#8a5a3a");
          p(x + 1, 2, 3, 3, "#5D29F0"); p(x + 5, 2, 4, 3, "#FCB1FF");
          p(x + 1, band - 5, 4, 3, "#e53935"); p(x + 6, band - 5, 3, 3, "#ffca28");
        });
        break;
    }
    // level 3: the room is done up too, so the upgrade shows while it's busy
    if (fancy) FANCY_ROOM[b.id]?.(p, w, h, band);
    // soft shadow along the inside of the walls
    p(0, band, w, 2, "rgba(0,0,0,0.18)");
    p(0, 0, 1, h, "rgba(0,0,0,0.25)"); p(w - 1, 0, 1, h, "rgba(0,0,0,0.25)");
    return c;
  }

  // ---------- town upgrades ----------
  // Each place has three upgrades (names in game/town.js). They are pure
  // decoration placed on spare ground, so they never block a path:
  //  buildings: 1 flower boxes under the windows, 2 a prop on the right,
  //             3 a landmark on the left
  //  outdoor places: hand-placed props around the area
  const BLOOMS = ["#ff8fb8", "#ffe14d", "#ffffff", "#c9a4ff", "#ff7043"];

  /** Each window position of a building (same layout as bakeWorld): x offset in pixels. */
  function windowXs(b) {
    const out = [];
    for (let tx = 0; tx < b.w; tx++) {
      if (Math.abs(tx - (b.door.x - b.x)) < 1) continue;
      if (b.w > 5 && (tx === 0 || tx === b.w - 1)) continue;
      out.push(tx * TS + 3);
    }
    return out;
  }

  /** Runpod HQ's level 1, Pods: a GPU pod module under each window (lights blink in HQ_FX). */
  function podModules(ctx, b) {
    const X = b.x * TS, Y = b.y * TS + b.h * TS - 11;
    const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };
    for (const wx of windowXs(b)) { p(wx - 1, 0, 12, 5, OUT); p(wx, 1, 10, 3, "#3d3060"); p(wx, 1, 10, 1, "#5D29F0"); }
  }

  /** Flower boxes under a building's windows (same window layout as bakeWorld). */
  function flowerBoxes(ctx, b) {
    const X = b.x * TS, Ht = b.h * TS, Y = b.y * TS;
    const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };
    for (let tx = 0; tx < b.w; tx++) {
      if (Math.abs(tx - (b.door.x - b.x)) < 1) continue;
      if (b.w > 5 && (tx === 0 || tx === b.w - 1)) continue;
      const wx = tx * TS + 3, y = Ht - 11;
      p(wx - 1, y, 12, 4, OUT); p(wx, y + 1, 10, 2, "#8a5a3a");
      for (let i = 0; i < 4; i++) {
        p(wx + 1 + i * 2.5 | 0, y - 2, 2, 2, BLOOMS[(tx + i + b.x) % BLOOMS.length]);
        p(wx + 1 + i * 2.5 | 0, y, 2, 1, C.t2);
      }
    }
  }

  // 16x32 props beside a building (p's origin is the top of the upper tile)
  const SIDE = {
    lab(p) { // Serverless: a cloud sign over a stand where workers spin up (HQ_FX)
      p(7, 15, 2, 12, OUT);
      p(4, 3, 8, 3, OUT); p(2, 5, 12, 3, OUT); p(0, 7, 16, 8, OUT);
      p(5, 4, 6, 2, "#ffffff"); p(3, 6, 10, 2, "#ffffff"); p(1, 8, 14, 6, "#ffffff"); p(1, 12, 14, 2, "#e4e0f2");
      p(8, 7, 3, 2, "#874BFF"); p(7, 9, 3, 2, "#874BFF"); p(6, 11, 3, 2, "#874BFF"); // lightning bolt
      p(1, 27, 14, 4, OUT); p(2, 28, 12, 2, "#3d3060");
    },
    gym(p) { // weight bench with a loaded bar
      p(3, 22, 10, 3, OUT); p(4, 22, 8, 2, "#e53935");
      p(4, 25, 2, 6, OUT); p(10, 25, 2, 6, OUT);
      p(1, 14, 14, 2, "#9e9e9e"); p(0, 11, 3, 8, OUT); p(13, 11, 3, 8, OUT); p(1, 12, 1, 6, "#555"); p(14, 12, 1, 6, "#555");
      p(3, 16, 1, 6, OUT); p(12, 16, 1, 6, OUT);
    },
    library(p) { // book cart
      p(1, 16, 14, 12, OUT); p(2, 17, 12, 10, "#8a5a3a");
      const sp = ["#c0504d", "#3f7fbf", "#e8c547", "#3a9d6a", "#874BFF"];
      for (let i = 0; i < 10; i++) { p(3 + i, 18, 1, 4, sp[i % 5]); p(3 + i, 23, 1, 3, sp[(i + 2) % 5]); }
      p(2, 28, 3, 3, OUT); p(11, 28, 3, 3, OUT);
    },
    arcade(p) { // claw machine
      p(1, 4, 14, 27, OUT); p(2, 5, 12, 3, "#FCB1FF");
      p(2, 9, 12, 11, "#cfe8ff"); p(7, 9, 1, 5, OUT); p(5, 14, 5, 1, OUT);
      p(3, 17, 3, 3, "#ffca28"); p(6, 18, 3, 2, "#58a8e8"); p(10, 17, 3, 3, "#72c05c");
      p(2, 21, 12, 9, "#d94f9a"); p(4, 23, 3, 2, "#e53935"); p(9, 24, 4, 3, OUT);
    },
    market(p) { // swag cart with a striped awning
      for (let x = 0; x < 16; x += 4) { p(x, 8, 2, 5, "#5D29F0"); p(x + 2, 8, 2, 5, "#ffffff"); }
      p(0, 13, 16, 1, OUT); p(2, 14, 1, 8, OUT); p(13, 14, 1, 8, OUT);
      p(1, 20, 14, 8, OUT); p(2, 21, 12, 6, "#3a9d6a");
      p(3, 18, 3, 3, "#FCB1FF"); p(7, 17, 3, 4, "#ffca28"); p(11, 18, 2, 3, "#5D29F0");
      p(2, 28, 3, 3, OUT); p(11, 28, 3, 3, OUT);
    },
    cafe(p) { // coffee cart
      for (let x = 0; x < 16; x += 4) { p(x, 8, 2, 5, "#d98e3a"); p(x + 2, 8, 2, 5, "#ffffff"); }
      p(0, 13, 16, 1, OUT); p(2, 14, 1, 8, OUT); p(13, 14, 1, 8, OUT);
      p(1, 20, 14, 8, OUT); p(2, 21, 12, 6, "#7a5230");
      p(6, 16, 4, 4, "#ffffff"); p(6, 16, 4, 1, "#d98e3a"); p(10, 17, 1, 2, "#ffffff");
      p(2, 28, 3, 3, OUT); p(11, 28, 3, 3, OUT);
    },
  };
  const LANDMARK = {
    lab(p) { // Instant Clusters: three GPU towers wired together
      for (const [x, top] of [[0, 10], [6, 6], [12, 10]]) {
        p(x, top, 5, 31 - top, OUT); p(x + 1, top + 1, 3, 29 - top, "#3d3060");
        for (let y = top + 3; y < 29; y += 3) p(x + 1, y, 3, 1, "#2a2233");
      }
      p(4, 15, 3, 1, "#5D29F0"); p(10, 15, 3, 1, "#5D29F0"); p(4, 22, 3, 1, "#5D29F0"); p(10, 22, 3, 1, "#5D29F0");
      p(0, 30, 17, 1, "#1b1530");
    },
    gym(p) { // giant dumbbell on a plinth
      p(2, 26, 12, 5, OUT); p(3, 27, 10, 3, "#b7b0a4");
      p(0, 10, 5, 16, OUT); p(11, 10, 5, 16, OUT); p(1, 11, 3, 14, "#3f7fbf"); p(12, 11, 3, 14, "#3f7fbf");
      p(5, 16, 6, 4, OUT); p(5, 17, 6, 2, "#9e9e9e");
    },
    library(p) { // clock tower
      p(3, 8, 10, 23, OUT); p(4, 9, 8, 21, "#c0504d");
      p(2, 4, 12, 5, OUT); p(5, 0, 6, 5, OUT); p(6, 1, 4, 4, shade("#c0504d", 0.7)); p(3, 5, 10, 3, shade("#c0504d", 0.7));
      p(5, 11, 6, 6, "#f3ead6"); p(7, 12, 1, 3, OUT); p(8, 14, 2, 1, OUT);
      p(6, 24, 4, 6, OUT);
    },
    arcade(p) { // giant joystick
      p(1, 22, 14, 9, OUT); p(2, 23, 12, 6, "#d94f9a"); p(3, 23, 10, 1, "#FCB1FF");
      p(7, 10, 2, 13, OUT); p(4, 3, 8, 8, OUT); p(5, 4, 6, 6, "#e53935"); p(6, 5, 2, 2, "#ff8a80");
      p(11, 25, 2, 2, "#ffca28"); p(3, 25, 2, 2, "#58a8e8");
    },
    market(p) { // giant shopping bag
      p(4, 6, 2, 8, OUT); p(10, 6, 2, 8, OUT); p(5, 5, 6, 2, OUT);
      p(1, 12, 14, 19, OUT); p(2, 13, 12, 17, "#3a9d6a"); p(2, 13, 12, 2, "#5cc28c");
      p(5, 18, 6, 6, "#5D29F0"); p(7, 20, 2, 2, "#ffffff");
    },
    cafe(p) { // giant coffee cup
      p(5, 1, 1, 4, "#ffffff"); p(9, 0, 1, 5, "#ffffff");
      p(1, 7, 14, 4, OUT); p(2, 8, 12, 2, "#7a5230");
      p(2, 11, 12, 19, OUT); p(3, 11, 10, 18, "#ffffff"); p(3, 17, 10, 6, "#d98e3a"); p(6, 19, 4, 2, "#ffffff");
      p(4, 29, 8, 2, OUT);
    },
  };

  // outdoor places: [tileX, tileY, draw] per level (16x16 or 16x32 drawings)
  const OUTDOOR = {
    sandbox: [
      [[20, 4, (p) => { // beach umbrella
        p(7, 8, 2, 22, OUT);
        p(1, 4, 14, 5, OUT); p(3, 2, 10, 3, OUT);
        p(2, 5, 4, 3, "#e53935"); p(6, 5, 4, 3, "#ffffff"); p(10, 5, 4, 3, "#e53935"); p(4, 3, 8, 2, "#ffffff");
      }]],
      [[20, 6, (p) => { // bucket and spade
        p(2, 7, 8, 8, OUT); p(3, 8, 6, 6, "#1e88e5"); p(3, 8, 6, 1, "#64b5f6"); p(2, 5, 8, 1, OUT);
        p(12, 2, 1, 9, "#7a5230"); p(11, 10, 3, 5, "#ffca28");
      }]],
      [[27, 4, (p) => { // palm tree
        p(7, 10, 3, 21, "#8a5a3a"); p(7, 14, 3, 1, "#6e452b"); p(7, 19, 3, 1, "#6e452b"); p(7, 24, 3, 1, "#6e452b");
        p(0, 4, 8, 3, C.t2); p(9, 4, 7, 3, C.t2); p(3, 1, 10, 4, C.t3); p(1, 7, 3, 3, C.t2); p(12, 7, 3, 3, C.t2);
      }]], // its coconuts are drawn by FX.sandbox so they can sway
    ],
    pond: [
      [[8, 24, (p) => { // wooden dock over the water
        p(2, 0, 12, 32, "#8a5a3a");
        for (let y = 3; y < 32; y += 4) p(2, y, 12, 1, "#6e452b");
        p(1, 0, 2, 32, OUT); p(13, 0, 2, 32, OUT);
      }]],
      [[5, 23, (p) => { // rowboat
        p(1, 6, 14, 6, OUT); p(2, 7, 12, 4, "#c0504d"); p(3, 7, 10, 1, "#e57373");
        p(5, 8, 1, 3, OUT); p(10, 8, 1, 3, OUT); p(0, 4, 4, 1, "#7a5230"); p(12, 13, 4, 1, "#7a5230");
      }]],
      [[11, 24, (p) => { // lighthouse
        p(3, 10, 10, 21, OUT); p(4, 11, 8, 19, "#ffffff");
        p(4, 15, 8, 3, "#e53935"); p(4, 23, 8, 3, "#e53935");
        p(4, 4, 8, 7, OUT); p(5, 5, 6, 4, "#fff59d"); p(3, 2, 10, 3, OUT); p(5, 0, 6, 2, "#e53935");
        p(6, 26, 4, 4, OUT);
      }]],
    ],
    garden: [
      [[36, 20, (p) => { // scarecrow
        p(7, 10, 2, 21, "#7a5230"); p(1, 13, 14, 2, "#7a5230");
        p(4, 12, 8, 9, OUT); p(5, 13, 6, 7, "#5D29F0");
        p(4, 3, 8, 8, OUT); p(5, 4, 6, 6, "#f2cf7a"); p(6, 6, 1, 1, OUT); p(9, 6, 1, 1, OUT);
        p(2, 2, 12, 2, "#c99a45"); p(4, 0, 8, 2, "#c99a45");
      }]],
      [[44, 20, (p) => sunflowers(p)], [44, 22, (p) => sunflowers(p)]],
      [[36, 24, (p) => { // GPU silo
        p(2, 4, 12, 27, OUT); p(3, 5, 10, 25, "#b7b0a4");
        for (let y = 9; y < 30; y += 5) p(3, y, 10, 1, "#8f887c");
        p(3, 0, 10, 5, OUT); p(4, 1, 8, 4, "#5D29F0");
        p(5, 13, 6, 5, "#2a2233"); p(6, 14, 4, 3, "#874BFF"); p(5, 12, 6, 1, "#ffca28"); p(5, 18, 6, 1, "#ffca28");
      }]],
    ],
    plaza: [
      [[21, 17, bench], [26, 17, bench]],
      [[19, 11, (p) => bunting(p, 10)]],
      [[23, 14, (p) => { // golden fountain: gold rim and sparkling spray
        p(3, 6, 26, 2, "#ffca28"); p(1, 9, 2, 16, "#ffca28"); p(29, 9, 2, 16, "#ffca28"); p(3, 26, 26, 2, "#ffca28");
        p(14, 11, 4, 10, "#ffe082"); p(12, 4, 8, 3, "#ffe082");
        p(15, 0, 2, 2, "#fff59d"); p(9, 3, 2, 2, "#fff59d"); p(21, 3, 2, 2, "#fff59d");
      }]],
    ],
  };
  function sunflowers(p) {
    for (const x of [2, 9]) {
      p(x + 2, 6, 1, 10, C.t2); p(x + 3, 10, 2, 1, C.t3);
      p(x, 1, 5, 5, "#ffca28"); p(x + 1, 2, 3, 3, "#7a5230");
    }
  }
  function bench(p) {
    p(1, 6, 14, 2, OUT); p(1, 9, 14, 3, OUT); p(2, 10, 12, 1, "#b07a4e"); p(2, 6, 12, 1, "#b07a4e");
    p(2, 12, 2, 3, OUT); p(12, 12, 2, 3, OUT);
  }
  /** A string of triangle flags along the top edge of `tiles` tiles. */
  function bunting(p, tiles) {
    const cols = ["#5D29F0", "#FCB1FF", "#ffca28", "#58a8e8", "#72c05c"];
    const w = tiles * TS;
    for (let x = 0; x < w; x++) p(x, 1 + Math.round(Math.sin((x / w) * Math.PI * 2 * (tiles / 2)) * 1.5), 1, 1, OUT);
    for (let x = 3, i = 0; x < w - 4; x += 8, i++) {
      const y = 2 + Math.round(Math.sin((x / w) * Math.PI * 2 * (tiles / 2)) * 1.5);
      for (let r = 0; r < 4; r++) p(x + r, y + r, 5 - 2 * r > 0 ? 5 - r * 2 : 1, 1, cols[i % cols.length]);
    }
  }

  // ---------- level 3 building makeovers ----------
  // A building's level 3 shows on every part of it: the front wall (always
  // visible), the roof (seen while the building is empty) and the room inside
  // (seen while people are in it, when the roof is cut away). Drawings use
  // coordinates relative to the building's top-left; rh is the roof height
  // and dx the door's left edge.
  const FACADE = {
    lab(p, w, rh, dx) { // purple trim, corner pillars and a glowing sign over the door
      p(1, rh + 1, w - 2, 3, "#5D29F0"); p(1, rh + 4, w - 2, 1, "#3d1fa8");
      p(1, rh + 1, 3, WALL_H - 5, "#5D29F0"); p(w - 4, rh + 1, 3, WALL_H - 5, "#5D29F0");
      p(dx - 2, rh + 1, 20, 7, OUT); p(dx - 1, rh + 2, 18, 5, "#874BFF");
      p(dx + 2, rh + 3, 3, 3, "#ffffff"); p(dx + 6, rh + 3, 2, 3, "#ffffff"); p(dx + 9, rh + 3, 2, 3, "#ffffff"); p(dx + 12, rh + 3, 3, 3, "#ffffff");
    },
    library(p, w, rh, dx) { // stone columns and a carved pediment around the door
      for (const x of [dx - 4, dx + 17]) { p(x, rh + 6, 3, WALL_H - 9, OUT); p(x + 1, rh + 6, 1, WALL_H - 9, "#f3ead6"); p(x - 1, rh + 5, 5, 2, OUT); }
      for (let r = 0; r < 4; r++) p(dx - 4 + r * 3, rh + 4 - r, 24 - r * 6, 1, OUT);
      p(dx - 3, rh + 4, 22, 2, "#e0d4b4");
    },
    arcade(p, w, rh) { // a neon marquee along the top of the wall (bulbs blink in FACADE_FX)
      p(1, rh + 1, w - 2, 5, OUT); p(1, rh + 2, w - 2, 3, "#d94f9a");
    },
    gym(p, w, rh, dx) { // team stripes and a gold trophy over the door
      for (let x = 1; x < w - 1; x += 6) { p(x, rh + 1, 3, 4, "#3f7fbf"); p(x + 3, rh + 1, 3, 4, "#ffffff"); }
      p(1, rh + 5, w - 2, 1, OUT);
      // the trophy sits on its own plaque, breaking the stripes rather than covering them
      p(dx + 1, rh + 1, 14, 7, OUT); p(dx + 2, rh + 2, 12, 5, "#2f5f99");
      p(dx + 6, rh + 2, 4, 3, "#ffca28"); p(dx + 4, rh + 2, 2, 2, "#ffca28"); p(dx + 10, rh + 2, 2, 2, "#ffca28"); p(dx + 7, rh + 5, 2, 1, "#ffca28"); p(dx + 6, rh + 6, 4, 1, "#ffca28");
    },
    market(p, w, rh) { // a striped shop awning across the front
      for (let x = 1; x < w - 1; x += 6) { p(x, rh + 1, 3, 3, "#3a9d6a"); p(x + 3, rh + 1, 3, 3, "#ffffff"); p(x + 1, rh + 4, 1, 1, "#3a9d6a"); p(x + 4, rh + 4, 1, 1, "#e0e0e0"); }
      p(1, rh + 1, w - 2, 1, OUT);
    },
    cafe(p, w, rh) { // a striped awning over the windows
      for (let x = 1; x < w - 1; x += 6) { p(x, rh + 1, 3, 3, "#d98e3a"); p(x + 3, rh + 1, 3, 3, "#ffffff"); p(x + 1, rh + 4, 1, 1, "#d98e3a"); p(x + 4, rh + 4, 1, 1, "#e0e0e0"); }
      p(1, rh + 1, w - 2, 1, OUT);
    },
  };
  const ROOF = {
    lab(p, w, rh) { // rows of rooftop GPU racks with purple status lights
      for (let y = 5; y + 5 < rh - 3; y += 8) for (let x = 5; x + 12 < w - 4; x += 15) {
        p(x, y, 12, 5, OUT); p(x + 1, y + 1, 10, 3, "#3d3060"); p(x + 9, y + 2, 1, 1, "#874BFF"); p(x + 7, y + 2, 1, 1, "#72c05c");
      }
    },
    library(p, w, rh) { // a golden dome on a stone drum, on the lower half of the roof
      const cx = Math.floor(w / 2), base = rh - 4, drum = 6, r = Math.min(10, rh - drum - 10);
      p(cx - 14, base - drum, 28, drum + 1, OUT); p(cx - 13, base - drum + 1, 26, drum - 1, "#e0d4b4");
      for (let x = cx - 11; x < cx + 11; x += 5) p(x, base - drum + 2, 2, drum - 3, OUT);
      const top = base - drum;
      for (let y = 0; y <= r; y++) {
        const half = Math.round(Math.sqrt(r * r - y * y) * 1.2);
        p(cx - half - 1, top - y, half * 2 + 2, 1, OUT);
        if (half > 0) p(cx - half, top - y, half * 2, 1, y > r * 0.55 ? "#ffe082" : "#ffca28");
      }
      p(cx - 3, top - r + 2, 2, Math.max(1, r - 4), "#fff3c4"); // shine
      p(cx - 1, top - r - 4, 2, 4, OUT); p(cx - 2, top - r - 5, 4, 2, "#ffca28");
    },
    arcade(p, w, rh) { // neon trim round the roof
      p(2, 2, w - 4, 2, "#58a8e8"); p(2, rh - 6, w - 4, 2, "#FCB1FF");
      p(2, 2, 2, rh - 6, "#FCB1FF"); p(w - 4, 2, 2, rh - 6, "#58a8e8");
      for (let x = 6; x < w - 6; x += 6) { p(x, 2, 2, 2, "#ffffff"); p(x + 3, rh - 6, 2, 2, "#ffffff"); }
    },
    gym(p, w, rh) { // a big dumbbell painted on the roof
      const cx = Math.floor(w / 2), cy = Math.floor(rh / 2) + 2;
      p(cx - 12, cy - 1, 24, 2, "#ffffff"); p(cx - 16, cy - 5, 4, 10, "#ffffff"); p(cx + 12, cy - 5, 4, 10, "#ffffff");
    },
    market(p, w, rh) { // a little rooftop garden along the edge
      for (let x = 5; x + 7 < w - 4; x += 11) { p(x, rh - 13, 7, 5, OUT); p(x + 1, rh - 12, 5, 3, "#8a5a3a"); p(x + 1, rh - 16, 5, 4, C.t2); p(x + 2, rh - 17, 2, 1, "#ff8fb8"); p(x + 4, rh - 16, 1, 1, "#ffe14d"); }
    },
    cafe(p, w, rh) { // a brick chimney
      p(w - 14, 2, 8, 12, OUT); p(w - 13, 3, 6, 11, "#a0522d"); p(w - 13, 6, 6, 1, "#7a3e22"); p(w - 13, 10, 6, 1, "#7a3e22");
    },
  };
  const FANCY_ROOM = {
    lab(p, w, h, band) { // a big screen on the back wall and a glowing floor strip
      const cx = Math.floor(w / 2);
      p(cx - 10, 1, 20, band - 3, OUT); p(cx - 9, 2, 18, band - 5, "#874BFF"); p(cx - 7, 3, 6, 2, "#FCB1FF"); p(cx, 4, 6, 1, "#ffffff");
      p(0, h - 3, w, 2, "rgba(135,75,255,0.55)");
    },
    library(p, w, h, band) { // a red rug and golden reading lamps
      p(6, band + 4, w - 12, h - band - 8, "#8e2b2b"); p(8, band + 6, w - 16, h - band - 12, "#b23a3a");
      for (const x of [4, w - 7]) { p(x, band + 2, 3, 2, "#ffca28"); p(x + 1, band + 4, 1, 5, OUT); }
    },
    arcade(p, w, h, band) { // light-up dance floor
      const cols = ["#d94f9a", "#58a8e8", "#72c05c", "#ffca28"];
      for (let y = band + 2, j = 0; y < h - 2; y += 6, j++) for (let x = 2, i = 0; x < w - 2; x += 6, i++) p(x, y, 5, 5, cols[(i + j) % 4] + "88");
    },
    gym(p, w, h, band) { // blue training mats
      p(3, band + 3, w - 6, h - band - 6, "#2f5f99"); p(5, band + 5, w - 10, h - band - 10, "#3f7fbf");
      p(Math.floor(w / 2), band + 5, 1, h - band - 10, "#ffffff");
    },
    market(p, w, h, band) { // gold spotlights on the swag
      for (let x = 6; x < w - 6; x += 14) p(x, band, 8, h - band, "rgba(255,236,140,0.18)");
      p(0, band, w, 1, "#ffca28");
    },
  };
  /** Draw a building's level 3 facade (or roof) onto ctx in world pixels. */
  function makeover(ctx, b, table) {
    const draw = table[b.id];
    if (!draw) return;
    const X = b.x * TS, Y = b.y * TS;
    const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };
    draw(p, b.w * TS, b.h * TS - WALL_H, (b.door.x - b.x) * TS);
  }

  /** Level 3 roofs, on their own layer: the big screen draws it under the room cutaways. */
  function drawRoofUpgrades(init, levels, keep = () => true) {
    const c = document.createElement("canvas");
    c.width = init.w * TS; c.height = init.h * TS;
    const ctx = c.getContext("2d");
    for (const b of init.buildings) if ((levels[b.id] || 0) >= 3 && keep(b.id, 3)) makeover(ctx, b, ROOF);
    return c;
  }

  /**
   * Upgrades at the given levels ({ placeId: 0..3 }) on a transparent
   * world-sized canvas. `keep(placeId, level)` can leave pieces out: the big
   * screen draws a brand-new upgrade on its own while it drops into place.
   */
  function drawUpgrades(init, levels, keep = () => true) {
    const c = document.createElement("canvas");
    c.width = init.w * TS; c.height = init.h * TS;
    const ctx = c.getContext("2d");
    const at = (tx, ty) => (px, py, pw, ph, col) => { ctx.fillStyle = col; ctx.fillRect(tx * TS + px, ty * TS + py, pw, ph); };
    const shift = (p, dx) => (px, py, pw, ph, col) => p(px + dx, py, pw, ph, col);
    for (const b of init.buildings) {
      const lv = levels[b.id] || 0;
      if (lv >= 1 && keep(b.id, 1)) (b.id === "lab" ? podModules : flowerBoxes)(ctx, b);
      // props stand a couple of pixels off the wall so they don't look stuck to it
      if (lv >= 2 && keep(b.id, 2) && SIDE[b.id]) SIDE[b.id](shift(at(b.x + b.w, b.y + b.h - 2), 2));
      if (lv >= 3 && keep(b.id, 3)) {
        makeover(ctx, b, FACADE);
        if (LANDMARK[b.id]) LANDMARK[b.id](shift(at(b.x - 1, b.y + b.h - 2), -2));
      }
    }
    for (const [id, steps] of Object.entries(OUTDOOR)) {
      const lv = levels[id] || 0;
      for (let i = 0; i < lv; i++) if (keep(id, i + 1)) for (const [tx, ty, draw] of steps[i]) draw(at(tx, ty));
    }
    return c;
  }


  // ---------- landmark animations ----------
  // Small moving touches on each place's level 3 landmark, drawn every frame
  // on top of the baked upgrades so the finished town feels alive.
  const FX = {
    lab(p, t) { // Instant Clusters: data pulses run between the towers, lights blink
      const k = (t % 900) / 900;
      p(4 + Math.floor(k * 3), 15, 1, 1, "#FCB1FF"); p(12 - Math.floor(k * 3), 15, 1, 1, "#FCB1FF");
      p(6 - Math.floor(k * 3), 22, 1, 1, "#FCB1FF"); p(10 + Math.floor(k * 3), 22, 1, 1, "#FCB1FF");
      const step = Math.floor(t / 250);
      for (const [x, top, i] of [[0, 10, 0], [6, 6, 1], [12, 10, 2]]) {
        for (let y = top + 3, j = 0; y < 29; y += 3, j++) p(x + 3, y, 1, 1, (step + i + j) % 4 ? "#72c05c" : "#874BFF");
      }
    },
    library(p, t) { // clock tower: the minute hand goes round
      p(5, 11, 6, 6, "#f3ead6");
      p(7, 13, 2, 2, OUT); // hub
      const a = (t / 4000) * Math.PI * 2;
      for (let r = 1; r <= 2; r++) p(7.5 + Math.round(Math.sin(a) * r), 13.5 - Math.round(Math.cos(a) * r), 1, 1, OUT);
    },
    arcade(p, t) { // giant joystick: buttons flash in turn, the ball glints
      const on = Math.floor(t / 300) % 2;
      p(11, 25, 2, 2, on ? "#fff59d" : "#ffca28"); p(3, 25, 2, 2, on ? "#58a8e8" : "#bbdefb");
      p(5 + Math.floor(t / 250) % 4, 4, 1, 1, "#ffffff");
    },
    gym(p, t) { // giant dumbbell: a glint slides across the plates
      const k = (t % 2400) / 2400;
      if (k < 0.5) { const y = 11 + Math.floor(k * 2 * 14); p(1, y, 3, 1, "#bbdefb"); p(12, y, 3, 1, "#bbdefb"); }
    },
    market(p, t) { // giant shopping bag: coins pop out now and then
      for (let i = 0; i < 2; i++) {
        const k = ((t / 1600) + i * 0.5) % 1;
        if (k > 0.6) continue;
        const y = 10 - k * 18, x = 5 + i * 5 + Math.sin(k * 6) * 2;
        p(x, y, 3, 3, `rgba(255,202,40,${1 - k / 0.6})`); p(x + 1, y + 1, 1, 1, `rgba(255,245,157,${1 - k / 0.6})`);
      }
    },
    cafe(p, t) { // giant coffee cup: steam keeps rising
      for (let i = 0; i < 3; i++) {
        const k = ((t / 1400) + i / 3) % 1;
        p(4 + i * 3 + Math.round(Math.sin(k * 6 + i) * 1.5), 5 - k * 10, 2, 2, `rgba(255,255,255,${0.9 * (1 - k)})`);
      }
    },
    pond(p, t, ctx, ox, oy, s) { // lighthouse: a beam sweeps back and forth
      const a = Math.sin(t / 900) * 1.1 + Math.PI; // pointing left over the water, sweeping
      const cx = ox + 8 * s, cy = oy + 6 * s, len = 60 * s, spread = 0.18;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
      g.addColorStop(0, "rgba(255,245,157,0.55)"); g.addColorStop(1, "rgba(255,245,157,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, len, a - spread, a + spread); ctx.closePath(); ctx.fill();
      p(5, 5, 6, 4, Math.floor(t / 400) % 2 ? "#fff59d" : "#ffffff");
    },
    garden(p, t) { // GPU silo: the chip pulses
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 300));
      p(6, 14, 4, 3, `rgba(200,170,255,${a})`);
    },
    plaza(p, t) { // golden fountain: drops arc out of the spout
      for (let i = 0; i < 6; i++) {
        const k = ((t / 900) + i / 6) % 1, side = i % 2 ? 1 : -1;
        const x = 15 + side * (2 + k * 9), y = 2 + (k - 0.45) * (k - 0.45) * 40 - 8;
        p(x, y, 2, 2, `rgba(255,236,140,${1 - k * 0.6})`);
      }
    },
    sandbox(p, t) { // palm tree: a coconut sways in the breeze
      const dx = Math.round(Math.sin(t / 700));
      p(6 + dx, 7, 2, 2, "#7a5230"); p(9 + dx, 7, 2, 2, "#7a5230");
    },
  };

  /** Where each place's level 3 landmark sits (top-left tile of its drawing). */
  function landmarkTile(init, id) {
    const b = init.buildings.find((x) => x.id === id);
    if (b) return [b.x - 1 - 2 / TS, b.y + b.h - 2]; // same 2px gap as drawUpgrades
    const step = OUTDOOR[id]?.[2]?.[0];
    return step ? [step[0], step[1]] : null;
  }

  /** Runpod HQ's moving parts below level 3: blinking pod lights, serverless workers. */
  function hqFx(ctx, b, lv, t, scale) {
    const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.ceil(w * scale), Math.ceil(h * scale)); };
    const X = b.x * TS, Y = b.y * TS;
    if (lv >= 1) { // Pods: each module's status light, a few busy at a time
      windowXs(b).forEach((wx, i) => {
        const on = Math.floor(t / 700 + i * 1.7) % 3;
        px(X + wx + 7, Y + b.h * TS - 9, 2, 1, on ? "#72c05c" : "#ffca28");
        px(X + wx + 2, Y + b.h * TS - 9, 1, 1, Math.floor(t / 300 + i) % 2 ? "#874BFF" : "#FCB1FF");
      });
    }
    if (lv >= 2) { // Serverless: workers scale up to three, then back down to zero
      const ox = (b.x + b.w) * TS + 2, oy = (b.y + b.h - 2) * TS;
      const k = (t % 8000) / 8000, n = Math.round(k < 0.5 ? k * 2 * 3 : (1 - k) * 2 * 3);
      for (let i = 0; i < Math.min(3, n); i++) { px(ox + 2 + i * 4, oy + 23, 4, 4, OUT); px(ox + 3 + i * 4, oy + 24, 2, 2, "#874BFF"); }
    }
  }

  /** Draw the animated touches for every landmark that is up (levels: { placeId: 0..3 }). */
  function drawLandmarkFx(ctx, init, levels, t, scale) {
    const hq = init.buildings.find((b) => b.id === "lab");
    if (hq) hqFx(ctx, hq, levels.lab || 0, t, scale);
    const arcade = init.buildings.find((b) => b.id === "arcade");
    if (arcade && (levels.arcade || 0) >= 3) { // marquee bulbs chase along the arcade's front
      const X = arcade.x * TS, y = arcade.y * TS + arcade.h * TS - WALL_H + 3;
      const step = Math.floor(t / 180);
      for (let x = 3, i = 0; x < arcade.w * TS - 3; x += 4, i++) {
        ctx.fillStyle = (i + step) % 3 ? "#fff59d" : "#ffffff";
        if ((i + step) % 3 !== 1) ctx.fillRect(Math.round((X + x) * scale), Math.round(y * scale), Math.ceil(scale), Math.ceil(scale));
      }
    }
    for (const id of Object.keys(FX)) {
      if ((levels[id] || 0) < 3) continue;
      const at = landmarkTile(init, id);
      if (!at) continue;
      const ox = at[0] * TS * scale, oy = at[1] * TS * scale;
      const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(ox + x * scale), Math.round(oy + y * scale), Math.ceil(w * scale), Math.ceil(h * scale)); };
      FX[id](p, t, ctx, ox, oy, scale);
    }
  }

  /** The bounding box (world pixels) of everything drawn on a canvas, or null. */
  function inkBox(c) {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (!d[(y * c.width + x) * 4 + 3]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }

  // ---------- seasons ----------
  // Seasonal decorations (game/season.js): a static layer drawn over the
  // upgrades, a roof layer drawn under the room cutaways (winter snow), and
  // small animations (twinkling lights, bats, butterflies) drawn every frame.

  /** Where a building's eaves are: the line where its roof meets the wall. */
  const eaveY = (b) => b.y * TS + b.h * TS - WALL_H;

  /** Seasonal decorations that sit on walls and ground. */
  function drawSeasonDecor(init, season) {
    const c = document.createElement("canvas");
    c.width = init.w * TS; c.height = init.h * TS;
    if (!season) return c;
    const ctx = c.getContext("2d");
    const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    if (season === "winter") {
      // snow caps on every tree
      for (let y = 0; y < init.h; y++) for (let x = 0; x < init.w; x++) {
        if (init.grid[y][x] !== T.TREE) continue;
        const X = x * TS, Y = y * TS;
        P(X + 4, Y + 1, 8, 2, "#ffffff"); P(X + 3, Y + 3, 3, 1, "#ffffff"); P(X + 10, Y + 3, 3, 1, "#ffffff"); P(X + 5, Y + 3, 6, 1, "#e4ecf7");
      }
      // a wreath on every door
      for (const b of init.buildings) {
        const X = b.door.x * TS, Y = (b.y + b.h) * TS - 17;
        P(X + 4, Y, 8, 8, "#2f6b3a"); P(X + 6, Y + 2, 4, 4, shade(b.color, 0.7)); P(X + 5, Y + 1, 2, 1, "#72c05c"); P(X + 7, Y + 6, 2, 2, "#e53935");
      }
    }
    if (season === "halloween") {
      for (const b of init.buildings) {
        // a jack-o'-lantern beside each door (its glow flickers in drawSeasonFx)
        const X = (b.door.x - 1) * TS, Y = (b.door.y + 1) * TS;
        P(X + 4, Y + 6, 9, 8, OUT); P(X + 5, Y + 7, 7, 6, "#ff7a1a"); P(X + 7, Y + 7, 1, 6, "#e0620d"); P(X + 10, Y + 7, 1, 6, "#e0620d");
        P(X + 8, Y + 4, 2, 3, "#3f8f4a");
        // cobwebs in the top corners of the wall
        const L = b.x * TS + 1, R = (b.x + b.w) * TS - 1, E = eaveY(b) + 1;
        for (let i = 0; i < 6; i++) { P(L + i, E + i, 1, 1, "#d6d6e0"); P(R - 1 - i, E + i, 1, 1, "#d6d6e0"); }
        P(L, E + 3, 4, 1, "#d6d6e0"); P(L + 3, E, 1, 4, "#d6d6e0"); P(R - 4, E + 3, 4, 1, "#d6d6e0"); P(R - 4, E, 1, 4, "#d6d6e0");
      }
    }
    if (season === "spring") {
      // flower garlands along the eaves
      const blooms = ["#ff8fb8", "#ffffff", "#ffe14d", "#c9a4ff"];
      for (const b of init.buildings) {
        const Y = eaveY(b) + 1;
        for (let x = 2, i = 0; x < b.w * TS - 3; x += 3, i++) {
          const sag = Math.round(Math.sin((x / (b.w * TS)) * Math.PI * 4) * 1.5 + 1.5);
          P(b.x * TS + x, Y + sag, 3, 1, "#3f8f4a");
          if (i % 2 === 0) P(b.x * TS + x, Y + sag + 1, 2, 2, blooms[(i / 2) % blooms.length]);
        }
      }
    }
    return c;
  }

  /** Seasonal touches on the roofs, drawn under the room cutaways (winter snow). */
  function drawSeasonRoofs(init, season) {
    const c = document.createElement("canvas");
    c.width = init.w * TS; c.height = init.h * TS;
    if (season !== "winter") return c;
    const ctx = c.getContext("2d");
    for (const b of init.buildings) {
      const X = b.x * TS, Y = b.y * TS, w = b.w * TS;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(X + 1, Y + 1, w - 2, 4);
      for (let x = 2; x < w - 3; x += 5) ctx.fillRect(X + x, Y + 5, 3, 1 + ((x * 7) % 4)); // icicle-ish drips
      ctx.fillStyle = "#e4ecf7";
      ctx.fillRect(X + 1, Y + 4, w - 2, 1);
      const eave = eaveY(b);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(X + 1, eave - 4, w - 2, 2); // snow along the bottom edge of the roof
    }
    return c;
  }

  /** Seasonal animations, drawn every frame in canvas pixels. */
  function drawSeasonFx(ctx, init, season, t, scale) {
    if (!season) return;
    const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.ceil(w * scale), Math.ceil(h * scale)); };
    const W = init.w * TS, H = init.h * TS;
    if (season === "winter") { // string lights along the eaves, twinkling in turn
      const cols = ["#e53935", "#ffca28", "#43a047", "#1e88e5", "#FCB1FF"];
      const step = Math.floor(t / 450);
      for (const b of init.buildings) {
        const Y = eaveY(b) + 1;
        for (let x = 3, i = 0; x < b.w * TS - 3; x += 5, i++) {
          const sag = Math.round(Math.sin((x / (b.w * TS)) * Math.PI * 4) + 1);
          px(b.x * TS + x, Y + sag, 1, 1, "#2a2233");
          if ((i + step) % 4 !== 0) px(b.x * TS + x, Y + sag + 1, 2, 2, cols[(i + b.x) % cols.length]);
        }
      }
    }
    if (season === "halloween") {
      ctx.fillStyle = "rgba(45,15,70,0.22)"; // a spooky dusk over the town
      ctx.fillRect(0, 0, W * scale, H * scale);
      for (const b of init.buildings) { // lantern glow flickers
        const X = (b.door.x - 1) * TS, Y = (b.door.y + 1) * TS;
        const on = Math.sin(t / 90 + b.x) > -0.6;
        const g = ctx.createRadialGradient((X + 8.5) * scale, (Y + 10) * scale, 0, (X + 8.5) * scale, (Y + 10) * scale, 14 * scale);
        g.addColorStop(0, on ? "rgba(255,180,60,0.45)" : "rgba(255,150,40,0.3)"); g.addColorStop(1, "rgba(255,150,40,0)");
        ctx.fillStyle = g; ctx.fillRect((X - 6) * scale, (Y - 4) * scale, 29 * scale, 29 * scale);
        px(X + 6, Y + 9, 2, 2, on ? "#fff176" : "#ffb74d"); px(X + 9, Y + 9, 2, 2, on ? "#fff176" : "#ffb74d"); px(X + 7, Y + 11, 3, 1, on ? "#fff176" : "#ffb74d");
      }
      for (let i = 0; i < 5; i++) { // bats flap across the sky
        const k = ((t / 14000) + i / 5) % 1;
        const x = k * (W + 40) - 20, y = 20 + i * 38 + Math.sin(t / 500 + i * 2) * 10;
        const flap = Math.floor(t / 120 + i) % 2;
        px(x, y, 4, 3, "#1b1530"); px(x + 1, y + 1, 1, 1, "#ff7a1a"); px(x + 2, y + 1, 1, 1, "#ff7a1a");
        px(x - 5, y - (flap ? 3 : 0), 5, 2, "#1b1530"); px(x + 4, y - (flap ? 3 : 0), 5, 2, "#1b1530");
      }
    }
    if (season === "spring") { // butterflies flutter about
      const cols = ["#ffca28", "#FCB1FF", "#58a8e8", "#ffffff"];
      for (let i = 0; i < 7; i++) {
        const x = ((i * 113 + t / 60) % W + W) % W, y = (i * 61) % (H - 40) + 20 + Math.sin(t / 700 + i) * 12;
        const open = Math.floor(t / 150 + i) % 2;
        px(x, y, 1, 3, "#2a2233");
        px(x - (open ? 3 : 1), y, open ? 3 : 1, 2, cols[i % cols.length]); px(x + 1, y, open ? 3 : 1, 2, cols[i % cols.length]);
      }
    }
  }

  // ---------- statues ----------
  // Raffle winners stand on plinths around the Plaza, carved in stone.
  const STATUE_SPOTS = [[20, 12], [27, 12], [20, 16], [27, 16]];
  const statues = new Map();
  /** A 16x32 statue of `look`: the character in stone on a plinth (feet at y 21). */
  function statueSprite(look) {
    const key = JSON.stringify(look);
    let c = statues.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = TS; c.height = TS * 2;
    const ctx = c.getContext("2d");
    drawSprite(ctx, 0, 6, look, 0, 0);
    const img = ctx.getImageData(0, 0, TS, TS * 2);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      const v = 0.32 + 0.68 * lum;
      d[i] = 214 * v; d[i + 1] = 208 * v; d[i + 2] = 196 * v;
    }
    ctx.putImageData(img, 0, 0);
    const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    p(1, 21, 14, 10, OUT); p(2, 22, 12, 8, "#b7b0a4"); p(2, 22, 12, 2, "#d6d0c4"); p(5, 25, 6, 3, "#ffca28");
    if (statues.size > 50) statues.clear();
    statues.set(key, c);
    return c;
  }

  window.Art = { TS, SKIN, HAIRC, SHIRT, PANTS, HAIRS, ACCS, drawSprite, spriteSheet, bakeWorld, roofRect, seatsFor, bakeInterior, drawUpgrades, drawRoofUpgrades, drawLandmarkFx, drawSeasonDecor, drawSeasonRoofs, drawSeasonFx, inkBox, statueSprite, STATUE_SPOTS };
})();
