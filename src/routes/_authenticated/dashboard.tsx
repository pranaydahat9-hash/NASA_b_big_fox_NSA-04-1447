import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Map as MapIcon, Radar, Satellite, ShieldAlert, ShieldCheck, Siren, Loader2, ChevronRight, Search, MapPin, Clock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from "recharts";
import { useAssessment } from "@/lib/use-assessment";
import { getGlobalEvents, reverseGeocode } from "@/lib/hazards.functions";
import { useHere } from "@/components/app/Here";
import { HAZ_NAME, HazardGlyph, LevelBadge, Panel, Stat, ago, levelBg, levelText, SourceList } from "@/components/app/bits";
import { setFoxContext } from "@/lib/fox-bus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Risk dashboard — FOX" }, { name: "description", content: "Live disaster risk for your location: floods, storms, heat, quakes and fires from real satellite and sensor data." }, { property: "og:title", content: "Risk dashboard — FOX" }, { property: "og:description", content: "Live disaster risk for your location from real satellite and sensor data." }] }),
  component: Dashboard,
});

const MUMBAI = { lat: 19.076, lon: 72.8777 };

function Dashboard() {
  const { loc, button } = useHere();
  const p = loc ?? MUMBAI;
  const a = useAssessment(p.lat, p.lon);
  const g = useQuery({ queryKey: ["global"], queryFn: () => getGlobalEvents(), staleTime: 10 * 60e3 });
  const d = a.data;
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const revFn = useServerFn(reverseGeocode);
  const rev = useQuery({ queryKey: ["rev", p.lat.toFixed(2), p.lon.toFixed(2)], enabled: !!loc, staleTime: 3600e3, queryFn: () => revFn({ data: { lat: p.lat, lon: p.lon } }) });
  const place = rev.data?.name ? [rev.data.name, rev.data.region].filter(Boolean).join(", ") : null;
  const avg = d ? +(1 + (d.hazards.reduce((m, h) => Math.max(m, h.score), 0) / 100) * 4).toFixed(1) : 0;

  useEffect(() => {
    if (!d) return;
    setFoxContext("Dashboard", `Location ${p.lat.toFixed(3)},${p.lon.toFixed(3)}. Overall ${d.overall}. Hazards: ${d.hazards.map((h) => `${h.type} ${h.level} score ${h.score} peak ${h.peakAt ?? "n/a"}`).join("; ")}`);
    return () => setFoxContext("Dashboard", null);
  }, [d, p.lat, p.lon]);

  const days = d?.weather?.daily.map((x) => ({ day: new Date(x.date).toLocaleDateString(undefined, { weekday: "short" }), rain: x.precip, tmax: x.tmax, gust: x.gust })) ?? [];

  return (
    <div className="space-y-4">
      <section className="bg-band relative overflow-hidden rounded-[1.6rem] p-5 text-primary-foreground shadow-[var(--shadow-glow)] animate-float-up">
        <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
        <span className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-primary-foreground/10" />
        <p className="text-xs font-medium opacity-90">{greeting()}</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">Stay aware. Stay prepared.</h1>
        <p className="mt-1 max-w-md text-sm opacity-90">Live satellite and sensor readings for the place you care about — with time to act before it happens.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav({ to: "/map", search: { q: q.trim() } }); }} className="mt-4 flex items-center gap-2 rounded-full bg-card p-1.5 pl-4 text-foreground shadow-lg">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city, area or village…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <button className="haptic rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Search</button>
        </form>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-[1.4rem] p-4 animate-float-up">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" />Current location</p>
          <p className="mt-1 line-clamp-2 text-sm font-bold">{place ?? (loc ? `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}` : "Mumbai, Maharashtra")}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", loc ? "bg-low" : "bg-med")} />{loc ? `Device GPS · ${ago(loc.at)}` : "Default — share yours"}</p>
          <div className="mt-2">{button}</div>
        </div>
        <div className="glass rounded-[1.4rem] p-4 animate-float-up">
          <p className="text-xs font-semibold text-muted-foreground">Overall risk</p>
          {d ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <div><p className={cn("text-xl font-extrabold capitalize", levelText[d.overall])}>{d.overall === "medium" ? "Moderate" : d.overall}</p><p className="text-[11px] text-muted-foreground">Updated {ago(d.generatedAt)}{(d as any).fromCache ? " · offline" : ""}</p></div>
              <Gauge value={avg} level={d.overall} />
            </div>
          ) : a.isLoading ? <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Reading feeds…</p> : <p className="mt-2 text-xs text-high">{a.error ? "Live data unavailable" : "–"}</p>}
        </div>
      </div>

      {d && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...d.hazards].sort((x, y) => y.score - x.score).map((h, i) => (
            <Link key={h.type} to="/map" search={{ lat: p.lat, lon: p.lon }} style={{ animationDelay: `${i * 50}ms` }} className="haptic glass group rounded-[1.3rem] p-3.5 animate-float-up">
              <div className="flex items-start gap-2.5">
                <HazardGlyph type={h.type} level={h.level} size="md" />
                <div className="min-w-0"><p className="truncate text-sm font-bold">{HAZ_NAME[h.type]}</p><LevelBadge level={h.level} className="mt-0.5" /></div>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{h.window}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700 group-hover:opacity-80", levelBg[h.level])} style={{ width: `${Math.max(4, h.score)}%` }} /></div>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{h.readings[0]?.observedAt ? `Updated ${ago(h.readings[0].observedAt)}` : "No recent reading"}</p>
            </Link>
          ))}
        </div>
      )}

      {d && (
        <Panel title="Current conditions" icon={<Activity className="h-4 w-4 text-primary" />}>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Temp" value={d.weather?.current.temp ?? "–"} unit="°C" />
            <Stat label="Gust" value={d.weather?.current.gust ?? "–"} unit="km/h" />
            <Stat label="Rain" value={d.weather?.current.precip ?? "–"} unit="mm" />
            <Stat label="River" value={d.water.ratio != null ? `${d.water.ratio.toFixed(1)}×` : "–"} accent={d.water.ratio && d.water.ratio > 2 ? "text-high" : undefined} />
          </div>
        </Panel>
      )}

      {days.length > 0 && (
        <Panel title="7-day outlook" icon={<Satellite className="h-4 w-4 text-primary" />}>
          <p className="mb-2 text-[11px] text-muted-foreground">Bars: daily rain (mm). Line: max temperature (°C). Forecast model data.</p>
          <div className="h-44">
            <ResponsiveContainer>
              <ComposedChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis yAxisId="r" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                <YAxis yAxisId="t" orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={28} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar yAxisId="r" dataKey="rain" name="Rain mm" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="t" dataKey="tmax" name="Max °C" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {d?.weather && <div className="mt-2"><SourceList readings={[d.weather.source]} /></div>}
        </Panel>
      )}

      <Panel title="World activity" icon={<MapIcon className="h-4 w-4 text-cyan" />} right={g.data && <span className="text-[10px] text-muted-foreground">{ago(g.data.fetchedAt)}</span>}>
        {g.data ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="M4.5+ quakes (7d)" value={g.data.quakes.length} />
              <Stat label="NASA open events" value={g.data.events.length} />
            </div>
            <div className="mt-2 h-32">
              <ResponsiveContainer>
                <BarChart data={Object.entries((g.data.events as any[]).reduce((m: Record<string, number>, e: any) => ((m[e.category] = (m[e.category] ?? 0) + 1), m), {})).map(([k, v]) => ({ k, v }))}>
                  <XAxis dataKey="k" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={24} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="v" name="Events" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Sources: {g.data.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-2 text-primary underline">{s.name}</a>)}</p>
          </>
        ) : <p className="text-sm text-muted-foreground">Loading…</p>}
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/sos" className="glass flex items-center gap-2 rounded-2xl p-3 text-sm font-medium active:scale-95 transition"><Siren className="h-4 w-4 text-high animate-flicker" />SOS & contacts</Link>
        <Link to="/map" search={{ safe: 1 }} className="glass flex items-center gap-2 rounded-2xl p-3 text-sm font-medium active:scale-95 transition"><ShieldCheck className="h-4 w-4 text-low" />Safe zones</Link>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning 👋" : h < 17 ? "Good afternoon 👋" : "Good evening 👋";
}

function Gauge({ value, level }: { value: number; level: "low" | "medium" | "high" }) {
  const pct = Math.min(1, value / 5), r = 24, c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle cx="30" cy="30" r={r} fill="none" strokeLinecap="round" strokeWidth="6" stroke={level === "high" ? "var(--hazard-high)" : level === "medium" ? "var(--hazard-med)" : "var(--hazard-low)"} strokeDasharray={`${c * pct} ${c}`} className="transition-all duration-1000" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-extrabold">{value}<span className="sr-only">/5</span></span>
    </div>
  );
}
