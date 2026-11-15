import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from "recharts";
import { GitCompare, FileSearch, FileDown, Loader2, Plus, X, Sigma } from "lucide-react";
import { toast } from "sonner";
import { getClimateTrend } from "@/lib/hazards.functions";
import { Panel, ago } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { setFoxContext } from "@/lib/fox-bus";
import { cn } from "@/lib/utils";
import { deliverFile } from "@/lib/file-download";

export const Route = createFileRoute("/_authenticated/trends")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Climate trends & regional comparison — B fox" }, { name: "description", content: "Compare NASA climate trends between regions with statistical tests and automated investigation reports." }, { property: "og:title", content: "Climate trends — B fox" }, { property: "og:description", content: "NASA POWER trends compared across regions, with automated reports." }] }),
  component: Trends,
});

const PLACES = [
  { id: "mumbai", name: "Mumbai", lat: 19.076, lon: 72.878, kind: "Coastal city" },
  { id: "delhi", name: "Delhi", lat: 28.614, lon: 77.209, kind: "Inland plains" },
  { id: "chennai", name: "Chennai", lat: 13.083, lon: 80.271, kind: "Cyclone coast" },
  { id: "gangotri", name: "Gangotri Glacier", lat: 30.92, lon: 79.08, kind: "Himalayan glacier" },
  { id: "siachen", name: "Siachen Glacier", lat: 35.42, lon: 77.1, kind: "Karakoram glacier" },
  { id: "kolkata", name: "Kolkata", lat: 22.573, lon: 88.364, kind: "Delta city" },
  { id: "guwahati", name: "Guwahati", lat: 26.144, lon: 91.736, kind: "Flood plain (Brahmaputra)" },
  { id: "pune", name: "Pune", lat: 18.52, lon: 73.857, kind: "Western Ghats plateau" },
];
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--hazard-med)", "var(--hazard-low)"];
const TT = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 } };
const AX = { tick: { fontSize: 10, fill: "var(--muted-foreground)" } };
type Metric = "t2m" | "precip" | "monthsAboveZero";
const METRIC: Record<Metric, { label: string; unit: string }> = { t2m: { label: "Mean temperature", unit: "°C" }, precip: { label: "Precipitation", unit: "mm/day" }, monthsAboveZero: { label: "Months above 0 °C", unit: "months" } };

