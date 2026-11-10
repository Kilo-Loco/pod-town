// Town map: generated deterministically so server (collision/pathfinding) and
// display (rendering) always agree. Tiles are 16px; the map is 48x30 tiles.

export const W = 48;
export const H = 30;

export const T = {
  GRASS: 0, FLOWER: 1, PATH: 2, WATER: 3, TREE: 4, BUILDING: 5,
  DOOR: 6, FENCE: 7, SOIL: 8, FOUNTAIN: 9, TABLE: 10, PLAZA: 11, SAND: 12,
};

const WALKABLE = new Set([T.GRASS, T.FLOWER, T.PATH, T.DOOR, T.PLAZA, T.SAND]);

// dir: 0 down, 1 left, 2 right, 3 up
export const BUILDINGS = [
  { id: "library", name: "Library", x: 5, y: 3, w: 7, h: 6, color: "#c0504d" },
  { id: "cafe", name: "Cache Cafe", x: 14, y: 4, w: 5, h: 5, color: "#d98e3a" },
  { id: "arcade", name: "Benchmark Arcade", x: 29, y: 4, w: 5, h: 5, color: "#d94f9a" },
  { id: "lab", name: "Runpod HQ", x: 36, y: 3, w: 8, h: 6, color: "#5D29F0" },
  { id: "gym", name: "Training Gym", x: 13, y: 18, w: 6, h: 4, color: "#3f7fbf" },
  { id: "market", name: "Swag Shop", x: 27, y: 18, w: 5, h: 4, color: "#3a9d6a" },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build() {
  const g = Array.from({ length: H }, () => Array(W).fill(T.GRASS));
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, t) => { if (inb(x, y)) g[y][x] = t; };
  const rect = (x, y, w, h, t) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, t);
  };

  // forest border
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x < 2 || x >= W - 2 || y < 2 || y >= H - 2) g[y][x] = T.TREE;
  }

  // roads
  rect(2, 14, 44, 2, T.PATH); // main street
  rect(23, 16, 2, 8, T.PATH); // south avenue
  rect(16, 23, 14, 1, T.PATH); // south cross street

  // sandbox: a sand pit north of the plaza, with a short path up to it
  rect(23, 8, 2, 3, T.PATH);
  rect(21, 5, 6, 3, T.SAND);
  const sandSpots = [];
  for (let y = 5; y <= 7; y++) for (let x = 21; x <= 26; x++) {
    if (!(x === 26 && y === 5)) sandSpots.push({ x, y, dir: 0 }); // corner holds the sandcastle
  }

  // plaza + fountain
  rect(19, 11, 10, 7, T.PLAZA);
  rect(23, 14, 2, 2, T.FOUNTAIN);

  // buildings, doors and their footpaths
  const locs = {};
  for (const b of BUILDINGS) {
    rect(b.x, b.y, b.w, b.h, T.BUILDING);
    const dx = b.x + Math.floor(b.w / 2);
    const dy = b.y + b.h - 1;
    set(dx, dy, T.DOOR);
    b.door = { x: dx, y: dy };
    if (dy < 14) for (let y = dy + 1; y < 14; y++) set(dx, y, T.PATH);
    else set(dx, dy + 1, T.PATH);
    locs[b.id] = {
      name: b.name, indoor: true,
      spots: [{ x: dx, y: dy, dir: 3 }],
      label: { x: b.x + b.w / 2, y: b.y },
    };
  }

  locs.sandbox = { name: "Sandbox", indoor: false, spots: sandSpots, label: { x: 24, y: 3.9 } };

  // cafe patio
  set(14, 10, T.TABLE); set(18, 10, T.TABLE);
  locs.cafe.indoor = false;
  locs.cafe.spots = [
    { x: 13, y: 10, dir: 2 }, { x: 15, y: 10, dir: 1 },
    { x: 17, y: 10, dir: 2 }, { x: 19, y: 10, dir: 1 },
  ];

  // pond
  const cx = 7.5, cy = 22.5, rx = 4.4, ry = 3.3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ex = (x + 0.5 - cx) / rx, ey = (y + 0.5 - cy) / ry;
    if (ex * ex + ey * ey <= 1) g[y][x] = T.WATER;
  }

  // garden
  for (let x = 34; x <= 44; x++) { set(x, 18, T.FENCE); set(x, 26, T.FENCE); }
  for (let y = 18; y <= 26; y++) { set(34, y, T.FENCE); set(44, y, T.FENCE); }
  set(40, 18, T.PATH); set(40, 16, T.PATH); set(40, 17, T.PATH);
  const gardenSpots = [];
  for (const row of [20, 22, 24]) {
    for (let x = 36; x <= 42; x++) {
      set(x, row, T.SOIL);
      gardenSpots.push({ x, y: row + 1, dir: 3 });
    }
  }
  locs.garden = { name: "GPU Farm", indoor: false, spots: gardenSpots, label: { x: 39.5, y: 18 } };

  // decoration: flowers and lone trees (a lone tree surrounded by open grass
  // can never cut off a route)
  const rnd = mulberry32(20261109);
  const isOpen = (x, y) => inb(x, y) && (g[y][x] === T.GRASS || g[y][x] === T.FLOWER);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (g[y][x] !== T.GRASS) continue;
    const r = rnd();
    if (r < 0.07) { g[y][x] = T.FLOWER; continue; }
    if (r < 0.105) {
      let ok = true;
      for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) {
        if ((i || j) && !isOpen(x + i, y + j)) { ok = false; break; }
      }
      if (ok) g[y][x] = T.TREE;
    }
  }

  // fishing spots: open ground directly next to water
  const pondSpots = [];
  const adj = [[0, 1, 0], [-1, 0, 1], [1, 0, 2], [0, -1, 3]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isOpen(x, y)) continue;
    for (const [dx, dy, dir] of adj) {
      if (inb(x + dx, y + dy) && g[y + dy][x + dx] === T.WATER) {
        pondSpots.push({ x, y, dir }); break;
      }
    }
  }
  locs.pond = { name: "Data Lake", indoor: false, spots: pondSpots, label: { x: cx, y: cy - ry - 0.6 } };

  // plaza: gather round the fountain
  const plazaSpots = [];
  for (let y = 13; y <= 16; y++) { plazaSpots.push({ x: 22, y, dir: 2 }); plazaSpots.push({ x: 25, y, dir: 1 }); }
  for (let x = 23; x <= 24; x++) { plazaSpots.push({ x, y: 13, dir: 0 }); plazaSpots.push({ x, y: 16, dir: 3 }); }
  locs.plaza = { name: "Plaza", indoor: false, spots: plazaSpots, label: { x: 24, y: 11 } };

  return { grid: g, locs };
}

