import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, MapPin, Volume2, VolumeX, X } from "lucide-react";
import { useLastLocation } from "@/lib/location";
import { useAssessment } from "@/lib/use-assessment";
import { alertTier, type Hazard, type Level } from "@/lib/hazard-model";
import { getSafeZones } from "@/lib/hazards.functions";
import { sendAlertSms } from "@/lib/sos.functions";
import { startAlarm, haptic } from "@/lib/haptics";
import { useSettings } from "@/lib/settings";
import { onFox } from "@/lib/fox-bus";
import { automaticAlertSmsAllowed } from '@/lib/emergency-policy';
import { HAZ_NAME, HazardGlyph } from "./bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Active = { tier: Level; hazard: Hazard; drill: boolean };

export function AlertCenter() {
  const loc = useLastLocation();
  const { data } = useAssessment(loc?.lat, loc?.lon);
  const { s } = useSettings();
  const [active, setActive] = useState<Active | null>(null);
  const [safe, setSafe] = useState<{ name: string; distKm: number; lat: number; lon: number } | null>(null);
  const [sms, setSms] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const safeFn = useServerFn(getSafeZones);
  const smsFn = useServerFn(sendAlertSms);

  // Real alerts from the assessment
  useEffect(() => {
    if (!data) return;
    for (const tier of ["high", "medium"] as Level[]) {
      const hz = data.hazards.find((h) => alertTier(h.level, h.peakAt) === tier);
      if (!hz) continue;
      if (tier === "high" && !s.notifyHigh) continue;
      if (tier === "medium" && !s.notifyMedium) continue;
      const key = `fox.alert.${tier}.${hz.type}.${(hz.peakAt ?? "").slice(0, 10)}.${data.lat.toFixed(2)}`;
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, "1");
      setActive({ tier, hazard: hz, drill: false });
      break;
    }
  }, [data, s.notifyHigh, s.notifyMedium]);

  // Drills (Settings → test alerts, or FOX)
  useEffect(() => onFox("drill", (tier: Level) => {
    const hz: Hazard = { type: "flood", level: tier, score: tier === "high" ? 88 : 55, peakAt: new Date(Date.now() + 30 * 3.6e6).toISOString(), window: "DRILL — simulated", harm: "This is a drill to test the alert system.", relevance: "Drill", radiusKm: 10, areaKm2: 314, readings: [] };
    setActive({ tier, hazard: hz, drill: true });
  }), []);

  useEffect(() => {
    if (!active || active.tier !== "high") return;
    haptic("warn");
    setSafe(null); setSms(null);
    if (s.alarmSound) { try { stopRef.current = startAlarm(120_000); } catch { setSms('Alarm sound unavailable in this browser.'); } }
    const l = loc;
    if (l) safeFn({ data: { lat: l.lat, lon: l.lon } }).then((r) => {
      const best = [...r.zones].sort((a, b) => ((b.elevation ?? 0) - (a.elevation ?? 0)) * 0.002 + (a.distKm - b.distKm))[0];
      if (best) setSafe(best);
      const text = `${active.drill ? "[DRILL] " : ""}FOX HIGH ALERT: ${HAZ_NAME[active.hazard.type]} expected ${active.hazard.window}. ${active.hazard.harm}${best ? ` Nearest safe area: ${best.name}, ${best.distKm} km — https://maps.google.com/?q=${best.lat},${best.lon}` : ""}`;
      if (automaticAlertSmsAllowed(active.drill)) smsFn({ data: { text } }).then((x) => setSms(x.reason ?? x.deliveries.map((d) => `${d.status}: ${d.detail}`).join("; ") ?? null)).catch(() => setSms("SMS failed to send"));
    }).catch(() => {});
    return () => { stopRef.current?.(); stopRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const close = () => { stopRef.current?.(); stopRef.current = null; setActive(null); setSafe(null); setSms(null); };
  if (!active) return null;

  if (active.tier === "high") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center text-destructive-foreground animate-alarm" role="alertdialog" aria-label={active.drill ? 'Red-alert drill' : 'High hazard alert'}>
        <AlertTriangle className="h-16 w-16 animate-jitter" />
        <div className="font-mono text-xs tracking-[0.3em]">{active.drill ? "DRILL · " : ""}HIGH ALERT · 24–48 H</div>
        <h2 className="text-3xl font-bold">{HAZ_NAME[active.hazard.type]}</h2>
        <p className="max-w-sm text-sm">{active.hazard.window}. {active.hazard.harm}</p>
        {active.drill && <p className="text-xs">Practice only · No messages sent · No emergency services contacted</p>}
        {safe && (
          <Link to="/map" search={{ lat: safe.lat, lon: safe.lon, safe: 1 }} onClick={close} className="haptic flex items-center gap-2 rounded-2xl bg-background/20 px-4 py-3 text-sm font-semibold">
            <MapPin className="h-4 w-4" /> Nearest safe area: {safe.name} · {safe.distKm} km
          </Link>
        )}
        {sms && <p className="max-w-sm text-[11px] opacity-90">SMS: {sms}</p>}
        <div className="flex gap-2">
          <Button variant="glass" onClick={() => { stopRef.current?.(); stopRef.current = null; }}><VolumeX /> Silence</Button>
          <Button variant="glass" onClick={close}><X /> I'm safe</Button>
        </div>
        <Button asChild variant="glass"><Link to="/sos" onClick={close}>Direct SOS</Link></Button>
        {!s.alarmSound && <p className="flex items-center gap-1 text-xs"><Volume2 className="h-3 w-3" /> Alarm sound is off in Settings</p>}
      </div>
    );
  }
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="glass border-med/60">
        <DialogHeader>
          <div className="flex items-center gap-3"><HazardGlyph type={active.hazard.type} level="medium" size="md" />
            <div><DialogTitle className="text-med">{active.drill ? "Drill · " : ""}Medium alert · {HAZ_NAME[active.hazard.type]}</DialogTitle>
              <DialogDescription>{active.hazard.window}</DialogDescription></div></div>
        </DialogHeader>
        <p className="text-sm">{active.hazard.harm}</p>
        <p className="text-xs text-muted-foreground">Expected this month. Prepare now: check your go-bag, contacts and the nearest safe zone.</p>
        <div className="flex gap-2"><Button asChild variant="neon" className="flex-1"><Link to="/prevent" onClick={close}>Prepare</Link></Button><Button variant="glass" onClick={close}>Dismiss</Button></div>
      </DialogContent>
    </Dialog>
  );
}
