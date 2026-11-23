// Seasonal themes: decorations on the big screen plus one limited-time
// activity each. Staff pick one on the admin page (or SEASON on the Pod), or
// let the date decide. Like the other town settings, changes made on the
// admin page override the environment variable and are saved with the town.

export const SEASONS = {
  // act must match the activity's id and name in game/sim.js
  winter: { name: "Winter", icon: "❄️", act: "snowman", actName: "⛄ Build a snowman at the Plaza" },
  halloween: { name: "Halloween", icon: "🎃", act: "pumpkin", actName: "🎃 Carve a pumpkin at the GPU Farm" },
  spring: { name: "Spring", icon: "🌷", act: "kite", actName: "🪁 Fly a kite at the Sandbox" },
};
export const SEASON_MODES = ["off", "auto", ...Object.keys(SEASONS)];

/**
 * The season for a date when set to auto (northern hemisphere): Halloween
 * through October, winter from December to February, spring from 20 March to
 * the end of May, and no theme the rest of the year.
 */
export function seasonFor(date) {
  const m = date.getMonth() + 1, d = date.getDate();
  if (m === 10) return "halloween";
  if (m === 12 || m <= 2) return "winter";
  if ((m === 3 && d >= 20) || m === 4 || m === 5) return "spring";
  return null;
}

export class Season {
  /** defaults: { mode } from the SEASON environment variable. */
  constructor(defaults, saved) {
    this.defaults = defaults;
    this.override = {};
    if (SEASON_MODES.includes(saved?.override?.mode)) this.override.mode = saved.override.mode;
  }

  get mode() { return this.override.mode ?? this.defaults.mode; }

  /** The season showing now ("winter", ...), or null for none. */
  current(now = new Date()) {
    if (this.mode === "off") return null;
    if (this.mode === "auto") return seasonFor(now);
    return this.mode;
  }

  /** The limited-time activity running now, or null. */
  get activity() {
    const s = this.current();
    return s ? SEASONS[s].act : null;
  }

  /** Whether an activity can be chosen now (seasonal ones only in their season). */
  allows(act) {
    return !act.season || act.season === this.current();
  }

  serialize() { return { override: this.override }; }

  feed() {
    const s = this.current();
    return s ? { id: s, ...SEASONS[s] } : null;
  }

  adminView() {
    return { mode: this.mode, current: this.current(), defaults: this.defaults, override: this.override, seasons: SEASONS };
  }

  /** Changes from the admin page. Returns an error message, or null. */
  apply(b) {
    if (b.useDefaults) this.override = {};
    if (b.mode !== undefined) {
      if (!SEASON_MODES.includes(b.mode)) return "Unknown season.";
      this.override.mode = b.mode;
    }
    return null;
  }
}
