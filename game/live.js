// Live weather: a real city's current conditions from Open-Meteo
// (https://open-meteo.com), which is free and needs no API key. Only the city
// name and its coordinates leave the server; nothing about players does.

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const NOW = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 8000;

/**
 * WMO weather codes (what Open-Meteo reports) mapped to Pod Town's conditions.
 * https://open-meteo.com/en/docs#weathervariables
 */
export function conditionOf(code) {
  if (code <= 1) return "clear"; // clear, mainly clear
  if (code === 2) return "clear"; // partly cloudy: still mostly sun
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  return "rain"; // drizzle, rain, freezing rain, showers, thunderstorms
}

async function getJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`the weather service answered ${res.status}.`);
  return res.json();
}

/**
 * Find a city. "Portland, US" or "Portland, Maine" narrows it down: the part
 * after the comma is matched against the country code, country or region.
 * Returns { place, lat, lon } or throws with a message for the admin page.
 */
export async function findCity(query) {
  const [name, ...rest] = query.split(",").map((s) => s.trim()).filter(Boolean);
  if (!name) throw new Error("type a city name.");
  const hint = rest.join(" ").toLowerCase();
  const url = `${GEO}?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;
  const results = (await getJSON(url)).results || [];
  const match = !hint ? results[0] : results.find((r) =>
    [r.country_code, r.country, r.admin1].some((v) => v && v.toLowerCase() === hint)
  ) || results.find((r) => [r.country, r.admin1].some((v) => v && v.toLowerCase().startsWith(hint)));
  if (!match) throw new Error(`no city called "${query}" was found. Try adding the country, e.g. "Portland, US".`);
  // "Tokyo, JP" rather than "Tokyo, Tokyo, JP"
  const where = [match.admin1 !== match.name && match.admin1, match.country_code].filter(Boolean).join(", ");
  return { place: where ? `${match.name}, ${where}` : match.name, lat: match.latitude, lon: match.longitude };
}

/** Current conditions at a spot: { cond, code, tempC, isDay }. */
export async function currentAt(lat, lon) {
  const url = `${NOW}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,is_day`;
  const cur = (await getJSON(url)).current;
  if (!cur || typeof cur.weather_code !== "number") throw new Error("the weather service sent no current conditions.");
  return { cond: conditionOf(cur.weather_code), code: cur.weather_code, tempC: cur.temperature_2m, isDay: cur.is_day === 1 };
}
