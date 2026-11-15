import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudSun, Waves, Mountain, ShieldCheck, Loader2, CheckSquare, Square } from "lucide-react";
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getClimateTrend } from "@/lib/hazards.functions";
import { useAssessment } from "@/lib/use-assessment";
import { useHere } from "@/components/app/Here";
import { HAZ_NAME, HazardGlyph, LevelBadge, Panel, SourceList, Stat, ago } from "@/components/app/bits";
import { setFoxContext } from "@/lib/fox-bus";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { HazardType } from "@/lib/hazard-model";
import { CurrentNews } from '@/components/app/CurrentNews';

export const Route = createFileRoute("/_authenticated/prevent")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Prevent — weather, water & glaciers — B fox" }, { name: "description", content: "Weather outlook, river and sea levels, glacier melt trends from NASA data, and prevention checklists before disaster strikes." }, { property: "og:title", content: "Prevent — B fox" }, { property: "og:description", content: "Act before disaster strikes: outlooks, water levels and NASA climate trends." }] }),
  component: Prevent,
});

const TT = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 } };
const AX = { tick: { fontSize: 10, fill: "var(--muted-foreground)" } };
const REGIONS = [
  { id: "here", name: "My location", lat: 0, lon: 0 },
  { id: "gangotri", name: "Gangotri Glacier", lat: 30.92, lon: 79.08 },
  { id: "siachen", name: "Siachen Glacier", lat: 35.42, lon: 77.1 },
  { id: "khumbu", name: "Khumbu (Everest)", lat: 27.98, lon: 86.85 },
];
const STEPS: Record<HazardType, string[]> = {
  flood: ["Move documents & medicines to a high shelf", "Know your nearest raised safe zone", "Clear drains around your home"],
  heavy_rain: ["Avoid underpasses and low roads", "Charge phone and power bank", "Keep 3 days of drinking water"],
  heatwave: ["Drink water every hour, avoid 12–4 pm sun", "Check on elderly neighbours", "Keep ORS at home"],
  storm: ["Tie down loose roof items", "Stay away from trees and hoardings", "Keep a torch ready"],
  earthquake: ["Identify a sturdy table to shelter under", "Secure heavy shelves to walls", "Agree a family meeting point"],
  tsunami: ["If the sea pulls back suddenly, move to high ground at once", "Know the inland route from the coast"],
  wildfire: ["Clear dry leaves near the house", "Keep N95 masks for smoke", "Plan two exits from your area"],
  landslide: ["Watch for new cracks or tilting trees", "Avoid steep slopes during heavy rain"],
};