function Trends() {
  const [sel, setSel] = useState(["mumbai", "delhi", "gangotri"]);
  const [metric, setMetric] = useState<Metric>("t2m");
  const [making, setMaking] = useState(false);
  const [preparedPdf, setPreparedPdf] = useState<{ blob: Blob; filename: string } | null>(null);
  useEffect(() => { setPreparedPdf(null); }, [sel.join(",")]);
  const fn = useServerFn(getClimateTrend);
  const places = sel.map((id) => PLACES.find((p) => p.id === id)!);
  const qs = useQueries({ queries: places.map((p) => ({ queryKey: ["trend", p.lat.toFixed(2), p.lon.toFixed(2)], staleTime: 24 * 3600e3, queryFn: () => fn({ data: { lat: p.lat, lon: p.lon, start: 1991 } }) })) });
  const loading = qs.some((q) => q.isLoading);
  const rows = places.map((p, i) => ({ p, t: qs[i]?.data ?? null }));

  const series = useMemo(() => {
    const m = new Map<number, any>();
    rows.forEach(({ p, t }) => t?.years.forEach((y) => { const r = m.get(y.year) ?? { year: y.year }; r[p.id] = +(y[metric] as number).toFixed(2); m.set(y.year, r); }));
    return [...m.values()].sort((a, b) => a.year - b.year);
  }, [rows.map((r) => r.t?.years.length).join(), metric]);

  const toggle = (id: string) => { haptic("tap"); setSel((s) => s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : s.length < 4 ? [...s, id] : (toast("Compare up to 4 regions"), s)); };
  const ready = rows.filter((r) => r.t);
  const fastest = [...ready].sort((a, b) => b.t!.tempPerDecade - a.t!.tempPerDecade)[0];
  const slowest = [...ready].sort((a, b) => a.t!.tempPerDecade - b.t!.tempPerDecade)[0];

  const findings = ready.map(({ p, t }) => {
    const sig = t!.tempP < 0.05;
    const melt = t!.meltMonthsPerDecade;
    const risk = p.kind.includes("glacier") ? (t!.tempPerDecade > 0.2 ? "Accelerating melt raises glacial-lake outburst and downstream flood risk." : "Melt signal present but modest.") : t!.precipPerDecade > 0.1 ? "Wetter trend — more frequent heavy-rain and urban flooding likely." : t!.tempPerDecade > 0.25 ? "Strong warming — heat-wave days likely increasing." : "No strong hazard shift detected.";
    return { p, t: t!, text: `${p.name} (${p.kind}) ${t!.tempPerDecade >= 0 ? "warmed +" : "cooled "}${t!.tempPerDecade} °C per decade between ${t!.years[0]?.year} and ${t!.years.at(-1)?.year} (R² ${t!.tempR2}, ${sig ? "statistically significant, p<0.05" : `not significant, p~${Number(t!.tempP).toFixed(2)}`}). Precipitation changed ${t!.precipPerDecade >= 0 ? "+" : ""}${t!.precipPerDecade} mm/day per decade${p.kind.includes("glacier") ? `; the melt season changed ${melt >= 0 ? "+" : ""}${melt} months per decade` : ""}. ${risk}` };
  });
  useEffect(() => {
    setFoxContext("NASA climate graphs", rows.filter(r=>r.t).map(({p,t})=>`${p.name}: ${JSON.stringify(t)}; selected metric ${METRIC[metric].label} (${METRIC[metric].unit})`).join("\n"));
    return () => setFoxContext("NASA climate graphs", null);
  }, [metric, rows.map(r=>r.t?.source.fetchedAt).join(), sel.join()]);
  const summary = fastest && slowest && fastest !== slowest ? `Trends differ by location: ${fastest.p.name} is warming fastest (${fastest.t!.tempPerDecade} °C/decade) while ${slowest.p.name} is slowest (${slowest.t!.tempPerDecade} °C/decade) — a ${(fastest.t!.tempPerDecade - slowest.t!.tempPerDecade).toFixed(2)} °C/decade gap. One national number would hide this, so alerts must be local.` : null;

  async function pdf() {
    if (!ready.length) return;
    setMaking(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFillColor(236, 64, 140); doc.rect(0, 0, 210, 26, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text("B fox — Automated climate investigation", 12, 13);
      doc.setFontSize(9); doc.text(`Generated ${new Date().toUTCString()} · Regions: ${ready.map((r) => r.p.name).join(", ")}`, 12, 20);
      doc.setTextColor(30, 30, 50);
      autoTable(doc, { startY: 32, head: [["Region", "Type", "Years", "°C/decade", "R²", "p", "Precip mm/d/dec", "Melt mo/dec"]], body: ready.map(({ p, t }) => [p.name, p.kind, `${t!.years[0]?.year}–${t!.years.at(-1)?.year}`, t!.tempPerDecade, t!.tempR2, Number(t!.tempP).toFixed(3), t!.precipPerDecade, t!.meltMonthsPerDecade]), headStyles: { fillColor: [236, 64, 140] }, styles: { fontSize: 8 } });
      let y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(12); doc.text("Findings", 12, y); y += 6; doc.setFontSize(9);
      for (const f of [...(summary ? [{ text: summary }] : []), ...findings]) { const lines = doc.splitTextToSize("• " + f.text, 186); if (y + lines.length * 4.5 > 280) { doc.addPage(); y = 15; } doc.text(lines, 12, y); y += lines.length * 4.5 + 2; }
      y += 4; doc.setFontSize(8); doc.setTextColor(110, 110, 130);
      doc.text(doc.splitTextToSize(`Method: ordinary least-squares linear regression on NASA POWER annual means; p-values approximate (t-test on slope). Projections assume trends continue. Sources: ${ready.map((r) => r.t!.source.url).join(" ; ")}`, 186), 12, y);
      setPreparedPdf({ blob: doc.output("blob"), filename: `B-fox_climate_investigation_${new Date().toISOString().slice(0, 10)}.pdf` }); haptic("success");
    } catch (e) { toast.error((e as Error).message); } finally { setMaking(false); }
  }

  return (
    <div className="space-y-4">
      <Panel title="Compare regions" icon={<GitCompare className="h-4 w-4 text-primary" />}>
        <p className="mb-2 text-xs text-muted-foreground">Pick up to 4 places. Real NASA POWER data since 1991.</p>
        <div className="flex flex-wrap gap-1.5">{PLACES.map((p) => <button key={p.id} onClick={() => toggle(p.id)} className={cn("haptic rounded-full border px-3 py-1.5 text-xs", sel.includes(p.id) ? "border-primary bg-primary/15 font-semibold text-primary" : "bg-surface/60")}>{sel.includes(p.id) ? <X className="mr-1 inline h-3 w-3" /> : <Plus className="mr-1 inline h-3 w-3" />}{p.name}</button>)}</div>
        <div className="mt-3 flex gap-1 rounded-full bg-muted p-1">{(Object.keys(METRIC) as Metric[]).map((m) => <button key={m} onClick={() => setMetric(m)} className={cn("haptic flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold", metric === m ? "bg-card text-primary shadow" : "text-muted-foreground")}>{METRIC[m].label}</button>)}</div>
        {loading && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Fetching NASA data…</p>}
        {series.length > 0 && (
          <>
            <p className="mt-3 text-[11px] text-muted-foreground">{METRIC[metric].label} per year ({METRIC[metric].unit})</p>
            <div className="h-56"><ResponsiveContainer><LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="year" {...AX} /><YAxis {...AX} width={34} domain={["auto", "auto"]} /><Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: 11 }} />
              {places.map((p, i) => <Line key={p.id} dataKey={p.id} name={p.name} stroke={COLORS[i]!} strokeWidth={2} dot={false} />)}
            </LineChart></ResponsiveContainer></div>
          </>
        )}
      </Panel>

      {ready.length > 0 && (
        <Panel title="Statistical trend analysis" icon={<Sigma className="h-4 w-4 text-cyan" />}>
          <p className="mb-1 text-[11px] text-muted-foreground">Warming rate per decade (linear regression). Taller bar = faster change.</p>
          <div className="h-40"><ResponsiveContainer><BarChart data={ready.map(({ p, t }) => ({ name: p.name, v: t!.tempPerDecade }))}>
            <XAxis dataKey="name" {...AX} interval={0} /><YAxis {...AX} width={34} /><Tooltip {...TT} />
            <Bar dataKey="v" name="°C / decade" radius={[6, 6, 0, 0]}>{ready.map((_, i) => <Cell key={i} fill={COLORS[i]!} />)}</Bar>
          </BarChart></ResponsiveContainer></div>
          <div className="mt-2 overflow-x-auto"><table className="w-full text-xs">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1">Region</th><th>°C/dec</th><th>R²</th><th>p</th><th>Rain/dec</th></tr></thead>
            <tbody>{ready.map(({ p, t }) => <tr key={p.id} className="border-t"><td className="py-1.5 font-medium">{p.name}</td><td className={cn("font-mono", t!.tempPerDecade > 0.25 ? "text-high" : t!.tempPerDecade > 0 ? "text-med" : "text-low")}>{t!.tempPerDecade}</td><td className="font-mono">{t!.tempR2}</td><td className="font-mono">{Number(t!.tempP).toFixed(3)}</td><td className="font-mono">{t!.precipPerDecade}</td></tr>)}</tbody>
          </table></div>
          {summary && <p className="mt-3 rounded-xl bg-primary/10 p-3 text-xs font-medium">{summary}</p>}
        </Panel>
      )}

      {ready.length > 0 && (
        <Panel title="Automated investigation report" icon={<FileSearch className="h-4 w-4 text-primary" />}>
          <ul className="space-y-2 text-xs">{findings.map((f) => <li key={f.p.id} className="rounded-xl border bg-surface/60 p-2.5">{f.text}<div className="mt-1 text-[10px] text-muted-foreground"><a href={f.t.source.url} target="_blank" rel="noreferrer" className="text-primary underline">NASA POWER</a> · fetched {ago(f.t.source.fetchedAt)}</div></li>)}</ul>
          <Button className="mt-3 w-full gap-2" onClick={pdf} disabled={making}>{making ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Prepare investigation PDF</Button>
          {preparedPdf && <Button variant="outline" className="mt-2 w-full" onClick={() => void deliverFile(preparedPdf.blob, preparedPdf.filename).catch(() => toast.error("Could not download investigation PDF"))}><FileDown />Download investigation PDF</Button>}
        </Panel>
      )}
    </div>
  );
}
