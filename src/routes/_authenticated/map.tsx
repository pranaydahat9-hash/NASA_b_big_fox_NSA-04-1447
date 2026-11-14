import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Crosshair, Layers, ShieldCheck, Navigation, Download, Bookmark, ChevronDown, Loader2, FileDown, Hospital, Flame, Activity, Satellite } from "lucide-react";
import { searchPlaces, reverseGeocode, getGlobalEvents, getSafeZones, getRoute } from "@/lib/hazards.functions";
import { useAssessment } from "@/lib/use-assessment";
import { requestLocation, getLastLocation } from "@/lib/location";
import { useSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";
import { setFoxContext } from "@/lib/fox-bus";
import { downloadArea, saveArea, cachedTileBlobUrl, TILE_PROVIDERS, type BaseStyle } from "@/lib/offline";
import { buildReportPdf } from "@/lib/pdf";
import { saveReport } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";
import { HAZ_NAME, HazardGlyph, LevelBadge, SourceList, Stat, ago, levelText } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { FireGraph } from "@/components/app/FireGraph";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Level } from "@/lib/hazard-model";

type S = { q?: string | undefined; lat?: number | undefined; lon?: number | undefined; safe?: number | undefined };
export const Route = createFileRoute("/_authenticated/map")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    lat: s["lat"] != null && Number.isFinite(Number(s["lat"])) ? Number(s["lat"]) : undefined,
    lon: s["lon"] != null && Number.isFinite(Number(s["lon"])) ? Number(s["lon"]) : undefined,
    safe: s["safe"] ? 1 : undefined,
  }),
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Live hazard map — FOX" }, { name: "description", content: "Tap any place to get its disaster prediction, safe zones and evacuation routes." }, { property: "og:title", content: "Live hazard map — FOX" }, { property: "og:description", content: "Tap any place to get its disaster prediction, safe zones and evacuation routes." }] }),
  component: MapPage,
});

const LCOL: Record<Level, string> = { low: "#2ec27e", medium: "#f2c230", high: "#ef4444" };

function MapPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/map" });
  const { s } = useSettings();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const Lref = useRef<any>(null);
  const layers = useRef<Record<string, any>>({});
  const [point, setPoint] = useState<{ lat: number; lon: number; name?: string | undefined } | null>(null);
  const [q, setQ] = useState(search.q ?? "");
  const [qDeb, setQDeb] = useState("");
  const [show, setShow] = useState({ quakes: true, events: true, safe: !!search.safe, fires: true });
  const [sheet, setSheet] = useState<"assess" | "safe">(search.safe ? "safe" : "assess");
  const [openHaz, setOpenHaz] = useState<string | null>(null);
  const [route, setRoute] = useState<Awaited<ReturnType<typeof getRoute>> | null>(null);
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  const searchFn = useServerFn(searchPlaces);
  const revFn = useServerFn(reverseGeocode);
  const safeFn = useServerFn(getSafeZones);
  const routeFn = useServerFn(getRoute);
  const style: BaseStyle = s.theme === "abyss" ? "dark" : "light";

  useEffect(() => { const id = setTimeout(() => setQDeb(q), 300); return () => clearTimeout(id); }, [q]);
  const suggestions = useQuery({ queryKey: ["places", qDeb], enabled: qDeb.length >= 2 && qDeb !== point?.name, queryFn: () => searchFn({ data: { q: qDeb } }) });
  const global = useQuery({ queryKey: ["global"], queryFn: () => getGlobalEvents(), staleTime: 10 * 60e3 });
  const assess = useAssessment(point?.lat, point?.lon);
  const safe = useQuery({ queryKey: ["safe", point?.lat?.toFixed(3), point?.lon?.toFixed(3)], enabled: !!point && (show.safe || sheet === "safe"), queryFn: () => safeFn({ data: { lat: point!.lat, lon: point!.lon } }), staleTime: 30 * 60e3 });

  const pick = async (lat: number, lon: number, name?: string) => {
    setPoint({ lat, lon, name }); setRoute(null); setOpenHaz(null);
    mapRef.current?.flyTo([lat, lon], Math.max(mapRef.current.getZoom(), 10), { duration: 0.8 });
    if (!name) revFn({ data: { lat, lon } }).then((r) => r.name && setPoint((p) => (p && p.lat === lat ? { ...p, name: r.name! + (r.region ? `, ${r.region}` : "") } : p))).catch(() => {});
  };

  // Init map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      Lref.current = L;
      const start = search.lat != null && search.lon != null ? [search.lat, search.lon] : getLastLocation() ? [getLastLocation()!.lat, getLastLocation()!.lon] : [19.076, 72.8777];
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView(start as any, 9);
      const Cached = L.TileLayer.extend({
        createTile(coords: any, done: any) {
          const img = document.createElement("img"); img.crossOrigin = "anonymous"; img.alt = "";
          const url = (this as any).getTileUrl(coords);
          cachedTileBlobUrl(url).then((b) => { img.onload = () => done(null, img); img.onerror = (e) => done(e, img); img.src = b ?? url; });
          return img;
        },
      });
      layers.current["base"] = new (Cached as any)(TILE_PROVIDERS[style].url, { maxZoom: 18, attribution: TILE_PROVIDERS[style].attribution }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      map.on("click", (e: any) => pick(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      if (search.lat != null && search.lon != null) pick(search.lat, search.lon);
      else if (!search.q) { const l = getLastLocation(); if (l) pick(l.lat, l.lon); else pick(19.076, 72.8777, "Mumbai, Maharashtra, India"); }
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FOX search → map
  useEffect(() => {
    if (!search.q) return;
    setQ(search.q);
    searchFn({ data: { q: search.q } }).then((r) => { if (r[0]) pick(r[0].lat, r[0].lon, `${r[0].name}, ${r[0].region}`); else toast.error(`No place found for "${search.q}"`); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);
  useEffect(() => { if (search.lat != null && search.lon != null && mapRef.current) pick(search.lat, search.lon); if (search.safe) { setShow((x) => ({ ...x, safe: true })); setSheet("safe"); } /* eslint-disable-next-line */ }, [search.lat, search.lon, search.safe]);

  // Base style switch
  useEffect(() => { layers.current["base"]?.setUrl(TILE_PROVIDERS[style].url); }, [style]);

  // Overlays
  const icon = (color: string, size = 12, pulse = false) => Lref.current?.divIcon({ className: "fox-pin", iconSize: [size, size], html: `${pulse ? `<span class="ring" style="background:${color}"></span>` : ""}<span class="dot" style="background:${color};box-shadow:0 0 8px ${color}"></span>` });
  useEffect(() => {
    const L = Lref.current, map = mapRef.current; if (!L || !map) return;
    layers.current["global"]?.remove();
    const g = L.layerGroup();
    if (show.quakes) global.data?.quakes.forEach((x: any) => L.marker([x.lat, x.lon], { icon: icon("#ff8a3d", Math.min(22, 6 + x.mag * 2), x.mag >= 6) }).bindPopup(`<b>M${x.mag} earthquake</b><br/>${x.place}<br/>${new Date(x.time).toUTCString()}<br/><a href="${x.url}" target="_blank">USGS ↗</a>`).addTo(g));
    if (show.events) global.data?.events.forEach((x: any) => L.marker([x.lat, x.lon], { icon: icon(/fire/i.test(x.category) ? "#ff4d6d" : /storm/i.test(x.category) ? "#4dd8ff" : /volcan/i.test(x.category) ? "#ffb703" : "#c77dff", 10, true) }).bindPopup(`<b>${x.title}</b><br/>${x.category} · ${x.date?.slice(0, 10)}<br/><a href="${x.url}" target="_blank">NASA EONET source ↗</a>`).addTo(g));
    g.addTo(map); layers.current["global"] = g;
  }, [global.data, show.quakes, show.events]);

  useEffect(() => {
    const L = Lref.current, map = mapRef.current; if (!L || !map) return;
    layers.current["point"]?.remove();
    if (!point) return;
    const g = L.layerGroup();
    const a = assess.data;
    a?.hazards.filter((h) => h.radiusKm > 0).forEach((h) => L.circle([point.lat, point.lon], { radius: h.radiusKm * 1000, color: LCOL[h.level], weight: 1, fillOpacity: 0.06, dashArray: "4 6" }).addTo(g));
    if (show.fires) a?.fires.points.forEach((f) => L.circleMarker([f.lat, f.lon], { radius: 3, color: "#ff4d6d", weight: 0, fillOpacity: 0.9 }).bindPopup(`VIIRS hotspot · FRP ${f.frp} MW · ${f.date}`).addTo(g));
    L.marker([point.lat, point.lon], { icon: icon(a ? LCOL[a.overall] : "#ec408c", 18, true) }).addTo(g);
    if (show.safe) safe.data?.zones.forEach((z: any) => L.marker([z.lat, z.lon], { icon: icon("#2ec27e", 12) }).bindPopup(`<b>${z.name}</b><br/>${z.kind.replace("_", " ")} · ${z.distKm} km${z.elevation != null ? ` · ${Math.round(z.elevation)} m elev.` : ""}`).addTo(g));
    if (route) L.polyline(route.coords, { color: "#4dd8ff", weight: 5, opacity: 0.9 }).addTo(g);
    g.addTo(map); layers.current["point"] = g;
  }, [point, assess.data, safe.data, show.safe, show.fires, route]);

  // Expose to FOX
  useEffect(() => {
    const a = assess.data;
    setFoxContext("Map assessment", a ? `Place: ${point?.name ?? ""} (${a.lat.toFixed(3)},${a.lon.toFixed(3)}), generated ${a.generatedAt}. Overall ${a.overall}, alert tier ${a.alert}.\n` + a.hazards.map((h) => `- ${h.type}: ${h.level} score ${h.score}; ${h.window}; impact: ${h.harm}; coverage ${h.radiusKm} km radius; sources: ${h.readings.map((r) => `${r.label}=${r.value} @${r.observedAt} (${r.source})`).join("; ")}`).join("\n") : null);
    return () => setFoxContext("Map assessment", null);
  }, [assess.data, point?.name]);

  const rankedSafe = useMemo(() => {
    const z = safe.data?.zones ?? []; const here = safe.data?.hereElevation ?? null;
    const floodRisk = assess.data?.hazards.find((h) => h.type === "flood" || h.type === "tsunami")?.level !== "low";
    return z.map((x: any) => ({ ...x, higher: here != null && x.elevation != null ? Math.round(x.elevation - here) : null }))
      .sort((a: any, b: any) => (floodRisk ? (b.higher ?? 0) * 0.01 : 0) + a.distKm - b.distKm - (floodRisk ? (a.higher ?? 0) * 0.01 : 0));
  }, [safe.data, assess.data]);

  const locate = async () => { try { const l = await requestLocation(); pick(l.lat, l.lon); } catch (e) { toast.error((e as Error).message); } };
  const saveLoc = async () => {
    if (!point) return;
    const { error } = await supabase.from("saved_locations").insert({ name: point.name?.split(",")[0] ?? `${point.lat.toFixed(3)},${point.lon.toFixed(3)}`, lat: point.lat, lon: point.lon });
    error ? toast.error(error.message) : toast.success("Location saved");
  };
  const goRoute = async (z: { lat: number; lon: number; name: string }) => {
    if (!point) return;
    const r = await routeFn({ data: { from: point, to: z } });
    if (!r) { toast.error("No route found"); return; }
    setRoute(r); mapRef.current?.fitBounds(r.coords, { padding: [30, 30] });
    toast.success(`${z.name}: ${r.distanceKm} km · ~${r.walkMin} min walk / ${r.durationMin} min drive`);
  };
  const downloadSafeMap = async () => {
    if (!point) return;
    setDl({ done: 0, total: 1 });
    try {
      const n = await downloadArea(style, point.lat, point.lon, 4, (done, total) => setDl({ done, total }));
      saveArea({ id: `${point.lat.toFixed(3)},${point.lon.toFixed(3)}`, name: point.name ?? "Area", lat: point.lat, lon: point.lon, radiusKm: 4, tiles: n, style, savedAt: new Date().toISOString(), zones: rankedSafe.slice(0, 30) });
      if (assess.data) {
        const blob = await buildReportPdf(assess.data, point.name ?? "Selected area", rankedSafe);
        await saveReport({ id: crypto.randomUUID(), title: `Safe-zone map · ${point.name ?? ""}`, place: point.name ?? "", createdAt: new Date().toISOString(), level: assess.data.overall, blob });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `FOX-safe-zones-${(point.name ?? "area").split(",")[0]}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
      toast.success(`Saved offline: ${n} map tiles + ${rankedSafe.length} safe zones`);
    } catch (e) { toast.error("Download failed: " + (e as Error).message); }
    setDl(null);
  };

  const a = assess.data;
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="glass flex items-center gap-2 rounded-2xl px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlace", s.language)} className="h-11 flex-1 bg-transparent text-sm outline-none" />
          <button onClick={locate} aria-label={t("useMyLocation", s.language)} className="haptic rounded-lg p-2 text-cyan hover:bg-accent"><Crosshair className="h-4 w-4" /></button>
        </div>
        {suggestions.data && suggestions.data.length > 0 && q === qDeb && (
          <ul className="glass absolute inset-x-0 top-12 z-[500] overflow-hidden rounded-2xl">
            {suggestions.data.map((p: any, i: number) => (
              <li key={i}><button className="haptic w-full px-4 py-2.5 text-left text-sm hover:bg-accent" onClick={() => { const nm = `${p.name}, ${p.region}`; setQ(nm); setQDeb(nm); pick(p.lat, p.lon, nm); }}>
                <b>{p.name}</b> <span className="text-xs text-muted-foreground">{p.region}</span></button></li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border glow">
        <div ref={mapEl} className="h-[46vh] min-h-[300px] w-full" />
        <div className="absolute left-2 top-2 z-[400] flex flex-col gap-1.5">
          {([["quakes", Activity, "USGS quakes"], ["events", Satellite, "NASA events"], ["fires", Flame, "FIRMS fires"], ["safe", Hospital, "Safe zones"]] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setShow((x) => ({ ...x, [k]: !x[k] }))} className={cn("haptic flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold backdrop-blur", show[k] ? "border-primary bg-primary/20 text-foreground" : "bg-background/60 text-muted-foreground")}>
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-lg bg-background/70 px-2 py-1 font-mono text-[9px] text-muted-foreground backdrop-blur">
          <Layers className="mr-1 inline h-3 w-3" />{global.data ? `${global.data.quakes.length} quakes · ${global.data.events.length} NASA events · ${ago(global.data.fetchedAt)}` : "loading layers…"}
        </div>
      </div>

      {a && <FireGraph assessment={a} />}
      {point && (
        <div className="glass rounded-2xl p-4 animate-float-up">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold">{point.name ?? "Selected point"}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{point.lat.toFixed(4)}, {point.lon.toFixed(4)} {a && `· updated ${ago(a.generatedAt)}`}{a?.fromCache && " · OFFLINE COPY"}</div>
            </div>
            {a && <LevelBadge level={a.overall} />}
          </div>
          <div className="mt-3 flex gap-1 rounded-xl bg-surface p-1">
            {(["assess", "safe"] as const).map((k) => <button key={k} onClick={() => { setSheet(k); if (k === "safe") setShow((x) => ({ ...x, safe: true })); }} className={cn("haptic flex-1 rounded-lg py-1.5 text-xs font-semibold", sheet === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{k === "assess" ? "Hazard prediction" : t("safeZones", s.language)}</button>)}
          </div>

          {sheet === "assess" && (
            <div className="mt-3 space-y-2">
              {assess.isLoading && <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Pulling NASA, USGS, GloFAS and weather data…</div>}
              {assess.error && <p className="text-sm text-high">Could not assess this area: {(assess.error as Error).message}</p>}
              {a && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="Temp" value={a.weather?.current.temp?.toFixed(1) ?? "–"} unit="°C" />
                    <Stat label="Gust" value={a.weather?.current.gust?.toFixed(0) ?? "–"} unit="km/h" />
                    <Stat label="Rain" value={a.weather?.current.precip?.toFixed(1) ?? "–"} unit="mm" />
                    <Stat label="River" value={a.water.ratio ?? "–"} unit="×" accent={a.water.ratio && a.water.ratio > 1.8 ? "text-med" : ""} />
                  </div>
                  {a.hazards.map((h) => (
                    <div key={h.type} className={cn("rounded-xl border bg-surface/50 transition-colors", openHaz === h.type && "border-primary/60")}>
                      <button onClick={() => setOpenHaz(openHaz === h.type ? null : h.type)} className="haptic flex w-full items-center gap-3 p-2.5 text-left">
                        <HazardGlyph type={h.type} level={h.level} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="text-sm font-semibold">{HAZ_NAME[h.type]}</span><span className={cn("font-mono text-[10px]", levelText[h.level])}>{h.score}/100</span></div>
                          <div className="truncate text-[11px] text-muted-foreground">{h.window}</div>
                        </div>
                        <LevelBadge level={h.level} />
                        <ChevronDown className={cn("h-4 w-4 transition-transform", openHaz === h.type && "rotate-180")} />
                      </button>
                      {openHaz === h.type && (
                        <div className="space-y-2 border-t p-3 text-xs">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", h.level === "high" ? "bg-high" : h.level === "medium" ? "bg-med" : "bg-low")} style={{ width: `${h.score}%` }} /></div>
                          <p><b>How harmful:</b> {h.harm}</p>
                          <p><b>Relevance:</b> {h.relevance}</p>
                          <p><b>Area covered:</b> {h.areaKm2 ? `~${h.radiusKm.toFixed(0)} km radius · ${h.areaKm2.toLocaleString()} km² (estimate, dashed ring on map)` : "No significant area affected"}</p>
                          <p><b>Expected peak:</b> {h.peakAt ? `${new Date(h.peakAt).toUTCString().slice(0, 22)} (${ago(h.peakAt)})` : "–"}</p>
                          <div className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("sources", s.language)}</div>
                          <SourceList readings={h.readings} />
                        </div>
                      )}
                    </div>
                  ))}
                  {a.unavailable.length > 0 && <div className="rounded-xl border border-dashed p-2 text-[11px] text-muted-foreground"><b>Not available:</b> {a.unavailable.join(" · ")}</div>}
                  <div className="flex gap-2 pt-1">
                    <Button variant="glass" size="sm" onClick={saveLoc}><Bookmark /> Save place</Button>
                    <Button variant="neon" size="sm" onClick={() => navigate({ to: "/reports", search: { make: 1, lat: point.lat, lon: point.lon, name: point.name } as any })}><FileDown /> PDF report</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {sheet === "safe" && (
            <div className="mt-3 space-y-2">
              <Button variant="neon" className="w-full" onClick={downloadSafeMap} disabled={!!dl || !safe.data}><Download /> Download safe-zone map (offline + PDF)</Button>
              {dl && <div className="space-y-1"><Progress value={(dl.done / dl.total) * 100} /><div className="text-center font-mono text-[10px] text-muted-foreground">{dl.done}/{dl.total} tiles</div></div>}
              {route && <div className="rounded-xl border border-cyan/50 bg-cyan/10 p-2.5 text-xs"><div className="flex items-center gap-2 font-semibold text-cyan"><Navigation className="h-3.5 w-3.5" />{route.distanceKm} km · ~{route.walkMin} min walk · {route.durationMin} min drive</div><ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted-foreground">{route.steps.slice(0, 6).map((x: string, i: number) => <li key={i}>{x}</li>)}</ol><div className="mt-1 text-[10px] text-muted-foreground">{route.source}</div></div>}
              {safe.isLoading && <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Finding hospitals, shelters, assembly points…</div>}
              {safe.data?.error && <p className="text-xs text-med">{safe.data.error}</p>}
              {rankedSafe.slice(0, 12).map((z: any) => (
                <div key={z.id} className="flex items-center gap-3 rounded-xl border bg-surface/50 p-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-low/50 text-low"><ShieldCheck className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{z.name}</div><div className="text-[11px] text-muted-foreground">{z.kind.replace("_", " ")} · {z.distKm} km{z.higher != null && ` · ${z.higher >= 0 ? "+" : ""}${z.higher} m vs you`}</div></div>
                  <Button size="sm" variant="glass" onClick={() => goRoute(z)}><Navigation /> Route</Button>
                </div>
              ))}
              {safe.data && <p className="text-[10px] text-muted-foreground">{safe.data.source} · fetched {ago(safe.data.fetchedAt)}. When flood risk is elevated, higher-ground sites rank first.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
