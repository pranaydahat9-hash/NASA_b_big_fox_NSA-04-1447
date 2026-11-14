import type { Assessment } from "./hazards.functions";
import { tileUrl } from "./offline";

type RGB = [number, number, number];
const LV: Record<string, RGB> = { low: [34, 170, 90], medium: [220, 170, 20], high: [220, 50, 50] };
const NAVY: RGB = [74, 28, 64], PINK: RGB = [236, 64, 140];
export type TrendForPdf = { years: { year: number; t2m: number; precip: number; monthsAboveZero: number }[]; tempPerDecade: number; tempR2: number; tempP: number; precipPerDecade: number; meltMonthsPerDecade: number; source: { name: string; url: string; fetchedAt: string } } | null;

/** Simple vector chart: bars and/or lines over labelled x positions. */
function chart(doc: any, x: number, y: number, w: number, h: number, opts: { labels: string[]; bars?: { v: (number | null)[]; color: RGB; name: string }; lines?: { v: (number | null)[]; color: RGB; name: string; dash?: boolean }[]; unitL: string; unitR?: string }) {
  const n = opts.labels.length; if (!n) return;
  doc.setDrawColor(225, 215, 225); doc.setLineWidth(0.2); doc.rect(x, y, w, h);
  for (let i = 1; i < 4; i++) doc.line(x, y + (h * i) / 4, x + w, y + (h * i) / 4);
  const step = w / n;
  const scale = (vals: (number | null)[], zero = true) => { const f = vals.filter((v): v is number => v != null); const mn = Math.min(...f), mx = Math.max(...f); const pad = (mx - mn) * 0.1 || 1; const lo = zero ? Math.min(0, mn) : mn - pad, hi = zero ? Math.max(mx, lo + 1) : mx + pad; return { lo, hi, py: (v: number) => y + h - ((v - lo) / (hi - lo)) * h }; };
  doc.setFontSize(6); doc.setTextColor(120);
  if (opts.bars) {
    const sc = scale(opts.bars.v); doc.setFillColor(...opts.bars.color);
    opts.bars.v.forEach((v, i) => { if (v == null) return; const top = sc.py(v); doc.rect(x + i * step + step * 0.18, top, step * 0.64, y + h - top, "F"); });
    doc.text(`${sc.hi.toFixed(sc.hi < 10 ? 1 : 0)} ${opts.unitL}`, x - 1, y + 2, { align: "right" }); doc.text(`${sc.lo.toFixed(0)}`, x - 1, y + h, { align: "right" });
  }
  (opts.lines ?? []).forEach((ln, li) => {
    const sc = scale(ln.v, false); doc.setDrawColor(...ln.color); doc.setLineWidth(0.6);
    if (ln.dash) doc.setLineDashPattern([1, 1], 0);
    let prev: [number, number] | null = null;
    ln.v.forEach((v, i) => { if (v == null) { prev = null; return; } const pt: [number, number] = [x + i * step + step / 2, sc.py(v)]; if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]); prev = pt; });
    doc.setLineDashPattern([], 0);
    if (li === 0 && !opts.bars) { doc.text(`${sc.hi.toFixed(1)} ${opts.unitL}`, x - 1, y + 2, { align: "right" }); doc.text(`${sc.lo.toFixed(1)}`, x - 1, y + h, { align: "right" }); }
    else if (opts.unitR && li === 0) { doc.text(`${sc.hi.toFixed(0)} ${opts.unitR}`, x + w + 1, y + 2); doc.text(`${sc.lo.toFixed(0)}`, x + w + 1, y + h); }
  });
  const every = Math.ceil(n / 10);
  opts.labels.forEach((l, i) => { if (i % every === 0) doc.text(l, x + i * step + step / 2, y + h + 3, { align: "center" }); });
  let lx = x; const ly = y + h + 7;
  for (const s of [...(opts.bars ? [opts.bars] : []), ...(opts.lines ?? [])]) { doc.setFillColor(...s.color); doc.rect(lx, ly - 2, 3, 2, "F"); doc.setTextColor(80); doc.text(s.name, lx + 4, ly); lx += 6 + doc.getTextWidth(s.name) + 4; }
}

