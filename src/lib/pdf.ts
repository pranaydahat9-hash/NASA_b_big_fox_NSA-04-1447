import type { Assessment } from "./hazards.functions";
import { lonLatToTile, tileUrl } from "./offline";

type RGB = [number, number, number];
const LV: Record<string, RGB> = { low: [34, 170, 90], medium: [220, 170, 20], high: [220, 50, 50] };
const NAVY: RGB = [18, 24, 58], PINK: RGB = [236, 64, 140];

async function mapImage(lat: number, lon: number, zones: { lat: number; lon: number }[] = [], z = 12): Promise<string | null> {
  try {
    const W = 3, H = 2, c = document.createElement("canvas");
    c.width = W * 256; c.height = H * 256;
    const g = c.getContext("2d")!;
    const n = 2 ** z;
    const fx = ((lon + 180) / 360) * n;
    const r = (lat * Math.PI) / 180;
    const fy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
    const x0 = Math.floor(fx - W / 2), y0 = Math.floor(fy - H / 2);
    await Promise.all(Array.from({ length: W * H }, async (_, i) => {
      const tx = x0 + (i % W), ty = y0 + Math.floor(i / W);
      const img = new Image(); img.crossOrigin = "anonymous"; img.src = tileUrl("light", z, tx, ty);
      await img.decode(); g.drawImage(img, (i % W) * 256, Math.floor(i / W) * 256);
    }));
    const px = (la: number, lo: number) => {
      const X = ((lo + 180) / 360) * n, rr = (la * Math.PI) / 180;
      const Y = ((1 - Math.log(Math.tan(rr) + 1 / Math.cos(rr)) / Math.PI) / 2) * n;
      return [(X - x0) * 256, (Y - y0) * 256] as [number, number];
    };
    for (const zn of zones) { const [a, b] = px(zn.lat, zn.lon); g.fillStyle = "#22aa5a"; g.beginPath(); g.arc(a, b, 7, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); }
    const [a, b] = px(lat, lon);
    g.fillStyle = "#ec408c"; g.beginPath(); g.arc(a, b, 10, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
    void lonLatToTile;
    return c.toDataURL("image/jpeg", 0.85);
  } catch { return null; }
}

export async function buildReportPdf(a: Assessment, place: string, zones: { name: string; kind: string; distKm: number; lat: number; lon: number }[] = []) {
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

  let y = 44;
  doc.setTextColor(30, 30, 50); doc.setFontSize(12); doc.text("Location map", 14, y); y += 3;
  const img = await mapImage(a.lat, a.lon, zones.slice(0, 15));
  if (img) { doc.addImage(img, "JPEG", 14, y, 182, 121.3); y += 124; doc.setFontSize(7); doc.setTextColor(110); doc.text("Basemap © OpenStreetMap contributors © CARTO. Pink = assessed point, green = safe zones.", 14, y); y += 6; }
  else { doc.setFontSize(9); doc.text("Map tiles unavailable (offline).", 14, y + 5); y += 10; }

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
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Verified earthquakes (USGS, 30 days, 600 km)", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: NAVY },
      head: [["Time (UTC)", "Mag", "Place", "Distance km"]], body: a.quakes.slice(0, 15).map((q) => [q.time.replace("T", " ").slice(0, 16), q.mag.toFixed(1), q.place, q.distKm]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }
  if (a.events.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("NASA EONET natural events nearby", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: NAVY },
      head: [["Date", "Category", "Title", "Distance km"]], body: a.events.map((e) => [e.date?.slice(0, 10), e.category, e.title, e.distKm]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }
  if (zones.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Nearest safe zones (OpenStreetMap)", 14, ay);
    autoTable(doc, { startY: ay + 3, styles: { fontSize: 7 }, headStyles: { fillColor: [34, 170, 90] },
      head: [["Name", "Type", "Distance km", "Lat, Lon"]], body: zones.slice(0, 15).map((z) => [z.name, z.kind, z.distKm, `${z.lat.toFixed(4)}, ${z.lon.toFixed(4)}`]) });
    ay = (doc as any).lastAutoTable.finalY + 8;
  }

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
    "Climate trend data in the app uses NASA POWER (MERRA-2). https://power.larc.nasa.gov/",
    ...a.unavailable.map((u) => "Unavailable: " + u),
    "Method: rule-based thresholds (IMD rainfall & heat-wave criteria, Beaufort gust classes, USGS magnitude) applied to the sources above. This is a decision-support tool, not an official warning. Always follow IMD / NDMA / local authority bulletins.",
  ];
  for (const n of notes) { const lines = doc.splitTextToSize(n, 182); doc.text(lines, 14, sy); sy += lines.length * 3.8 + 1.5; }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(140); doc.text(`FOX · NASA Space Apps · page ${i}/${pages}`, W / 2, 291, { align: "center" }); }
  return doc.output("blob");
}
