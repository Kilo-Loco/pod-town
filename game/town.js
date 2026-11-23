// Town upgrades: each hour, the place where players earned the most raffle
// tickets gets built up at the raffle, and the raffle winner gets a statue in
// the Plaza. Upgrades are decorations only: they never change where anyone can
// walk, and they don't affect raffle odds.
//
// Booth staff can switch each feature off or set it by hand on the admin page.
// Environment variables give the starting setting for an event; anything
// changed on the admin page overrides them and is saved with the town.

// Names of each place's three upgrades, in order. The big screen draws them
// (public/art.js, drawUpgrades) and announces them by these names.
export const UPGRADES = {
  lab: ["Pods", "Serverless", "Instant Clusters"], // Runpod's own products, in order
  gym: ["Flower boxes", "Weight bench", "Giant dumbbell"],
  library: ["Flower boxes", "Book cart", "Clock tower"],
  arcade: ["Flower boxes", "Claw machine", "Giant joystick"],
  market: ["Flower boxes", "Swag cart", "Giant shopping bag"],
  cafe: ["Flower boxes", "Coffee cart", "Giant coffee cup"],
  sandbox: ["Beach umbrella", "Bucket and spade", "Palm tree"],
  pond: ["Wooden dock", "Rowboat", "Lighthouse"],
  garden: ["Scarecrow", "Sunflowers", "GPU silo"],
  plaza: ["Benches", "Bunting", "Golden fountain"],
};
export const PLACES = Object.keys(UPGRADES);
export const MAX_LEVEL = 3;
export const STATUE_SLOTS = 4;
export const MODES = ["auto", "manual", "off"];

const level = (v) => Math.max(0, Math.min(MAX_LEVEL, Math.floor(Number(v) || 0)));

export class Town {
  /** defaults: { mode, statues } from environment variables. */
  constructor(defaults, saved) {
    this.defaults = defaults;
    this.override = {}; // settings changed on the admin page
    if (MODES.includes(saved?.override?.mode)) this.override.mode = saved.override.mode;
    if (typeof saved?.override?.statues === "boolean") this.override.statues = saved.override.statues;
    this.levels = Object.fromEntries(PLACES.map((id) => [id, level(saved?.levels?.[id])]));
    this.score = {}; // tickets earned at each place since the last raffle
    for (const id of PLACES) if (saved?.score?.[id] > 0) this.score[id] = saved.score[id];
    // who earned those tickets: { placeId: { playerId: { name, tickets } } }
    this.builders = saved?.builders && typeof saved.builders === "object" ? saved.builders : {};
    this.statues = (saved?.statues || []).slice(-STATUE_SLOTS);
    this.last = saved?.last || null; // most recent upgrade: { loc, level, name, at, by, more }
    // highest level each place has ever reached (see canUnlock)
    this.best = Object.fromEntries(PLACES.map((id) => [id, Math.max(this.levels[id], level(saved?.best?.[id]))]));
  }

  /**
   * Whether a place's next upgrade is a new one. A place an admin lowered
   * stays as set: the town project only ever unlocks upgrades nobody has seen.
   */
  canUnlock(id) { return this.levels[id] < MAX_LEVEL && this.levels[id] >= this.best[id]; }

  /** True while some place still has an upgrade to unlock. */
  get open() { return PLACES.some((id) => this.canUnlock(id)); }

  get mode() { return this.override.mode ?? this.defaults.mode; }
  get statuesOn() { return this.override.statues ?? this.defaults.statues; }

  /** Player `who` ({ id, name }) finished an activity at `loc` and earned `tickets`. */
  credit(loc, tickets, who) {
    if (this.mode !== "auto" || !Object.hasOwn(this.levels, loc) || !this.canUnlock(loc)) return;
    this.score[loc] = (this.score[loc] || 0) + tickets;
    if (!who) return;
    const list = (this.builders[loc] ||= {});
    const b = (list[who.id] ||= { name: who.name, tickets: 0 });
    b.name = who.name;
    b.tickets += tickets;
  }

