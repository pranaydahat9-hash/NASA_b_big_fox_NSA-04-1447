import { Activity, CloudRain, Flame, Thermometer, Waves, Wind, Droplets, Mountain, ExternalLink, Clock } from "lucide-react";
import type { HazardType, Level, Reading } from "@/lib/hazard-model";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import type { ReactNode } from "react";

export const HAZ_ICON: Record<HazardType, typeof Activity> = { flood: Waves, heavy_rain: CloudRain, heatwave: Thermometer, storm: Wind, earthquake: Activity, tsunami: Droplets, wildfire: Flame, landslide: Mountain };
export const HAZ_NAME: Record<HazardType, string> = { flood: "Flood", heavy_rain: "Heavy rain", heatwave: "Heat wave", storm: "Storm / wind", earthquake: "Earthquake", tsunami: "Tsunami", wildfire: "Wildfire", landslide: "Landslide" };
export const levelText: Record<Level, string> = { low: "text-low", medium: "text-med", high: "text-high" };
export const levelBg: Record<Level, string> = { low: "bg-low", medium: "bg-med", high: "bg-high" };
export const levelBorder: Record<Level, string> = { low: "border-low/50", medium: "border-med/60", high: "border-high/70" };

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  const { s } = useSettings();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize", level === "high" ? "tint-high" : level === "medium" ? "tint-med" : "tint-low", levelText[level], className)}>
      <span className="relative flex h-1.5 w-1.5"><span className={cn("absolute inset-0 rounded-full animate-ping-slow", levelBg[level])} /><span className={cn("relative h-1.5 w-1.5 rounded-full", levelBg[level])} /></span>
      {t(level, s.language)}
    </span>
  );
}

/** Small, twitchy hazard glyph with radar ring. */
export function HazardGlyph({ type, level, size = "sm" }: { type: HazardType; level: Level; size?: "sm" | "md" }) {
  const Icon = HAZ_ICON[type];
  const box = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-full", box, level === "high" ? "tint-high" : level === "medium" ? "tint-med" : "tint-low")}>
      {level !== "low" && <span className={cn("absolute inset-0 rounded-full opacity-30 animate-ping-slow", levelBg[level])} />}
      <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5", levelText[level], level === "high" && "animate-jitter", level === "medium" && "animate-flicker")} strokeWidth={2.4} />
    </span>
  );
}

export function Panel({ title, icon, right, children, className }: { title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-[1.4rem] p-4 sm:p-5 animate-float-up", className)}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">{icon && <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10">{icon}</span>}{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function ago(iso: string | null | undefined) {
  if (!iso) return "–";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Math.abs(m) < 1) return "just now";
  if (m < 0) return `in ${fmtDur(-m)}`;
  return `${fmtDur(m)} ago`;
}
const fmtDur = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

export function SourceList({ readings }: { readings: Reading[] }) {
  if (!readings.length) return <p className="text-xs text-muted-foreground">No readings available.</p>;
  return (
    <ul className="space-y-1.5">
      {readings.map((r, i) => (
        <li key={i} className="rounded-lg border bg-surface/60 p-2 text-xs">
          <div className="flex items-start justify-between gap-2"><span className="font-medium">{r.label}</span><span className="font-mono text-cyan">{r.value}</span></div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{r.observedAt ? `${new Date(r.observedAt).toUTCString().slice(5, 22)} UTC · ${ago(r.observedAt)}` : "–"}</span>
            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">{r.source}<ExternalLink className="h-3 w-3" /></a>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Stat({ label, value, unit, accent }: { label: string; value: ReactNode; unit?: string; accent?: string | undefined }) {
  return (
    <div className="rounded-xl border bg-surface/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-lg font-semibold leading-tight", accent)}>{value}<span className="ml-0.5 text-xs text-muted-foreground">{unit}</span></div>
    </div>
  );
}