async function mapImage(lat: number, lon: number, zones: { lat: number; lon: number }[] = [], z = 12): Promise<string | null> {
  try {
    const W = 3, H = 2, c = document.createElement("canvas");
    c.width = W * 256; c.height = H * 256;
    const g = c.getContext("2d");
    if (!g) return null;
    const n = 2 ** z;
    const fx = ((lon + 180) / 360) * n;
    const r = (lat * Math.PI) / 180;
    const fy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
    const x0 = Math.floor(fx - W / 2), y0 = Math.floor(fy - H / 2);
    await Promise.all(Array.from({ length: W * H }, async (_, i) => {
      const tx = x0 + (i % W), ty = y0 + Math.floor(i / W);
      const response = await fetch(tileUrl("light", z, tx, ty), { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("Map tile unavailable");
      const url = URL.createObjectURL(await response.blob());
      try {
        const img = new Image(); img.src = url;
        await img.decode(); g.drawImage(img, (i % W) * 256, Math.floor(i / W) * 256);
      } finally { URL.revokeObjectURL(url); }
    }));
    const px = (la: number, lo: number) => {
      const X = ((lo + 180) / 360) * n, rr = (la * Math.PI) / 180;
      const Y = ((1 - Math.log(Math.tan(rr) + 1 / Math.cos(rr)) / Math.PI) / 2) * n;
      return [(X - x0) * 256, (Y - y0) * 256] as [number, number];
    };
    for (const zn of zones) { const [a, b] = px(zn.lat, zn.lon); g.fillStyle = "#22aa5a"; g.beginPath(); g.arc(a, b, 7, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); }
    const [a, b] = px(lat, lon);
    g.fillStyle = "#ec408c"; g.beginPath(); g.arc(a, b, 10, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
    return c.toDataURL("image/jpeg", 0.85);
  } catch { return null; }
}

export async function buildReportPdf(a: Assessment, place: string, zones: { name: string; kind: string; distKm: number; lat: number; lon: number }[] = [], trend: TrendForPdf = null) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  // Header
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(...PINK); doc.rect(0, 34, W, 1.2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("FOX Disaster Risk Report", 14, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`${place}  ·  ${a.lat.toFixed(4)}, ${a.lon.toFixed(4)}`, 14, 22);
  doc.text(`Generated ${new Date(a.generatedAt).toUTCString()}`, 14, 28);
  const lv = LV[a.overall] ?? ([128, 128, 128] as RGB);
  doc.setFillColor(...lv); doc.roundedRect(W - 58, 10, 44, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`OVERALL: ${a.overall.toUpperCase()}`, W - 36, 19, { align: "center" });

  let y = 42;
  const top = [...a.hazards].sort((p, q) => q.score - p.score);
  const elevated = top.filter((h) => h.level !== "low");
  const summary = `${elevated.length ? `${elevated.length} elevated hazard(s): ${elevated.map((h) => `${h.type.replace("_", " ")} (${h.level}, ${h.window})`).join("; ")}.` : "No elevated hazards detected for this location at the time of the report."} Highest score: ${top[0]?.type.replace("_", " ")} ${top[0]?.score}/100. ${a.quakes.length} verified USGS earthquakes within 600 km in 30 days; ${a.events.length} open NASA EONET events nearby${a.fires.configured ? `; ${a.fires.count} NASA FIRMS fire hotspots within 50 km` : ""}.${trend ? ` NASA POWER trend ${trend.years[0]?.year}–${trend.years.at(-1)?.year}: ${trend.tempPerDecade >= 0 ? "+" : ""}${trend.tempPerDecade} °C/decade.` : ""}`;
  doc.setFillColor(253, 240, 246); const sl = doc.splitTextToSize(summary, 176);
  doc.roundedRect(14, y, 182, sl.length * 4.2 + 9, 2, 2, "F");
  doc.setTextColor(...PINK); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("EXECUTIVE SUMMARY", 17, y + 5);
  doc.setTextColor(50, 40, 60); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(sl, 17, y + 9.5);
  y += sl.length * 4.2 + 14;
  doc.setTextColor(30, 30, 50); doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Location map", 14, y); y += 3;
  const img = await mapImage(a.lat, a.lon, zones.slice(0, 15));
  if (img) { doc.addImage(img, "JPEG", 14, y, 150, 100); y += 103; doc.setFontSize(7); doc.setTextColor(110); doc.text("Basemap © OpenStreetMap contributors. Pink = assessed point, green = safe zones.", 14, y); y += 6; }
  else { doc.setFontSize(9); doc.text("Basemap unavailable or timed out; coordinates and data retained.", 14, y + 5); y += 10; }

  // Hazard bar chart
  doc.setFontSize(12); doc.setTextColor(30, 30, 50); doc.setFont("helvetica", "bold"); doc.text("Hazard scores (0–100)", 14, y); y += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  for (const h of a.hazards) {
    doc.setTextColor(60); doc.text(h.type.replace("_", " "), 14, y + 3.5);
    doc.setFillColor(235, 235, 245); doc.rect(45, y, 130, 4.5, "F");
    doc.setFillColor(...(LV[h.level] ?? ([128, 128, 128] as RGB))); doc.rect(45, y, Math.max(1, 1.3 * h.score), 4.5, "F");
    doc.text(`${h.score}  ${h.level}`, 178, y + 3.5); y += 6.5;
  }

  doc.addPage(); y = 16;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(30, 30, 50); doc.text("Hazard assessment detail", 14, y);
  autoTable(doc, {
    startY: y + 4, styles: { fontSize: 7.5, cellPadding: 1.8 }, headStyles: { fillColor: NAVY },
    head: [["Hazard", "Level", "When", "Impact", "Coverage", "Relevance"]],
    body: a.hazards.map((h) => [h.type.replace("_", " "), h.level.toUpperCase(), h.window, h.harm, h.areaKm2 ? `~${h.radiusKm.toFixed(0)} km radius (${h.areaKm2.toLocaleString()} km²)` : "–", h.relevance]),
    didParseCell: (d: any) => { if (d.section === "body" && d.column.index === 1) d.cell.styles.textColor = LV[String(d.cell.raw).toLowerCase()] ?? [0, 0, 0]; },
  });
  let ay = (doc as any).lastAutoTable.finalY + 8;

  if (a.weather) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Weather outlook (16 days)", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: PINK },
      head: [["Date", "Tmax °C", "Tmin °C", "Rain mm", "Rain prob %", "Gust km/h"]],
      body: a.weather.daily.map((d) => [d.date, d.tmax?.toFixed(1), d.tmin?.toFixed(1), d.precip?.toFixed(1), d.precipProb ?? "–", d.gust?.toFixed(0)]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }
  if (a.quakes.length) {
    if (ay > 255) { doc.addPage(); ay = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Verified earthquakes (USGS, 30 days, 600 km)", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: NAVY },
      head: [["Time (UTC)", "Mag", "Place", "Distance km"]], body: a.quakes.slice(0, 15).map((q) => [q.time.replace("T", " ").slice(0, 16), q.mag.toFixed(1), q.place, q.distKm]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }
  if (a.events.length) {
    if (ay > 255) { doc.addPage(); ay = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("NASA EONET natural events nearby", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: NAVY },
      head: [["Date", "Category", "Title", "Distance km"]], body: a.events.map((e) => [e.date?.slice(0, 10), e.category, e.title, e.distKm]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }
  if (zones.length) {
    if (ay > 255) { doc.addPage(); ay = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Nearest safe zones (OpenStreetMap)", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: [34, 170, 90] },
      head: [["Name", "Type", "Distance km", "Lat, Lon"]], body: zones.slice(0, 15).map((z) => [z.name, z.kind, z.distKm, `${z.lat.toFixed(4)}, ${z.lon.toFixed(4)}`]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }

  // Graphs
  doc.addPage(); let gy = 16;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(30, 30, 50); doc.text("Graphs & trends", 14, gy); gy += 8;
  if (a.weather?.daily.length) {
    doc.setFontSize(10); doc.text("Forecast: daily rain (mm) and max temperature (°C)", 14, gy); gy += 3;
    chart(doc, 24, gy, 162, 40, { labels: a.weather.daily.map((d) => d.date.slice(5)), bars: { v: a.weather.daily.map((d) => d.precip), color: [90, 150, 230], name: "Rain mm" }, lines: [{ v: a.weather.daily.map((d) => d.tmax), color: PINK, name: "Max °C" }], unitL: "mm", unitR: "°C" });
    gy += 54;
  } else { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Weather forecast unavailable at report time.", 14, gy); gy += 8; }
  if (a.water.river.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("River discharge (m3/s) vs normal median — Copernicus GloFAS", 14, gy); gy += 3;
    chart(doc, 24, gy, 162, 38, { labels: a.water.river.map((r) => r.date.slice(5)), lines: [{ v: a.water.river.map((r) => r.discharge), color: [40, 140, 200], name: "Discharge" }, { v: a.water.river.map((r) => r.median), color: [150, 150, 160], name: "Median", dash: true }], unitL: "m3/s" });
    gy += 52;
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("NASA POWER long-term climate trend (annual mean temperature, °C)", 14, gy); gy += 3;
  if (trend?.years.length) {
    chart(doc, 24, gy, 162, 38, { labels: trend.years.map((t) => String(t.year)), bars: { v: trend.years.map((t) => t.precip), color: [200, 200, 230], name: "Precip mm/day" }, lines: [{ v: trend.years.map((t) => t.t2m), color: PINK, name: "Mean °C" }], unitL: "mm/d", unitR: "°C" });
    gy += 50;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60);
    const tl = doc.splitTextToSize(`Linear trend: ${trend.tempPerDecade >= 0 ? "+" : ""}${trend.tempPerDecade} °C per decade (R² ${trend.tempR2}, p~${Number(trend.tempP).toFixed(3)} — ${trend.tempP < 0.05 ? "statistically significant" : "not statistically significant"}). Precipitation ${trend.precipPerDecade >= 0 ? "+" : ""}${trend.precipPerDecade} mm/day per decade. Source: ${trend.source.name}, fetched ${trend.source.fetchedAt.replace("T", " ").slice(0, 16)} UTC. ${trend.source.url}`, 182);
    doc.text(tl, 14, gy); gy += tl.length * 3.8;
  } else { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("NASA POWER climate data was unavailable when this report was generated.", 14, gy + 4); }

  // Sources
  doc.addPage();
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Data sources, references & timestamps", 14, 16);
  const rows = a.hazards.flatMap((h) => h.readings.map((r) => [h.type, r.label, r.value, r.observedAt ? r.observedAt.replace("T", " ").slice(0, 16) + " UTC" : "–", r.source, r.url]));
  autoTable(doc, { startY: 20, styles: { fontSize: 6.5, overflow: "linebreak" }, headStyles: { fillColor: NAVY }, columnStyles: { 5: { cellWidth: 55, textColor: [40, 80, 200] } },
    head: [["Hazard", "Reading", "Value", "Observed", "Source", "Link"]], body: rows });
  let sy = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("NASA data availability", 14, sy); sy += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  const notes = [
    `NASA EONET (Earth Observatory Natural Event Tracker): ${a.events.length} open events in a ±4° box. https://eonet.gsfc.nasa.gov/`,
    a.fires.configured ? `NASA FIRMS VIIRS S-NPP NRT: ${a.fires.count} hotspots within 50 km (48 h). https://firms.modaps.eosdis.nasa.gov/` : "NASA FIRMS active-fire data: NOT AVAILABLE in this report (MAP_KEY not configured). Wildfire section uses NASA EONET only.",
    trend ? `NASA POWER (MERRA-2) monthly point data, fetched ${trend.source.fetchedAt.replace("T", " ").slice(0, 16)} UTC. ${trend.source.url}` : "NASA POWER climate trend: NOT AVAILABLE for this report.",
    ...a.unavailable.map((u) => "Unavailable: " + u),
    "Method: rule-based thresholds (IMD rainfall & heat-wave criteria, Beaufort gust classes, USGS magnitude) applied to the sources above. This is a decision-support tool, not an official warning. Always follow IMD / NDMA / local authority bulletins.",
  ];
  for (const n of notes) { const lines = doc.splitTextToSize(n, 182); doc.text(lines, 14, sy); sy += lines.length * 3.8 + 1.5; }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(140); doc.text(`FOX · NASA Space Apps · page ${i}/${pages}`, W / 2, 291, { align: "center" }); }
  return doc.output("blob");
}
