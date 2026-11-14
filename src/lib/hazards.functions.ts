import { createServerFn } from "@tanstack/react-start";
import { parseFireCsv } from "./fire-data";
import {
  type Hazard, type Level, type Reading, alertTier, floodLevel, rainLevel, heatLevel, windLevel,
  quakeLevel, fireLevel, shakingRadiusKm, scoreFromLevel, hazardArea, maxLevel, haversineKm, linearTrend,
} from "./hazard-model";

const UA = { "User-Agent": "FOX-Disaster-Watch/1.0 (NASA Space Apps demo)" };
type LatLon = { lat: number; lon: number };
const validLatLon = (d: LatLon) => {
  const lat = Number(d?.lat), lon = Number(d?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Invalid coordinates");
  return { lat, lon };
};

async function getJson<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { ...init, headers: { ...UA, ...(init?.headers ?? {}) } });
    if (!r.ok) { console.error("fetch failed", r.status, url); return null; }
    return (await r.json()) as T;
  } catch (e) { console.error("fetch error", url, e); return null; }
}

// ---------------- Place search ----------------
export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => ({ q: String(d?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    if (data.q.trim().length < 2) return [];
    const j = await getJson<any>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(data.q)}&count=6&language=en&format=json`);
    return (j?.results ?? []).map((r: any) => ({
      name: r.name as string, region: [r.admin1, r.country].filter(Boolean).join(", "), lat: r.latitude as number, lon: r.longitude as number,
    }));
  });

export const reverseGeocode = createServerFn({ method: "GET" })
  .inputValidator(validLatLon)
  .handler(async ({ data }) => {
    const j = await getJson<any>(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${data.lat}&lon=${data.lon}`);
    const a = j?.address ?? {};
    const name = a.city || a.town || a.village || a.county || a.state_district || a.state || j?.name || null;
    return { name: name as string | null, region: [a.state, a.country].filter(Boolean).join(", ") };
  });

// ---------------- Area assessment ----------------
export interface Assessment {
  lat: number; lon: number; generatedAt: string;
  overall: Level; alert: Level;
  hazards: Hazard[];
  weather: {
    current: { temp: number | null; gust: number | null; precip: number | null; humidity: number | null; time: string | null };
    daily: { date: string; tmax: number; tmin: number; precip: number; precipProb: number | null; gust: number; code: number }[];
    source: Reading;
  } | null;
  water: {
    river: { date: string; discharge: number | null; median: number | null; isForecast: boolean }[];
    ratio: number | null; medianRecent: number | null; peakForecast: number | null; peakDate: string | null;
    waveMax: { date: string; m: number }[];
    tsunamiQuake: { mag: number; place: string; time: string; distKm: number; url: string } | null;
    sources: Reading[];
  };
  quakes: { mag: number; place: string; time: string; lat: number; lon: number; distKm: number; url: string; tsunami: boolean }[];
  events: { id: string; title: string; category: string; date: string; lat: number; lon: number; distKm: number; url: string }[];
  fires: { count: number; nearestKm: number | null; configured: boolean; points: { lat: number; lon: number; frp: number; date: string }[] };
  unavailable: string[];
}

