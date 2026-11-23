// Weather over Pod Town. Mostly for looks: the big screen draws it as a light
// overlay and phones mention it. An optional boost doubles the tickets for one
// activity that suits the weather; it is off unless staff switch it on,
// because it is the only part that changes raffle odds.
//
// Modes:
//   off     no weather
//   auto    a new condition at each raffle
//   fixed   staff pick one condition
//   live    a real city's current conditions (see live.js)
// Environment variables give each event's starting setting; anything changed
// on the admin page overrides them and is saved with the town.

import { currentAt, findCity } from "./live.js";

export const CONDITIONS = ["clear", "overcast", "rain", "snow", "fog", "blossoms"];
const LIVE_EVERY_MS = 15 * 60000; // how often live weather is refreshed
const LIVE_RETRY_MS = 2 * 60000; // and how soon after a failed lookup it tries again
export const WEATHER_MODES = ["off", "auto", "fixed", "live"];

/** What each condition looks like in words, and the activity it boosts. */
export const INFO = {
  clear: { icon: "☀️", text: "It's sunny in Pod Town", boost: "sandbox" },
  overcast: { icon: "☁️", text: "It's cloudy in Pod Town", boost: "read" },
  rain: { icon: "🌧️", text: "It's raining in Pod Town", boost: "data" },
  snow: { icon: "❄️", text: "It's snowing in Pod Town", boost: "warmup" },
  fog: { icon: "🌫️", text: "It's foggy in Pod Town", boost: "benchmark" },
  blossoms: { icon: "🌸", text: "Blossoms are drifting through Pod Town", boost: "farm" },
};

const isCond = (c) => CONDITIONS.includes(c);

export class Weather {
  /** defaults: { mode, fixed, city, boost } from environment variables. */
  constructor(defaults, saved) {
    this.defaults = defaults;
    this.override = {};
    const o = saved?.override || {};
    if (WEATHER_MODES.includes(o.mode)) this.override.mode = o.mode;
    if (isCond(o.fixed)) this.override.fixed = o.fixed;
    if (typeof o.city === "string") this.override.city = o.city;
    if (typeof o.boost === "boolean") this.override.boost = o.boost;
    this.auto = isCond(saved?.auto) ? saved.auto : "clear"; // auto mode's current condition
    // live weather: { city, place, lat, lon, cond, tempC, isDay, at, error? }
    this.live = saved?.live || null;
    this.fetching = false;
  }

  /**
   * Live mode: look the city's weather up again when it is due (every 15
   * minutes, or 2 after a failure), or straight away with force. A failure
   * keeps the last known conditions and records the error for the admin page.
   * Returns true if anything changed.
   */
  async refreshLive(force = false) {
    if (this.mode !== "live" || !this.city || this.fetching) return false;
    const same = this.live?.city === this.city;
    const wait = this.live?.error ? LIVE_RETRY_MS : LIVE_EVERY_MS;
    if (!force && same && Date.now() - this.live.at < wait) return false;
    this.fetching = true;
    const city = this.city;
    try {
      // the city's spot is looked up once and reused
      const spot = same && this.live.lat != null ? this.live : await findCity(city);
      const now = await currentAt(spot.lat, spot.lon);
      if (city !== this.city) return false; // staff changed the city meanwhile
      this.live = { city, place: spot.place, lat: spot.lat, lon: spot.lon, ...now, at: Date.now() };
    } catch (e) {
      if (city !== this.city) return false;
      const error = e?.name === "TimeoutError" ? "the weather service didn't answer in time."
        : e instanceof TypeError ? "couldn't reach the weather service." : e.message;
      this.live = { ...(same ? this.live : { city }), error, at: Date.now() };
      console.error(`[weather] live lookup for "${city}" failed: ${error}`);
    } finally {
      this.fetching = false;
    }
    return true;
  }

  get mode() { return this.override.mode ?? this.defaults.mode; }
  get fixed() { return this.override.fixed ?? this.defaults.fixed; }
  get city() { return this.override.city ?? this.defaults.city; }
  get boostOn() { return this.override.boost ?? this.defaults.boost; }

  /** The condition the town shows right now, or null when weather is off. */
  get current() {
    switch (this.mode) {
      case "auto": return this.auto;
      case "fixed": return this.fixed;
      case "live": return (this.live?.city === this.city && this.live.cond) || "clear"; // until a lookup lands
      default: return null;
    }
  }

  /** The activity whose tickets are doubled right now, or null. */
  get boosted() {
    const c = this.current;
    return c && this.boostOn ? INFO[c].boost : null;
  }

  /** At each raffle, auto mode moves on to a different condition. */
  onRaffle() {
    if (this.mode !== "auto") return;
    const next = CONDITIONS.filter((c) => c !== this.auto);
    this.auto = next[Math.floor(Math.random() * next.length)];
  }

  serialize() {
    return { override: this.override, auto: this.auto, live: this.live };
  }

  /** For the big screen and phones; null when weather is off. */
  feed() {
    const c = this.current;
    if (!c) return null;
    // in live mode, say which real place the weather comes from
    const where = this.mode === "live" && this.live?.place && !this.live.error ? this.live.place.split(",")[0] : null;
    return { c, icon: INFO[c].icon, text: INFO[c].text + (where ? `, just like in ${where}` : ""), boost: this.boosted, where };
  }

  adminView() {
    return {
      mode: this.mode, fixed: this.fixed, city: this.city, boost: this.boostOn,
      current: this.current, live: this.live, defaults: this.defaults, override: this.override,
      conditions: CONDITIONS,
    };
  }

  /** Changes from the admin page. Returns an error message, or null. */
  apply(b) {
    if (b.useDefaults) this.override = {};
    if (b.mode !== undefined) {
      if (!WEATHER_MODES.includes(b.mode)) return "Unknown weather mode.";
      this.override.mode = b.mode;
    }
    if (b.fixed !== undefined) {
      if (!isCond(b.fixed)) return "Unknown weather.";
      this.override.fixed = b.fixed;
    }
    if (b.city !== undefined) {
      const city = String(b.city).trim().slice(0, 80);
      if (city !== this.city) this.live = null; // a new city needs a fresh lookup
      this.override.city = city;
    }
    if (b.boost !== undefined) this.override.boost = !!b.boost;
    return null;
  }
}
