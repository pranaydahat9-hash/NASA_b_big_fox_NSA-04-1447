// Pure, testable hazard scoring. Rule-based thresholds drawn from published agency criteria
// (IMD rainfall categories, IMD heat-wave criteria, Beaufort/IMD wind classes, USGS magnitude scale).
export type Level = "low" | "medium" | "high";
export type HazardType = "flood" | "heavy_rain" | "heatwave" | "storm" | "earthquake" | "tsunami" | "wildfire" | "landslide";

export interface Reading {
  label: string;
  value: string;
  observedAt: string | null; // ISO timestamp of the reading/model run
  source: string;
  url: string;
}

export interface Hazard {
  type: HazardType;
  level: Level;
  score: number; // 0-100
  peakAt: string | null; // ISO date of expected peak
  window: string; // human description
  harm: string;
  relevance: string;
  radiusKm: number;
  areaKm2: number;
  readings: Reading[];
}

export const LEVEL_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };

export function maxLevel(levels: Level[]): Level {
  return levels.reduce<Level>((a, b) => (LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a), "low");
}

const circle = (r: number) => Math.round(Math.PI * r * r);
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

/** IMD: heavy rain ≥64.5 mm/day, very heavy ≥115.6, extremely heavy ≥204.5 */
export function rainLevel(maxDailyMm: number): Level {
  if (maxDailyMm >= 115.6) return "high";
  if (maxDailyMm >= 64.5) return "medium";
  return "low";
}

/** River discharge ratio vs recent median, plus 72 h rain. */
export function floodLevel(dischargeRatio: number | null, rain72hMm: number): Level {
  if ((dischargeRatio ?? 0) >= 3 || rain72hMm >= 200) return "high";
  if ((dischargeRatio ?? 0) >= 1.8 || rain72hMm >= 100) return "medium";
  return "low";
}

/** IMD heat-wave: Tmax ≥40 °C plains; severe ≥45 °C (or ≥47 absolute). */
export function heatLevel(tmaxC: number): Level {
  if (tmaxC >= 45) return "high";
  if (tmaxC >= 40) return "medium";
  return "low";
}

/** Gusts km/h: ≥89 storm (Beaufort 10), ≥62 gale (Beaufort 8). */
export function windLevel(gustKmh: number): Level {
  if (gustKmh >= 89) return "high";
  if (gustKmh >= 62) return "medium";
  return "low";
}

/** Distance-weighted quake hazard: strongest recent event's shaking reach vs distance. */
export function shakingRadiusKm(mag: number): number {
  // Empirical felt-intensity radius (MMI ≥ VI) approximation: log10 R ≈ 0.5M − 1.0
  return Math.round(Math.pow(10, 0.5 * mag - 1.0));
}

export function quakeLevel(maxMag: number, distKm: number, countM25: number): Level {
  const reach = shakingRadiusKm(maxMag);
  if (maxMag >= 6 && distKm <= reach) return "high";
  if ((maxMag >= 4.5 && distKm <= reach * 1.5) || countM25 >= 10) return "medium";
  return "low";
}

/** VIIRS 375 m pixel ≈ 0.14 km² per hotspot. */
export function fireLevel(hotspotsWithin50km: number, nearestKm: number | null): Level {
  if (hotspotsWithin50km >= 25 || (nearestKm !== null && nearestKm <= 5)) return "high";
  if (hotspotsWithin50km >= 3) return "medium";
  return "low";
}

/**
 * Alert tier from the user's spec:
 *  high   → hazard rated high AND peak within 48 h  (alarm + SMS)
 *  medium → hazard medium/high expected within the forecast month (popup)
 *  low    → everything else / long-term signals (news feed)
 */
export function alertTier(level: Level, peakAt: string | null, now = new Date()): Level {
  if (level === "low") return "low";
  const hours = peakAt ? (new Date(peakAt).getTime() - now.getTime()) / 3.6e6 : Infinity;
  if (level === "high" && hours <= 48) return "high";
  if (hours <= 31 * 24) return "medium";
  return "low";
}

export function scoreFromLevel(level: Level, intensity: number): number {
  const base = level === "high" ? 70 : level === "medium" ? 40 : 5;
  return Math.round(clamp(base + intensity * 30));
}

export function hazardArea(radiusKm: number) {
  return { radiusKm, areaKm2: circle(radiusKm) };
}

/** Ordinary least squares with slope significance. */
export function linearTrend(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return { slope: 0, intercept: ys[0] ?? 0, r2: 0, pValueApprox: 1 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  const se = Math.sqrt(Math.max(1e-12, (syy - slope * sxy) / (n - 2)) / sxx);
  const t = Math.abs(slope / se);
  // two-sided p from t using normal approximation (adequate for n ≥ 20)
  const p = 2 * (1 - normCdf(t));
  return { slope, intercept, r2, pValueApprox: p };
}

function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 1 - p;
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