export const assessArea = createServerFn({ method: "GET" })
  .inputValidator(validLatLon)
  .handler(async ({ data }): Promise<Assessment> => {
    const { lat, lon } = data;
    const now = new Date();
    const unavailable: string[] = [];
    const startQ = new Date(now.getTime() - 30 * 864e5).toISOString().slice(0, 10);
    const d = 4; // bbox degrees for EONET
    const firmsKey = process.env["NASA_FIRMS_MAP_KEY"];

    const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_gusts_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,weather_code&past_days=7&forecast_days=16&timezone=UTC`;
    const flUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_median&past_days=60&forecast_days=30`;
    const mrUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&daily=wave_height_max&forecast_days=7&timezone=UTC`;
    const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=600&starttime=${startQ}&minmagnitude=2.5&orderby=magnitude&limit=150`;
    const eoUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=60&bbox=${lon - d},${lat + d},${lon + d},${lat - d}&limit=40`;
    const firmsUrl = firmsKey ? `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/VIIRS_SNPP_NRT/${(lon - 0.6).toFixed(3)},${(lat - 0.5).toFixed(3)},${(lon + 0.6).toFixed(3)},${(lat + 0.5).toFixed(3)}/2` : null;

    const [fc, fl, mr, us, eo, firmsCsv] = await Promise.all([
      getJson<any>(fcUrl), getJson<any>(flUrl), getJson<any>(mrUrl), getJson<any>(usgsUrl), getJson<any>(eoUrl),
      firmsUrl ? fetch(firmsUrl).then((r) => (r.ok ? r.text() : null)).catch(() => null) : Promise.resolve(null),
    ]);

    const hazards: Hazard[] = [];
    const nowIso = now.toISOString();

    // ---- Weather ----
    let weather: Assessment["weather"] = null;
    const todayStr = nowIso.slice(0, 10);
    if (fc?.daily) {
      const D = fc.daily;
      const daily = (D.time as string[]).map((t, i) => ({
        date: t, tmax: D.temperature_2m_max[i], tmin: D.temperature_2m_min[i], precip: D.precipitation_sum[i] ?? 0,
        precipProb: D.precipitation_probability_max?.[i] ?? null, gust: D.wind_gusts_10m_max[i] ?? 0, code: D.weather_code[i],
      }));
      const wSrc: Reading = { label: "Forecast model run", value: "GFS/ICON/ECMWF blend via Open-Meteo", observedAt: fc.current?.time ? fc.current.time + "Z" : nowIso, source: "Open-Meteo Forecast API", url: fcUrl };
      weather = {
        current: { temp: fc.current?.temperature_2m ?? null, gust: fc.current?.wind_gusts_10m ?? null, precip: fc.current?.precipitation ?? null, humidity: fc.current?.relative_humidity_2m ?? null, time: fc.current?.time ? fc.current.time + "Z" : null },
        daily, source: wSrc,
      };
      const future = daily.filter((x) => x.date >= todayStr);
      const past7 = daily.filter((x) => x.date < todayStr);
      // Heavy rain
      const maxRain = future.length ? future.reduce((a, b) => (b.precip > a.precip ? b : a)) : null;
      if (maxRain) {
        const lvl = rainLevel(maxRain.precip);
        hazards.push({
          type: "heavy_rain", level: lvl, score: scoreFromLevel(lvl, Math.min(1, maxRain.precip / 204.5)),
          peakAt: maxRain.date + "T12:00:00Z", window: `Peak ${maxRain.precip.toFixed(1)} mm on ${maxRain.date}`,
          harm: lvl === "high" ? "Very heavy rain: urban waterlogging, road closures, flash floods in low-lying wards." : lvl === "medium" ? "Heavy rain: local waterlogging and traffic disruption likely." : "No heavy-rain day (≥64.5 mm) in the 16-day forecast.",
          relevance: `Forecast grid cell at ${lat.toFixed(2)}, ${lon.toFixed(2)} (~11 km resolution).`,
          ...hazardArea(lvl === "low" ? 0 : 25),
          readings: [
            { label: "Max daily rain (16-day)", value: `${maxRain.precip.toFixed(1)} mm`, observedAt: wSrc.observedAt, source: wSrc.source, url: fcUrl },
            { label: "Rain past 7 days", value: `${past7.reduce((a, b) => a + b.precip, 0).toFixed(1)} mm`, observedAt: wSrc.observedAt, source: wSrc.source, url: fcUrl },
          ],
        });
      }
      const hot = future.length ? future.reduce((a, b) => (b.tmax > a.tmax ? b : a)) : null;
      if (hot) {
        const lvl = heatLevel(hot.tmax);
        hazards.push({
          type: "heatwave", level: lvl, score: scoreFromLevel(lvl, Math.max(0, (hot.tmax - 35) / 12)),
          peakAt: hot.date + "T09:00:00Z", window: `Hottest day ${hot.date}: ${hot.tmax.toFixed(1)} °C`,
          harm: lvl === "high" ? "Severe heat wave: heat-stroke risk for outdoor workers, elderly and children." : lvl === "medium" ? "Heat-wave threshold reached: limit outdoor exposure 12–4 pm." : "Temperatures below IMD heat-wave threshold (40 °C).",
          relevance: "Applies city-wide within the forecast grid cell.", ...hazardArea(lvl === "low" ? 0 : 30),
          readings: [{ label: "Max temperature (16-day)", value: `${hot.tmax.toFixed(1)} °C`, observedAt: wSrc.observedAt, source: wSrc.source, url: fcUrl }],
        });
      }
      const windy = future.length ? future.reduce((a, b) => (b.gust > a.gust ? b : a)) : null;
      if (windy) {
        const lvl = windLevel(windy.gust);
        hazards.push({
          type: "storm", level: lvl, score: scoreFromLevel(lvl, Math.min(1, windy.gust / 150)),
          peakAt: windy.date + "T12:00:00Z", window: `Strongest gusts ${windy.gust.toFixed(0)} km/h on ${windy.date}`,
          harm: lvl === "high" ? "Storm-force gusts: falling trees/hoardings, power outages, unsafe sea." : lvl === "medium" ? "Gale-force gusts: secure loose objects; fishermen should avoid sea." : "No gale-force gusts (≥62 km/h) forecast.",
          relevance: "Wind field forecast for this grid cell.", ...hazardArea(lvl === "high" ? 150 : lvl === "medium" ? 60 : 0),
          readings: [{ label: "Max gust (16-day)", value: `${windy.gust.toFixed(0)} km/h`, observedAt: wSrc.observedAt, source: wSrc.source, url: fcUrl }],
        });
      }
    } else unavailable.push("Weather forecast (Open-Meteo) did not respond");

    // ---- Water / flood ----
    const water: Assessment["water"] = { river: [], ratio: null, medianRecent: null, peakForecast: null, peakDate: null, waveMax: [], tsunamiQuake: null, sources: [] };
    if (fl?.daily?.river_discharge) {
      const t: string[] = fl.daily.time;
      water.river = t.map((date, i) => ({ date, discharge: fl.daily.river_discharge[i] ?? null, median: fl.daily.river_discharge_median?.[i] ?? null, isForecast: date >= todayStr }));
      const past = water.river.filter((r) => !r.isForecast && r.discharge != null).map((r) => r.discharge as number).sort((a, b) => a - b);
      const med = past.length ? (past[Math.floor(past.length / 2)] ?? null) : null;
      const fut = water.river.filter((r) => r.isForecast && r.discharge != null);
      const peak = fut.reduce<(typeof fut)[number] | null>((a, b) => (!a || (b.discharge as number) > (a.discharge as number) ? b : a), null);
      water.medianRecent = med; water.peakForecast = peak?.discharge ?? null; water.peakDate = peak?.date ?? null;
      water.ratio = med && peak?.discharge != null && med > 0 ? +(peak.discharge / med).toFixed(2) : null;
      water.sources.push({ label: "River discharge (GloFAS v4)", value: `${peak?.discharge?.toFixed(1) ?? "–"} m³/s peak`, observedAt: nowIso, source: "Open-Meteo Flood API / Copernicus GloFAS", url: flUrl });
    } else unavailable.push("River discharge: no river channel modelled at this point (GloFAS)");
    const rain72 = weather ? weather.daily.filter((x) => x.date >= todayStr).slice(0, 3).reduce((a, b) => a + b.precip, 0) : 0;
    {
      const lvl = floodLevel(water.ratio, rain72);
      hazards.push({
        type: "flood", level: lvl, score: scoreFromLevel(lvl, Math.min(1, ((water.ratio ?? 1) - 1) / 3 + rain72 / 400)),
        peakAt: water.peakDate ? water.peakDate + "T12:00:00Z" : null,
        window: water.peakDate ? `River peak forecast ${water.peakDate} (${water.ratio ?? "–"}× recent median)` : `72 h rain total ${rain72.toFixed(1)} mm`,
        harm: lvl === "high" ? "River/flash flooding likely: evacuate low-lying banks, move to higher ground." : lvl === "medium" ? "Rising water: keep go-bag ready, avoid underpasses and river banks." : "River levels and rainfall within normal range.",
        relevance: water.ratio != null ? "Nearest modelled river reach (≈5 km GloFAS grid)." : "No modelled river reach; based on rainfall only.",
        ...hazardArea(lvl === "high" ? 20 : lvl === "medium" ? 8 : 0),
        readings: [
          ...water.sources,
          ...(weather ? [{ label: "Rain next 72 h", value: `${rain72.toFixed(1)} mm`, observedAt: weather.source.observedAt, source: weather.source.source, url: fcUrl }] : []),
        ],
      });
    }
    if (mr?.daily?.wave_height_max) {
      water.waveMax = (mr.daily.time as string[]).map((date, i) => ({ date, m: mr.daily.wave_height_max[i] })).filter((w) => w.m != null);
      if (water.waveMax.length) water.sources.push({ label: "Max wave height (7-day)", value: `${Math.max(...water.waveMax.map((w) => w.m)).toFixed(1)} m`, observedAt: nowIso, source: "Open-Meteo Marine API", url: mrUrl });
    }

    // ---- Earthquakes / tsunami ----
    const quakes: Assessment["quakes"] = (us?.features ?? []).map((f: any) => {
      const [qlon, qlat] = f.geometry.coordinates;
      return { mag: f.properties.mag, place: f.properties.place, time: new Date(f.properties.time).toISOString(), lat: qlat, lon: qlon, distKm: Math.round(haversineKm({ lat, lon }, { lat: qlat, lon: qlon })), url: f.properties.url, tsunami: f.properties.tsunami === 1 };
    });
    if (!us) unavailable.push("USGS earthquake catalog did not respond");
    {
      const strongest = quakes[0];
      const near = quakes.length ? quakes.reduce((a, b) => (b.distKm < a.distKm ? b : a)) : null;
      const lvl = strongest ? quakeLevel(strongest.mag, strongest.distKm, quakes.length) : "low";
      const r = strongest ? shakingRadiusKm(strongest.mag) : 0;
      hazards.push({
        type: "earthquake", level: lvl, score: scoreFromLevel(lvl, strongest ? Math.min(1, strongest.mag / 8) : 0),
        peakAt: strongest?.time ?? null,
        window: strongest ? `Strongest: M${strongest.mag.toFixed(1)} ${strongest.distKm} km away (${strongest.time.slice(0, 10)})` : "No M2.5+ quakes within 600 km in 30 days",
        harm: lvl === "high" ? "Strong shaking reached this area; expect aftershocks. Inspect buildings before re-entry." : lvl === "medium" ? "Elevated regional seismicity; review drop-cover-hold drill." : "Low recent seismic activity. Earthquakes cannot be forecast in time—only monitored.",
        relevance: `${quakes.length} events M2.5+ within 600 km in 30 days${near ? `; nearest ${near.distKm} km` : ""}.`,
        ...hazardArea(lvl === "low" ? 0 : r),
        readings: strongest ? [{ label: `M${strongest.mag.toFixed(1)} – ${strongest.place}`, value: `${strongest.distKm} km`, observedAt: strongest.time, source: "USGS Earthquake Catalog", url: strongest.url }] : [{ label: "USGS query (30 d, 600 km)", value: "0 events", observedAt: nowIso, source: "USGS", url: usgsUrl }],
      });
      const tq = quakes.find((q) => q.mag >= 6.5 && q.distKm <= 1000 && water.waveMax.length > 0 && now.getTime() - new Date(q.time).getTime() < 3 * 864e5);
      if (tq) water.tsunamiQuake = { mag: tq.mag, place: tq.place, time: tq.time, distKm: tq.distKm, url: tq.url };
      if (water.waveMax.length) {
        const lvl2: Level = tq ? (tq.mag >= 7.5 || tq.tsunami ? "high" : "medium") : "low";
        hazards.push({
          type: "tsunami", level: lvl2, score: scoreFromLevel(lvl2, tq ? tq.mag / 9 : 0), peakAt: tq?.time ?? null,
          window: tq ? `M${tq.mag} offshore quake ${tq.distKm} km away` : "No large (M6.5+) quake near this coast in the last 72 h",
          harm: lvl2 !== "low" ? "Move inland or to upper floors; follow INCOIS / official tsunami bulletins." : "Coastal location—tsunami risk is driven only by large undersea quakes.",
          relevance: "Coastal point (marine model returns waves here).", ...hazardArea(lvl2 === "low" ? 0 : 5),
          readings: tq ? [{ label: `M${tq.mag} ${tq.place}`, value: `${tq.distKm} km`, observedAt: tq.time, source: "USGS", url: tq.url }] : water.sources.filter((s) => s.source.includes("Marine")),
        });
      }
    }

    // ---- NASA EONET ----
    const events: Assessment["events"] = (eo?.events ?? []).map((e: any) => {
      const g = e.geometry?.[e.geometry.length - 1];
      const [elon, elat] = Array.isArray(g?.coordinates?.[0]) ? g.coordinates[0][0] : g?.coordinates ?? [lon, lat];
      return { id: e.id, title: e.title, category: e.categories?.[0]?.title ?? "Event", date: g?.date ?? "", lat: elat, lon: elon, distKm: Math.round(haversineKm({ lat, lon }, { lat: elat, lon: elon })), url: e.sources?.[0]?.url ?? e.link };
    });
    if (!eo) unavailable.push("NASA EONET did not respond");

    // ---- NASA FIRMS ----
    const parsedFires = firmsCsv == null ? null : parseFireCsv(firmsCsv);
    const fires: Assessment["fires"] = { count: 0, nearestKm: null, configured: parsedFires != null, points: parsedFires ?? [] };
    if (parsedFires) {
      const dists = fires.points.map((p) => haversineKm({ lat, lon }, p)).filter((x) => x <= 50);
      fires.count = dists.length; fires.nearestKm = dists.length ? Math.round(Math.min(...dists)) : null;
    } else unavailable.push(firmsKey ? "NASA FIRMS active fires: request failed or response invalid; fire coverage unknown" : "NASA FIRMS active fires: MAP_KEY not configured");
    {
      const eoFire = events.filter((e) => /fire/i.test(e.category) && e.distKm < 100);
      const lvl = maxLevel([fireLevel(fires.count, fires.nearestKm), eoFire.length ? "medium" : "low"]);
      hazards.push({
        type: "wildfire", level: lvl, score: scoreFromLevel(lvl, Math.min(1, fires.count / 50)), peakAt: fires.points[0]?.date ?? eoFire[0]?.date ?? null,
        window: fires.configured ? `${fires.count} VIIRS hotspots within 50 km (last 48 h)` : `${eoFire.length} NASA EONET wildfire events within 100 km`,
        harm: lvl !== "low" ? "Active fire detections nearby: smoke exposure; be ready to evacuate if fire front approaches." : fires.configured ? "No active fire detections nearby in this satellite response; this is not an all-clear." : "Satellite fire coverage unavailable; absence of an EONET report does not establish safety.",
        relevance: fires.nearestKm != null ? `Nearest hotspot ${fires.nearestKm} km` : "Satellite thermal anomalies (375 m pixels).",
        ...hazardArea(lvl === "low" ? 0 : Math.max(2, Math.sqrt((fires.count * 0.14) / Math.PI) + 3)),
        readings: [
          ...(fires.configured ? [{ label: "VIIRS S-NPP NRT hotspots", value: String(fires.count), observedAt: fires.points.map(p => p.date).sort().at(-1) ?? nowIso, source: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/" }] : []),
          ...eoFire.slice(0, 2).map((e) => ({ label: e.title, value: `${e.distKm} km`, observedAt: e.date, source: "NASA EONET", url: e.url })),
        ],
      });
    }

    // ---- Landslide (rain on slopes) - only when rain is heavy ----
    // Not modelled without terrain data; omitted rather than guessed.

    hazards.sort((a, b) => b.score - a.score);
    const overall = maxLevel(hazards.map((h) => h.level));
    const alert = maxLevel(hazards.map((h) => alertTier(h.level, h.peakAt, now)));
    return { lat, lon, generatedAt: nowIso, overall, alert, hazards, weather, water, quakes: quakes.slice(0, 40), events, fires, unavailable };
  });

// ---------------- Global events for the map ----------------
export const getGlobalEvents = createServerFn({ method: "GET" }).handler(async () => {
  const [q, e] = await Promise.all([
    getJson<any>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"),
    getJson<any>("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=200"),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    quakes: (q?.features ?? []).map((f: any) => ({ id: f.id, mag: f.properties.mag, place: f.properties.place, time: new Date(f.properties.time).toISOString(), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], url: f.properties.url })),
    events: (e?.events ?? []).flatMap((ev: any) => {
      const g = ev.geometry?.[ev.geometry.length - 1];
      if (!g || g.type !== "Point") return [];
      return [{ id: ev.id, title: ev.title, category: ev.categories?.[0]?.title ?? "Event", date: g.date, lat: g.coordinates[1], lon: g.coordinates[0], url: ev.sources?.[0]?.url ?? ev.link }];
    }),
    sources: [
      { name: "USGS M4.5+ past week", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson" },
      { name: "NASA EONET open events", url: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30" },
    ],
  };
});

// ---------------- Safe zones (OpenStreetMap) ----------------
export const getSafeZones = createServerFn({ method: "GET" })
  .inputValidator(validLatLon)
  .handler(async ({ data }) => {
    const { lat, lon } = data;
    const q = `[out:json][timeout:25];(nwr["amenity"~"^(hospital|shelter|police|fire_station|community_centre)$"](around:6000,${lat},${lon});nwr["emergency"="assembly_point"](around:6000,${lat},${lon});nwr["social_facility"="shelter"](around:6000,${lat},${lon}););out center 80;`;
    const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
    let j: any = null;
    for (const ep of endpoints) {
      j = await getJson<any>(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (j) break;
    }
    if (!j) return { zones: [], fetchedAt: new Date().toISOString(), error: "OpenStreetMap Overpass service is busy — try again shortly." };
    const zones = (j.elements ?? []).map((el: any) => {
      const zlat = el.lat ?? el.center?.lat, zlon = el.lon ?? el.center?.lon;
      const t = el.tags ?? {};
      const kind = t.emergency === "assembly_point" ? "assembly_point" : t.amenity ?? (t.social_facility ? "shelter" : "other");
      return { id: `${el.type}/${el.id}`, name: t.name || t["name:en"] || kind.replace("_", " "), kind, lat: zlat, lon: zlon, distKm: +haversineKm({ lat, lon }, { lat: zlat, lon: zlon }).toFixed(2), elevation: null as number | null };
    }).filter((z: any) => Number.isFinite(z.lat)).sort((a: any, b: any) => a.distKm - b.distKm).slice(0, 40);
    // Elevation (Copernicus DEM via Open-Meteo) for flood-safe ranking
    const pts = [{ lat, lon }, ...zones];
    const el = await getJson<any>(`https://api.open-meteo.com/v1/elevation?latitude=${pts.map((p) => p.lat.toFixed(5)).join(",")}&longitude=${pts.map((p) => p.lon.toFixed(5)).join(",")}`);
    const here = el?.elevation?.[0] ?? null;
    zones.forEach((z: any, i: number) => (z.elevation = el?.elevation?.[i + 1] ?? null));
    return { zones, hereElevation: here, fetchedAt: new Date().toISOString(), source: "OpenStreetMap contributors (Overpass API), elevation: Copernicus DEM via Open-Meteo", error: null as string | null };
  });