  /** Places still able to upgrade, busiest first. */
  leaders() {
    return PLACES
      .filter((id) => this.score[id] > 0 && this.canUnlock(id))
      .map((id) => [id, this.score[id]])
      .sort((a, b) => b[1] - a[1]);
  }

  /**
   * At each raffle: upgrade the busiest place (a tie is settled at random)
   * and put the winner on a statue. Returns the upgrade, or null. The upgrade
   * credits its builders: `by` names the top three by tickets, `more` counts
   * the rest, and `ids` (not saved or shown) lists everyone who helped.
   */
  onRaffle(now, winner) {
    let up = null;
    const top = this.leaders();
    if (this.mode === "auto" && top.length) {
      const tied = top.filter(([, s]) => s === top[0][1]);
      const loc = tied[Math.floor(Math.random() * tied.length)][0];
      const lv = ++this.levels[loc];
      this.best[loc] = lv;
      const crew = Object.entries(this.builders[loc] || {}).sort((a, b) => b[1].tickets - a[1].tickets);
      const by = crew.slice(0, 3).map(([, b]) => b.name);
      this.last = { loc, level: lv, name: UPGRADES[loc][lv - 1], at: now, by, more: crew.length - by.length };
      up = { ...this.last, ids: crew.map(([id]) => id) };
    }
    this.score = {};
    this.builders = {};
    if (winner && this.statuesOn) {
      this.statues.push({ name: winner.name, look: winner.look, at: now });
      this.statues = this.statues.slice(-STATUE_SLOTS);
    }
    return up;
  }

  serialize() {
    return {
      override: this.override, levels: this.levels, best: this.best, score: this.score,
      builders: this.builders, statues: this.statues, last: this.last,
    };
  }

  /** What the big screen needs; features that are off are left out. */
  feed() {
    const out = {};
    if (this.mode !== "off") {
      out.lv = this.levels;
      out.up = this.last;
    }
    if (this.mode === "auto" && this.open) out.sc = this.leaders().slice(0, 3);
    if (this.statuesOn && this.statues.length) out.st = this.statues.map((s) => ({ n: s.name, l: s.look }));
    return out;
  }

  /** The phone's "town project" line: only while upgrades run on their own. */
  project(playerId) {
    if (this.mode !== "auto" || !this.open) return null;
    // the places this player has put tickets into this round, most first
    const mine = PLACES
      .filter((id) => this.builders[id]?.[playerId])
      .map((id) => [id, this.builders[id][playerId].tickets])
      .sort((a, b) => b[1] - a[1]);
    return { leaders: this.leaders().slice(0, 2), mine };
  }

  adminView() {
    return {
      mode: this.mode, statues: this.statuesOn, defaults: this.defaults, override: this.override,
      levels: this.levels, score: this.score, names: UPGRADES, maxLevel: MAX_LEVEL,
      statueList: this.statues.map((s) => ({ name: s.name, at: s.at })),
    };
  }

  /** Changes from the admin page. Returns an error message, or null. */
  apply(b) {
    if (b.useDefaults) this.override = {};
    if (b.mode !== undefined) {
      if (!MODES.includes(b.mode)) return "Unknown upgrade mode.";
      this.override.mode = b.mode;
      if (b.mode !== "auto") { this.score = {}; this.builders = {}; }
    }
    if (b.statues !== undefined) this.override.statues = !!b.statues;
    if (b.levels && typeof b.levels === "object") {
      for (const [id, v] of Object.entries(b.levels)) {
        if (!Object.hasOwn(this.levels, id)) continue;
        this.levels[id] = level(v);
        this.best[id] = Math.max(this.best[id], this.levels[id]); // set by hand counts as unlocked
      }
    }
    if (b.reset) { for (const id of PLACES) { this.levels[id] = 0; this.best[id] = 0; } this.score = {}; this.builders = {}; this.last = null; }
    if (b.clearStatues) this.statues = [];
    return null;
  }
}
