export interface City {
  name: string;
  lat: number;
  lon: number;
}

export type WeatherKind = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface Weather {
  tempC: number;
  feelsC: number;
  maxC: number;
  minC: number;
  code: number;
  kind: WeatherKind;
  emoji: string;
  precipProb: number;
  /** true when rain/snow is falling or likely */
  rain: boolean;
  isDay: boolean;
}

/** WMO weather interpretation codes used by Open-Meteo. */
export function describeCode(
  code: number,
  isDay = true,
): { kind: WeatherKind; emoji: string; wet: boolean } {
  if (code === 0) return { kind: "clear", emoji: isDay ? "☀️" : "🌙", wet: false };
  if (code <= 3)
    return {
      kind: "cloudy",
      emoji: code === 1 ? (isDay ? "🌤️" : "🌙") : code === 2 ? "⛅" : "☁️",
      wet: false,
    };
  if (code === 45 || code === 48) return { kind: "fog", emoji: "🌫️", wet: false };
  if (code >= 51 && code <= 57) return { kind: "drizzle", emoji: "🌦️", wet: true };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { kind: "rain", emoji: "🌧️", wet: true };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { kind: "snow", emoji: "❄️", wet: true };
  if (code >= 95) return { kind: "storm", emoji: "⛈️", wet: true };
  return { kind: "cloudy", emoji: "☁️", wet: false };
}

interface ForecastResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

/** Parse an Open-Meteo forecast payload (pure, throws on malformed data). */
export function parseForecast(json: unknown): Weather {
  const r = json as ForecastResponse;
  const cur = r?.current;
  if (!cur || typeof cur.temperature_2m !== "number")
    throw new Error("Unexpected weather response");
  const code = cur.weather_code ?? 0;
  const isDay = cur.is_day !== 0;
  const info = describeCode(code, isDay);
  const precipProb = r.daily?.precipitation_probability_max?.[0] ?? 0;
  const tempC = cur.temperature_2m;
  return {
    tempC,
    feelsC: cur.apparent_temperature ?? tempC,
    maxC: r.daily?.temperature_2m_max?.[0] ?? tempC,
    minC: r.daily?.temperature_2m_min?.[0] ?? tempC,
    code,
    kind: info.kind,
    emoji: info.emoji,
    precipProb,
    rain: info.wet || precipProb >= 50,
    isDay,
  };
}

export async function fetchWeather(city: City, fetchImpl: typeof fetch = fetch): Promise<Weather> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    "&current=temperature_2m,apparent_temperature,weather_code,is_day" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=1";
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  return parseForecast(await res.json());
}

interface GeoResponse {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    country?: string;
  }[];
}

export async function searchCity(
  query: string,
  lang: string,
  fetchImpl: typeof fetch = fetch,
): Promise<(City & { detail: string })[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=${lang}&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const json = (await res.json()) as GeoResponse;
  return (json.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    detail: [r.admin1, r.country].filter(Boolean).join(", "),
  }));
}

export function locate(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new Error(e.message)),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

export const cToF = (c: number) => (c * 9) / 5 + 32;

export function formatTemp(c: number, units: "metric" | "imperial"): string {
  return units === "imperial" ? `${Math.round(cToF(c))}°F` : `${Math.round(c)}°C`;
}