export const getRoute = createServerFn({ method: "GET" })
  .inputValidator((d: { from: LatLon; to: LatLon }) => ({ from: validLatLon(d.from), to: validLatLon(d.to) }))
  .handler(async ({ data }) => {
    const { from, to } = data;
    const j = await getJson<any>(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true`);
    const r = j?.routes?.[0];
    if (!r) return null;
    return {
      coords: (r.geometry.coordinates as [number, number][]).map(([x, y]) => [y, x] as [number, number]),
      distanceKm: +(r.distance / 1000).toFixed(2), durationMin: Math.round(r.duration / 60), walkMin: Math.round((r.distance / 1000 / 4.8) * 60),
      steps: (r.legs?.[0]?.steps ?? []).slice(0, 25).map((s: any) => `${s.maneuver.type}${s.maneuver.modifier ? " " + s.maneuver.modifier : ""}${s.name ? " onto " + s.name : ""} (${Math.round(s.distance)} m)`),
      source: "OSRM routing on OpenStreetMap",
    };
  });

// ---------------- NASA POWER climate trends ----------------
export const getClimateTrend = createServerFn({ method: "GET" })
  .inputValidator((d: LatLon & { start?: number }) => ({ ...validLatLon(d), start: Math.max(1981, Math.min(2015, Number(d.start ?? 1991))) }))
  .handler(async ({ data }) => {
    const end = new Date().getUTCFullYear() - 1;
    const tryEnd = async (e: number) => {
      const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,T2M_MAX,PRECTOTCORR&community=AG&longitude=${data.lon}&latitude=${data.lat}&start=${data.start}&end=${e}&format=JSON`;
      return { url, j: await getJson<any>(url) };
    };
    let { url, j } = await tryEnd(end);
    if (!j?.properties) ({ url, j } = await tryEnd(end - 1));
    if (!j?.properties) return null;
    const P = j.properties.parameter;
    const years: { year: number; t2m: number; tmax: number; precip: number; monthsAboveZero: number }[] = [];
    for (let y = data.start; y <= end; y++) {
      const ann = P.T2M?.[`${y}13`];
      if (ann == null || ann === -999) continue;
      let above = 0;
      for (let m = 1; m <= 12; m++) { const v = P.T2M[`${y}${String(m).padStart(2, "0")}`]; if (v != null && v > 0) above++; }
      years.push({ year: y, t2m: ann, tmax: P.T2M_MAX?.[`${y}13`], precip: P.PRECTOTCORR?.[`${y}13`], monthsAboveZero: above });
    }
    const xs = years.map((y) => y.year);
    const tT = linearTrend(xs, years.map((y) => y.t2m));
    const pT = linearTrend(xs, years.map((y) => y.precip));
    const mT = linearTrend(xs, years.map((y) => y.monthsAboveZero));
    return {
      lat: data.lat, lon: data.lon, years,
      tempPerDecade: +(tT.slope * 10).toFixed(3), tempR2: +tT.r2.toFixed(2), tempP: tT.pValueApprox,
      precipPerDecade: +(pT.slope * 10).toFixed(3), precipP: pT.pValueApprox,
      meltMonthsPerDecade: +(mT.slope * 10).toFixed(2),
      source: { name: "NASA POWER (MERRA-2 / GEWEX) monthly point data", url, fetchedAt: new Date().toISOString(), header: j.header?.title ?? "NASA/POWER" },
    };
  });