const built = build();
export const grid = built.grid;
export const locs = built.locs;
export const SPAWN = { x: 21, y: 12 };

export function walkable(x, y) {
  return x >= 0 && y >= 0 && x < W && y < H && WALKABLE.has(grid[y][x]);
}

const DIRS = [[0, 1], [-1, 0], [1, 0], [0, -1]];

export function dirOf(dx, dy) {
  if (dy > 0) return 0;
  if (dx < 0) return 1;
  if (dx > 0) return 2;
  return 3;
}

/** BFS shortest path. Returns array of [x,y] steps excluding the start, or null. */
export function findPath(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return [];
  if (!walkable(tx, ty)) return null;
  const prev = new Int32Array(W * H).fill(-1);
  const start = sy * W + sx, goal = ty * W + tx;
  prev[start] = start;
  const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (cur === goal) break;
    const x = cur % W, y = (cur - x) / W;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(nx, ny)) continue;
      const n = ny * W + nx;
      if (prev[n] !== -1) continue;
      prev[n] = cur;
      q.push(n);
    }
  }
  if (prev[goal] === -1) return null;
  const out = [];
  for (let c = goal; c !== start; c = prev[c]) out.push([c % W, (c - (c % W)) / W]);
  return out.reverse();
}

// sanity check at startup: every activity spot must be reachable from spawn
for (const [id, loc] of Object.entries(locs)) {
  if (!loc.spots.length) throw new Error(`location ${id} has no spots`);
  for (const s of loc.spots) {
    if (!findPath(SPAWN.x, SPAWN.y, s.x, s.y)) {
      throw new Error(`spot ${id} (${s.x},${s.y}) unreachable`);
    }
  }
}
