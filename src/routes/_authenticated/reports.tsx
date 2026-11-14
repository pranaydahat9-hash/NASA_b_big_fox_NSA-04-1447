import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, Eye, Trash2, Loader2, Target, History, Megaphone, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { assessArea, getClimateTrend, getPastWeek, getSafeZones, reverseGeocode } from "@/lib/hazards.functions";
import { buildReportPdf } from "@/lib/pdf";
import { saveReport, listReports, deleteReport, type SavedReport } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";
import { useHere } from "@/components/app/Here";
import { LevelBadge, Panel, Stat, ago } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { haptic } from "@/lib/haptics";
import { setFoxContext } from "@/lib/fox-bus";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/hazard-model";

type S = { make?: number | undefined; lat?: number | undefined; lon?: number | undefined; name?: string | undefined };
export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: (s: Record<string, unknown>): S => ({
    make: s["make"] ? 1 : undefined,
    lat: Number.isFinite(Number(s["lat"])) && s["lat"] != null ? Number(s["lat"]) : undefined,
    lon: Number.isFinite(Number(s["lon"])) && s["lon"] != null ? Number(s["lon"]) : undefined,
    name: typeof s["name"] === "string" ? s["name"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Reports & accuracy — FOX" }, { name: "description", content: "Download PDF disaster reports with NASA data, check last week's prediction accuracy and share community reports." }, { property: "og:title", content: "Reports & accuracy — FOX" }, { property: "og:description", content: "PDF disaster reports, prediction accuracy and community reports." }] }),
  component: Reports,
});

const HAZ = ["flood", "heavy_rain", "storm", "heatwave", "earthquake", "wildfire", "landslide", "tsunami"];

function Reports() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { loc, button } = useHere();
  const trendFn = useServerFn(getClimateTrend), assessFn = useServerFn(assessArea), zonesFn = useServerFn(getSafeZones), revFn = useServerFn(reverseGeocode), weekFn = useServerFn(getPastWeek);
  const [making, setMaking] = useState(false);
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const week = useQuery({ queryKey: ["past-week"], queryFn: () => weekFn(), staleTime: 30 * 60e3 });
  const mine = useQuery({ queryKey: ["my-reports"], queryFn: async () => (await supabase.from("community_reports").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const [rep, setRep] = useState({ hazard: "flood", description: "" });

  const refresh = () => listReports().then(setSaved).catch(() => {});
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (search.make) make(); }, []); // eslint-disable-line

  useEffect(() => {
    if (week.data) setFoxContext("Accuracy", `Hindcast hit rate ${week.data.hitRate}% over ${week.data.quakes.length} quakes. ${week.data.method}`);
    return () => setFoxContext("Accuracy", null);
  }, [week.data]);

  async function make() {
    const lat = search.lat ?? loc?.lat ?? 19.076, lon = search.lon ?? loc?.lon ?? 72.8777;
    setMaking(true); haptic("tap");
    try {
      const [a, z, r, tr] = await Promise.all([assessFn({ data: { lat, lon } }), zonesFn({ data: { lat, lon } }).catch(() => null), search.name ? Promise.resolve({ name: search.name, region: "" }) : revFn({ data: { lat, lon } }).catch(() => ({ name: null, region: "" })), trendFn({ data: { lat, lon, start: 1991 } }).catch(() => null)]);
      const place = [r.name, r.region].filter(Boolean).join(", ") || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
      const blob = await buildReportPdf(a, place, (z?.zones ?? []).slice(0, 10), tr);
      const item: SavedReport = { id: crypto.randomUUID(), title: `Hazard report — ${place}`, place, createdAt: new Date().toISOString(), level: a.overall, blob };
      await saveReport(item); await refresh(); haptic("success");
      setPreview(URL.createObjectURL(blob));
      toast.success("Report saved for offline use");
    } catch (e) { toast.error("Could not build report: " + (e as Error).message); }
    finally { setMaking(false); }
  }
  const download = (r: SavedReport) => { const u = URL.createObjectURL(r.blob); const el = document.createElement("a"); el.href = u; el.download = `${r.title.replace(/[^\w]+/g, "_")}.pdf`; el.click(); };

  async function submitReport() {
    if (rep.description.trim().length < 10) return void toast.error("Describe what you see (at least 10 characters)");
    if (!loc) return void toast.error("Share your location first so the report is pinned correctly");
    const { error } = await supabase.from("community_reports").insert({ hazard: rep.hazard, description: rep.description.trim().slice(0, 500), lat: loc.lat, lon: loc.lon });
    if (error) return void toast.error(error.message);
    haptic("success"); setRep({ ...rep, description: "" }); qc.invalidateQueries({ queryKey: ["my-reports"] }); toast.success("Report submitted");
  }

  return (
    <div className="space-y-4">
      <Panel title="PDF hazard report" icon={<FileDown className="h-4 w-4 text-primary" />} right={button}>
        <p className="text-xs text-muted-foreground">Live data from NASA, USGS, Open-Meteo & OpenStreetMap with map, charts, sources and timestamps. Unavailable sources are stated in the report.</p>
        <Button className="mt-3 w-full gap-2" onClick={make} disabled={making}>{making ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Generate report for {search.name ?? (loc ? "my location" : "Mumbai")}</Button>
        {preview && <iframe title="Report preview" src={preview} className="mt-3 h-96 w-full rounded-xl border bg-card" />}
      </Panel>

      <Panel title="Saved reports (offline)" icon={<History className="h-4 w-4 text-cyan" />}>
        {saved.length === 0 ? <p className="text-xs text-muted-foreground">No reports yet.</p> : (
          <ul className="space-y-1.5">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border bg-surface/60 p-2 text-xs">
                <LevelBadge level={r.level as Level} />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{r.place}</div><div className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div></div>
                <button aria-label="Preview" onClick={() => setPreview(URL.createObjectURL(r.blob))} className="rounded p-1.5 hover:bg-muted"><Eye className="h-4 w-4" /></button>
                <button aria-label="Download" onClick={() => download(r)} className="rounded p-1.5 hover:bg-muted"><FileDown className="h-4 w-4" /></button>
                <button aria-label="Delete" onClick={async () => { await deleteReport(r.id); refresh(); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Last week's prediction accuracy" icon={<Target className="h-4 w-4 text-primary" />} right={week.data && <span className="text-[10px] text-muted-foreground">{ago(week.data.fetchedAt)}</span>}>
        {week.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking real past events…</p>}
        {week.data && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Hit rate" value={week.data.hitRate ?? "–"} unit="%" accent="text-primary" />
              <Stat label="Quakes checked" value={week.data.quakes.length} />
              <Stat label="NASA events 7d" value={week.data.events.length} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{week.data.method}</p>
            <ul className="mt-2 space-y-1">
              {week.data.quakes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2 rounded-lg border bg-surface/60 p-2 text-xs">
                  <a href={q.url} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline">M{q.mag} · {q.place}</a>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 font-mono", q.flagged ? "text-low" : "text-med")}>{q.flagged ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{q.priorEvents ?? "?"} prior</span>
                </li>
              ))}
            </ul>
            <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">Past-week NASA EONET events ({week.data.events.length})</summary>
              <ul className="mt-1 space-y-1">{week.data.events.map((e: any) => <li key={e.id}><a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{e.category}: {e.title} <ExternalLink className="h-3 w-3" /></a> <span className="text-muted-foreground">{e.date ? new Date(e.date).toLocaleDateString() : ""}</span></li>)}</ul>
            </details>
            <p className="mt-2 text-[10px] text-muted-foreground">Sources: {week.data.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-2 text-primary underline">{s.name}</a>)}</p>
          </>
        )}
      </Panel>

      <Panel title="Report what you see" icon={<Megaphone className="h-4 w-4 text-high" />}>
        <div className="flex flex-wrap gap-1.5">{HAZ.map((h) => <button key={h} onClick={() => setRep({ ...rep, hazard: h })} className={cn("rounded-full border px-2.5 py-1 text-[11px] capitalize transition active:scale-95", rep.hazard === h ? "border-primary bg-primary/15 text-primary" : "bg-surface/60")}>{h.replace("_", " ")}</button>)}</div>
        <Textarea className="mt-2" placeholder="e.g. Water knee-deep on the main road near the station" value={rep.description} maxLength={500} onChange={(e) => setRep({ ...rep, description: e.target.value })} />
        <Button className="mt-2 w-full" onClick={submitReport}>Submit with my location</Button>
        {(mine.data ?? []).length > 0 && <ul className="mt-3 space-y-1 text-xs">{mine.data!.map((r) => <li key={r.id} className="rounded-lg border bg-surface/60 p-2"><span className="font-medium capitalize">{r.hazard.replace("_", " ")}</span> · {r.description} <span className="text-muted-foreground">· {ago(r.created_at)}</span></li>)}</ul>}
      </Panel>
    </div>
  );
}