// ---------------- Past-week verification (hindcast) ----------------
export const getPastWeek = createServerFn({ method: "GET" }).handler(async () => {
  const feed = await getJson<any>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson");
  const top = (feed?.features ?? []).sort((a: any, b: any) => b.properties.mag - a.properties.mag).slice(0, 8);
  const checks = await Promise.all(top.map(async (f: any) => {
    const t = new Date(f.properties.time);
    const start = new Date(t.getTime() - 30 * 864e5).toISOString();
    const end = new Date(t.getTime() - 60e3).toISOString();
    const [lon, lat] = f.geometry.coordinates;
    const c = await getJson<any>(`https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=300&starttime=${start}&endtime=${end}&minmagnitude=2.5`);
    const prior = c?.count ?? null;
    return { id: f.id, mag: f.properties.mag, place: f.properties.place, time: t.toISOString(), lat, lon, url: f.properties.url, priorEvents: prior, flagged: prior != null && prior >= 3 };
  }));
  const eo = await getJson<any>("https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=7&limit=60");
  const events = (eo?.events ?? []).map((e: any) => ({ id: e.id, title: e.title, category: e.categories?.[0]?.title ?? "Event", date: e.geometry?.[e.geometry.length - 1]?.date, closed: e.closed, url: e.sources?.[0]?.url ?? e.link }));
  const valid = checks.filter((c) => c.priorEvents != null);
  return {
    fetchedAt: new Date().toISOString(), quakes: checks, events,
    hitRate: valid.length ? Math.round((valid.filter((c) => c.flagged).length / valid.length) * 100) : null,
    method: "Hindcast of FOX's seismic-cluster rule: an area is flagged 'medium' when ≥3 M2.5+ quakes occurred within 300 km in the prior 30 days. For each of the past week's strongest quakes we check whether its location was already flagged before it happened.",
    sources: [{ name: "USGS M4.5+ past week", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson" }, { name: "NASA EONET (7 days)", url: "https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=7" }],
  };
});
