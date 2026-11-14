import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Activity, Map as MapIcon, Radar, Satellite, ShieldAlert, ShieldCheck, Siren, Loader2, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from "recharts";
import { useAssessment } from "@/lib/use-assessment";
import { getGlobalEvents } from "@/lib/hazards.functions";
import { useHere } from "@/components/app/Here";
import { HAZ_NAME, HazardGlyph, LevelBadge, Panel, Stat, ago, levelBg, levelText, SourceList } from "@/components/app/bits";
import { setFoxContext } from "@/lib/fox-bus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Risk dashboard — FOX" }, { name: "description", content: "Live disaster risk for your location: floods, storms, heat, quakes and fires from real satellite and sensor data." }, { property: "og:title", content: "Risk dashboard — FOX" }, { property: "og:description", content: "Live disaster risk for your location from real satellite and sensor data." }] }),
  component: Dashboard,
});

const MUMBAI = { lat: 19.076, lon: 72.8777 };

function Dashboard() {
  const { loc, button } = useHere();
  const p = loc ?? MUMBAI;
  const a = useAssessment(p.lat, p.lon);
  const g = useQuery({ queryKey: ["global"], queryFn: () => getGlobalEvents(), staleTime: 10 * 60e3 });
  const d = a.data;

  useEffect(() => {
    if (!d) return;
    setFoxContext("Dashboard", `Location ${p.lat.toFixed(3)},${p.lon.toFixed(3)}. Overall ${d.overall}. Hazards: ${d.hazards.map((h) => `${h.type} ${h.level} score ${h.score} peak ${h.peakAt ?? "n/a"}`).join("; ")}`);
    return () => setFoxContext("Dashboard", null);
  }, [d, p.lat, p.lon]);

  const days = d?.weather?.daily.map((x) => ({ day: new Date(x.date).toLocaleDateString(undefined, { weekday: "short" }), rain: x.precip, tmax: x.tmax, gust: x.gust })) ?? [];

  return (
    <div className="space-y-4">
      <Panel title="Risk right now" icon={<Radar className="h-4 w-4 text-primary" />} right={button}>
        {!loc && <p className="mb-2 text-xs text-muted-foreground">Showing Mumbai until you share your location.</p>}
        {a.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Reading live satellite & sensor feeds…</p>}
        {a.error && <p className="text-sm text-high">Could not load live data: {(a.error as Error).message}</p>}
        {d && (
          <>
            <div className="flex items-center gap-4">
              <div className={cn("relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-2", d.overall === "high" ? "border-high" : d.overall === "medium" ? "border-med" : "border-low")}>
                <span className={cn("absolute inset-1 rounded-full opacity-20 animate-ping-slow", levelBg[d.overall])} />
                <ShieldAlert className={cn("h-8 w-8", levelText[d.overall], d.overall === "high" && "animate-jitter")} />
              </div>
              <div className="min-w-0">
                <LevelBadge level={d.overall} />
                <p className="mt-1 text-sm">{d.hazards.filter((h) => h.level !== "low").length ? `${d.hazards.filter((h) => h.level !== "low").length} hazard(s) need attention` : "No elevated hazards detected"}</p>
                <p className="text-[11px] text-muted-foreground">Updated {ago(d.generatedAt)}{(d as any).fromCache ? " · offline copy" : ""}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Stat label="Temp" value={d.weather?.current.temp ?? "–"} unit="°C" />
              <Stat label="Gust" value={d.weather?.current.gust ?? "–"} unit="km/h" />
              <Stat label="Rain" value={d.weather?.current.precip ?? "–"} unit="mm" />
              <Stat label="River" value={d.water.ratio != null ? `${d.water.ratio.toFixed(1)}×` : "–"} accent={d.water.ratio && d.water.ratio > 2 ? "text-high" : undefined} />
            </div>
          </>
        )}
      </Panel>

      {d && (
        <Panel title="Hazards for this area" icon={<Activity className="h-4 w-4 text-cyan" />}>
          <ul className="space-y-2">
            {[...d.hazards].sort((x, y) => y.score - x.score).map((h) => (
              <li key={h.type} className="rounded-xl border bg-surface/60 p-2.5">
                <div className="flex items-center gap-2.5">
                  <HazardGlyph type={h.type} level={h.level} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{HAZ_NAME[h.type]}</span><LevelBadge level={h.level} /></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700", levelBg[h.level])} style={{ width: `${h.score}%` }} /></div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{h.window} · ~{Math.round(h.areaKm2).toLocaleString()} km² · {h.harm}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/map" search={{ lat: p.lat, lon: p.lon }} className="mt-3 inline-flex items-center gap-1 text-xs text-primary">Full assessment on the map <ChevronRight className="h-3 w-3" /></Link>
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