function Prevent() {
  const { loc, button } = useHere();
  const p = loc ?? { lat: 19.076, lon: 72.8777 };
  const a = useAssessment(p.lat, p.lon);
  const [region, setRegion] = useState("gangotri");
  const r = REGIONS.find((x) => x.id === region)!;
  const rl = region === "here" ? p : r;
  const trendFn = useServerFn(getClimateTrend);
  const trend = useQuery({ queryKey: ["trend", rl.lat.toFixed(2), rl.lon.toFixed(2)], staleTime: 24 * 3600e3, queryFn: () => trendFn({ data: { lat: rl.lat, lon: rl.lon, start: 1991 } }) });
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem("fox.prepDone") || "{}")); } catch {} }, []);
  const toggle = (k: string) => { haptic("tap"); setDone((d) => { const n = { ...d, [k]: !d[k] }; localStorage.setItem("fox.prepDone", JSON.stringify(n)); return n; }); };

  const d = a.data;
  const t = trend.data;
  useEffect(() => {
    if (t) setFoxContext("Glacier trend", `${rl === p ? "My location" : r.name}: temperature ${t.tempPerDecade} °C/decade (R² ${t.tempR2}), precipitation ${t.precipPerDecade} mm/day per decade, months above 0 °C changing ${t.meltMonthsPerDecade}/decade. NASA POWER ${t.years[0]?.year}–${t.years.at(-1)?.year}.`);
    return () => setFoxContext("Glacier trend", null);
  }, [t]);

  const outlook = d?.weather?.daily.map((x) => ({ day: new Date(x.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), rain: x.precip, prob: x.precipProb, tmax: x.tmax, tmin: x.tmin, gust: x.gust })) ?? [];
  const river = d?.water.river.map((x) => ({ date: x.date.slice(5), q: x.discharge, median: x.median, f: x.isForecast })) ?? [];
  const waves = d?.water.waveMax.map((x) => ({ date: x.date.slice(5), m: x.m })) ?? [];
  const risky = d ? [...d.hazards].sort((x, y) => y.score - x.score).slice(0, 4) : [];
  const yearsToNoFrost = t && t.meltMonthsPerDecade > 0 ? Math.round(((12 - (t.years.at(-1)?.monthsAboveZero ?? 12)) / t.meltMonthsPerDecade) * 10) : null;

  return (
    <div className="space-y-4">
      <CurrentNews />

      <Panel title="Weather outlook" icon={<CloudSun className="h-4 w-4 text-cyan" />} right={button}>
        {a.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading forecast…</p>}
        {a.error && <p className="text-sm text-high">Weather service unreachable: {(a.error as Error).message}. Try again in a moment.</p>}
        {d && !d.weather && <p className="text-sm text-med">The weather forecast service did not respond for this place. Other data below is still live.</p>}
        {outlook.length > 0 && (
          <>
            <p className="mb-1 text-[11px] text-muted-foreground">Daily rain (mm, bars), max/min temperature (°C, lines) for the next 7 days.</p>
            <div className="h-48"><ResponsiveContainer><ComposedChart data={outlook}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" {...AX} /><YAxis yAxisId="r" {...AX} width={28} /><YAxis yAxisId="t" orientation="right" {...AX} width={28} />
              <Tooltip {...TT} />
              <Bar yAxisId="r" dataKey="rain" name="Rain mm" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="t" dataKey="tmax" name="Max °C" stroke="var(--hazard-high)" strokeWidth={2} dot={false} />
              <Line yAxisId="t" dataKey="tmin" name="Min °C" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </ComposedChart></ResponsiveContainer></div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Max rain/day" value={Math.max(...outlook.map((o) => o.rain)).toFixed(0)} unit="mm" />
              <Stat label="Peak gust" value={Math.max(...outlook.map((o) => o.gust)).toFixed(0)} unit="km/h" />
              <Stat label="Hottest" value={Math.max(...outlook.map((o) => o.tmax)).toFixed(0)} unit="°C" />
            </div>
            <div className="mt-2"><SourceList readings={[d!.weather!.source]} /></div>
          </>
        )}
      </Panel>

      {d && (
        <Panel title="Flood & tsunami water levels" icon={<Waves className="h-4 w-4 text-cyan" />}>
          <WaterGauge ratio={d.water.ratio} wave={waves.length ? Math.max(...waves.map((w) => w.m)) : null} />
          {river.length > 0 ? (
            <>
              <p className="mb-1 text-[11px] text-muted-foreground">River discharge (m³/s) vs. the normal median. Higher than {d.water.medianRecent ? "2×" : ""} median signals flood risk.</p>
              <div className="h-40"><ResponsiveContainer><AreaChart data={river}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" {...AX} /><YAxis {...AX} width={36} /><Tooltip {...TT} />
                <Area dataKey="q" name="Discharge m³/s" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.25} />
                <Line dataKey="median" name="Median" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} />
              </AreaChart></ResponsiveContainer></div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Stat label="vs normal" value={d.water.ratio != null ? `${d.water.ratio.toFixed(1)}×` : "–"} accent={d.water.ratio && d.water.ratio >= 2 ? "text-high" : d.water.ratio && d.water.ratio >= 1.4 ? "text-med" : "text-low"} />
                <Stat label="Peak forecast" value={d.water.peakForecast?.toFixed(0) ?? "–"} unit="m³/s" />
                <Stat label="Peak date" value={d.water.peakDate?.slice(5) ?? "–"} />
              </div>
            </>
          ) : <p className="text-xs text-muted-foreground">No river gauge model covers this exact point.</p>}
          {waves.length > 0 && (
            <div className="mt-3"><p className="mb-1 text-[11px] text-muted-foreground">Max sea wave height (m) — coastal surge indicator.</p>
              <div className="h-28"><ResponsiveContainer><LineChart data={waves}><XAxis dataKey="date" {...AX} /><YAxis {...AX} width={28} /><Tooltip {...TT} /><ReferenceLine y={4} stroke="var(--hazard-high)" strokeDasharray="3 3" /><Line dataKey="m" name="Wave m" stroke="var(--primary)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
            </div>
          )}
          {d.water.tsunamiQuake && <p className="mt-2 rounded-lg border border-high/60 bg-high/10 p-2 text-xs text-high">Tsunami-flagged quake: M{d.water.tsunamiQuake.mag} {d.water.tsunamiQuake.place}, {d.water.tsunamiQuake.distKm} km away · {ago(d.water.tsunamiQuake.time)}</p>}
          <div className="mt-2"><SourceList readings={d.water.sources} /></div>
        </Panel>
      )}

      <Link to="/trends" className="haptic glass flex items-center justify-between rounded-[1.4rem] p-4 text-sm font-semibold">Compare regions & get an investigation report<span className="text-primary">→</span></Link>

      <Panel title="Glacier melt watch" icon={<Mountain className="h-4 w-4 text-primary" />}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REGIONS.map((x) => <button key={x.id} onClick={() => { haptic("tap"); setRegion(x.id); }} className={cn("rounded-full border px-2.5 py-1 text-[11px] transition active:scale-95", region === x.id ? "border-primary bg-primary/15 text-primary" : "bg-surface/60")}>{x.name}</button>)}
        </div>
        {trend.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Fetching 30+ years of NASA data…</p>}
        {trend.data === null && <p className="text-sm text-med">NASA POWER returned no data for this point right now.</p>}
        {t && (
          <>
            <p className="mb-1 text-[11px] text-muted-foreground">Annual mean temperature (°C, line) and months per year above 0 °C (bars = melt season length).</p>
            <div className="h-44"><ResponsiveContainer><ComposedChart data={t.years}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="year" {...AX} /><YAxis yAxisId="m" {...AX} width={24} domain={[0, 12]} /><YAxis yAxisId="t" orientation="right" {...AX} width={30} />
              <Tooltip {...TT} />
              <Bar yAxisId="m" dataKey="monthsAboveZero" name="Melt months" fill="var(--cyan)" fillOpacity={0.5} />
              <Line yAxisId="t" dataKey="t2m" name="Mean °C" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </ComposedChart></ResponsiveContainer></div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Warming" value={(t.tempPerDecade > 0 ? "+" : "") + t.tempPerDecade} unit="°C/dec" accent={t.tempPerDecade > 0.2 ? "text-high" : t.tempPerDecade > 0 ? "text-med" : "text-low"} />
              <Stat label="Melt season" value={(t.meltMonthsPerDecade > 0 ? "+" : "") + t.meltMonthsPerDecade} unit="mo/dec" />
              <Stat label="Confidence" value={t.tempP < 0.05 ? "High" : "Low"} unit={`p≈${Number(t.tempP).toFixed(3)}`} />
            </div>
            <p className="mt-2 text-xs">
              {t.tempPerDecade > 0
                ? <>Air above this glacier is warming {t.tempPerDecade} °C per decade. {yearsToNoFrost != null ? <>At this pace the melt season grows by {t.meltMonthsPerDecade} month(s) a decade; it would cover all 12 months in roughly <b>{yearsToNoFrost} years</b>. </> : null}Faster melt raises glacial-lake outburst and downstream flood risk — a <b>low (green)</b> early-warning signal.</>
                : <>No warming trend detected at this point over the period.</>}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Linear regression on {t.years.length} years; the projection assumes the trend continues. Source: <a href={t.source.url} target="_blank" rel="noreferrer" className="text-primary underline">{t.source.name}</a> · fetched {ago(t.source.fetchedAt)}</p>
          </>
        )}
      </Panel>

      {risky.length > 0 && (
        <Panel title="Prevention checklist" icon={<ShieldCheck className="h-4 w-4 text-low" />}>
          <p className="mb-2 text-[11px] text-muted-foreground">Prepared now = safer later. Steps for the top risks here.</p>
          {risky.map((h) => (
            <div key={h.type} className="mb-3">
              <div className="mb-1 flex items-center gap-2"><HazardGlyph type={h.type} level={h.level} /><span className="text-sm font-medium">{HAZ_NAME[h.type]}</span><LevelBadge level={h.level} /></div>
              {STEPS[h.type].map((s) => { const k = h.type + s; return (
                <button key={k} onClick={() => toggle(k)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted active:scale-[0.98] transition">
                  {done[k] ? <CheckSquare className="h-4 w-4 text-low" /> : <Square className="h-4 w-4 text-muted-foreground" />}<span className={cn(done[k] && "line-through text-muted-foreground")}>{s}</span>
                </button>); })}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

function WaterGauge({ ratio, wave }: { ratio: number | null; wave: number | null }) {
  const fill = ratio == null ? 0 : Math.min(1, ratio / 3);
  const lvl = ratio == null ? "low" : ratio >= 2 ? "high" : ratio >= 1.4 ? "medium" : "low";
  const waveLvl = wave == null ? "low" : wave >= 4 ? "high" : wave >= 2.5 ? "medium" : "low";
  const col = (l: string) => (l === "high" ? "bg-high" : l === "medium" ? "bg-med" : "bg-low");
  const txt = (l: string) => (l === "high" ? "text-high" : l === "medium" ? "text-med" : "text-low");
  return (
    <div className="mb-3 grid grid-cols-2 gap-3">
      {[{ t: "Flood level", v: ratio != null ? `${ratio.toFixed(2)}× normal` : "No gauge", f: fill, l: lvl, marks: ["3×", "2× danger", "1.4× warn", "normal"] }, { t: "Tsunami / surge", v: wave != null ? `${wave.toFixed(1)} m waves` : "Inland", f: wave == null ? 0 : Math.min(1, wave / 6), l: waveLvl, marks: ["6 m", "4 m danger", "2.5 m warn", "calm"] }].map((g) => (
        <div key={g.t} className="rounded-2xl border bg-surface/60 p-3">
          <p className="text-[11px] font-semibold text-muted-foreground">{g.t}</p>
          <div className="mt-2 flex items-end gap-2">
            <div className="relative h-28 w-12 overflow-hidden rounded-xl border-2 bg-card">
              <div className={cn("absolute inset-x-0 bottom-0 transition-all duration-1000 opacity-80", col(g.l))} style={{ height: `${Math.max(4, g.f * 100)}%` }}>
                <div className="absolute -top-1.5 left-0 h-3 w-[200%] animate-wave rounded-[50%] bg-inherit" />
              </div>
              <div className="absolute inset-x-0 top-[33%] border-t border-dashed border-high/70" />
              <div className="absolute inset-x-0 top-[53%] border-t border-dashed border-med/70" />
            </div>
            <div className="flex h-28 flex-col justify-between text-[9px] text-muted-foreground">{g.marks.map((m) => <span key={m}>{m}</span>)}</div>
          </div>
          <p className={cn("mt-2 text-sm font-bold", txt(g.l))}>{g.v}</p>
        </div>
      ))}
    </div>
  );
}
