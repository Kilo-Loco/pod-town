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
      const wallH = 28;
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

  window.Art = { TS, SKIN, HAIRC, SHIRT, PANTS, HAIRS, ACCS, drawSprite, spriteSheet, bakeWorld };
})();
