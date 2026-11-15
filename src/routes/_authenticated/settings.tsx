import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Palette, Languages, Accessibility, Bell, User, MapPin, Trash2, LogOut, Info, Shield, HelpCircle, Download, Loader2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount } from "@/lib/sos.functions";
import { useSettings, type Settings } from "@/lib/settings";
import { useHere } from "@/components/app/Here";
import { Panel } from "@/components/app/bits";
import { DrillControls } from '@/components/app/DrillControls';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { haptic } from "@/lib/haptics";
import { emitFox } from "@/lib/fox-bus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Settings — B fox" }, { name: "description", content: "Language, themes, accessibility, notifications, saved places and account settings for B fox." }, { property: "og:title", content: "Settings — B fox" }, { property: "og:description", content: "Personalise B fox: language, themes, accessibility and alerts." }] }),
  component: SettingsPage,
});

function Row({ label, k, hint }: { label: string; k: keyof Settings; hint?: string }) {
  const { s, set } = useSettings();
  return (
    <label className="flex items-center justify-between gap-3 py-2 text-sm">
      <span>{label}{hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}</span>
      <Switch checked={!!s[k]} onCheckedChange={(v) => { haptic("tap"); set(k, v as any); }} />
    </label>
  );
}
function Chips<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Button size="sm" variant="outline" key={o.v} onClick={() => { haptic("tap"); onChange(o.v); }} className={cn("rounded-full border px-3 py-1.5 text-xs transition active:scale-95", value === o.v ? "border-primary bg-primary/15 text-primary" : "bg-surface/60")}>{o.l}</Button>)}</div>;
}

function SettingsPage() {
  const { s, set } = useSettings();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { loc } = useHere();
  const delFn = useServerFn(deleteAccount);
  const [prof, setProf] = useState({ display_name: "", phone: "" });
  const [email, setEmail] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const places = useQuery({ queryKey: ["saved-locations"], queryFn: async () => (await supabase.from("saved_locations").select("*").order("created_at", { ascending: false })).data ?? [] });

  useEffect(() => { (async () => {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return; setEmail(u.user.email ?? "");
    const { data } = await supabase.from("profiles").select("display_name, phone").eq("id", u.user.id).maybeSingle();
    if (data) setProf({ display_name: data.display_name ?? "", phone: data.phone ?? "" });
  })(); }, []);

  const saveProfile = async () => {
    if (prof.phone && !/^\+?[0-9 ()-]{7,20}$/.test(prof.phone)) return void toast.error("Enter a valid phone number with country code");
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, display_name: prof.display_name.trim().slice(0, 80) || null, phone: prof.phone.trim() || null });
    error ? toast.error(error.message) : (haptic("success"), toast.success("Profile saved"));
  };
  const addPlace = async () => {
    if (!loc) return void toast.error("Share your location first");
    if (!placeName.trim()) return void toast.error("Give this place a name");
    const { error } = await supabase.from("saved_locations").insert({ name: placeName.trim().slice(0, 60), lat: loc.lat, lon: loc.lon });
    if (error) return void toast.error(error.message);
    setPlaceName(""); qc.invalidateQueries({ queryKey: ["saved-locations"] });
  };
  const exportData = async () => {
    try {
      const tables = ["profiles", "emergency_contacts", "saved_locations", "sos_events", "community_reports", "report_verifications"] as const;
      const rows = await Promise.all(tables.map(async table => { const {data,error}=await supabase.from(table).select("*"); if(error) throw error; return [table,data]; }));
      const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),data:Object.fromEntries(rows)},null,2)],{type:"application/json"}));
      const a=document.createElement("a");a.href=url;a.download="B-fox-private-data.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    } catch { toast.error("Could not export your data"); }
  };
  const signOut = async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); };
  const doDelete = async () => {
    setBusy(true);
    try { await delFn(); localStorage.clear(); await supabase.auth.signOut(); toast.success("Account deleted"); nav({ to: "/" }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Panel title="Theme" icon={<Palette className="h-4 w-4 text-primary" />}>
        <Chips value={s.theme} onChange={(v) => set("theme", v)} options={[{ v: "abyss", l: "Dark blue" }, { v: "light", l: "Light" }, { v: "blossom", l: "Pink & white" }, { v: "system", l: "System" }]} />
      </Panel>
      <Panel title="Language" icon={<Languages className="h-4 w-4 text-cyan" />}>
        <Chips value={s.language} onChange={(v) => set("language", v)} options={[{ v: "en", l: "English" }, { v: "hi", l: "हिन्दी" }, { v: "mr", l: "मराठी" }]} />
        <p className="mt-2 text-[11px] text-muted-foreground">English, Hindi and Marathi are available for navigation and B fox voice. Some agency descriptions and page content remain in English; other languages are not yet translated.</p>
      </Panel>
      <Panel title="Accessibility" icon={<Accessibility className="h-4 w-4 text-primary" />}>
        <div className="py-2 text-sm">Text size <span className="font-mono text-xs text-muted-foreground">{Math.round(s.fontScale * 100)}%</span>
          <Slider className="mt-2" min={0.85} max={1.5} step={0.05} value={[s.fontScale]} onValueChange={([v]) => v !== undefined && set("fontScale", v)} />
        </div>
        <Row label="High contrast" k="highContrast" />
        <Row label="Reduce motion" k="reduceMotion" />
        <Row label="Click sounds & vibration" k="clicks" />
        <Row label="B fox speaks replies" k="voiceReplies" />
        <Row label="Hands-free “Hey B fox”" k="handsFree" hint="Keeps the microphone listening while the app is open" />
      </Panel>
      <Panel title="Notifications" icon={<Bell className="h-4 w-4 text-med" />}>
        <Row label="Low (green) — news notices" k="notifyLow" />
        <Row label="Medium (yellow) — pop-up alerts" k="notifyMedium" />
        <Row label="High (red) — alarm + SMS" k="notifyHigh" />
        <Row label="2-minute alarm sound" k="alarmSound" />
        <p className="mt-2 text-xs font-semibold">Test the alerts (drill)</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" className="border-low/60 text-low" onClick={() => toast("DRILL — low (green) notice. This is a simulated preparedness message, not a glacier observation.")}>Low</Button>
          <Button size="sm" variant="outline" className="border-med/60 text-med" onClick={() => emitFox("drill", "medium")}>Medium</Button>
          <Button size="sm" variant="outline" className="border-high/60 text-high" onClick={() => emitFox("drill", "high")}>High</Button>
        </div>
        <div className="mt-3"><DrillControls /></div>
        <Link to="/sos" className="mt-2 inline-block text-xs text-primary underline">Manage emergency contacts →</Link>
      </Panel>
      <Panel title="Account" icon={<User className="h-4 w-4 text-cyan" />}>
        <p className="mb-2 text-xs text-muted-foreground">{email}</p>
        <div className="grid gap-2">
          <Input placeholder="Your name (shown in SOS messages)" value={prof.display_name} onChange={(e) => setProf({ ...prof, display_name: e.target.value })} />
          <Input placeholder="Your mobile for SMS alerts (+91…)" inputMode="tel" value={prof.phone} onChange={(e) => setProf({ ...prof, phone: e.target.value })} />
          <Button onClick={saveProfile}>Save profile</Button>
        </div>
      </Panel>
      <Panel title="Saved places" icon={<Bookmark className="h-4 w-4 text-primary" />}>
        <ul className="space-y-1.5">
          {(places.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg border bg-surface/60 p-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <Link to="/map" search={{ lat: p.lat, lon: p.lon }} className="flex-1 truncate hover:underline">{p.name}</Link>
              <button aria-label="Remove" onClick={async () => { await supabase.from("saved_locations").delete().eq("id", p.id); qc.invalidateQueries({ queryKey: ["saved-locations"] }); }} className="rounded p-1 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2"><Input placeholder="Save current location as… (Home)" value={placeName} onChange={(e) => setPlaceName(e.target.value)} /><Button onClick={addPlace}>Save</Button></div>
        <Link to="/offline" className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Download className="h-3 w-3" />Offline maps & downloads</Link>
      </Panel>
      <Panel title="About, privacy & help" icon={<Info className="h-4 w-4 text-muted-foreground" />}>
        <details className="py-1 text-sm"><summary className="cursor-pointer">About B fox</summary><p className="mt-1 text-xs text-muted-foreground">B fox turns live NASA (EONET, POWER, FIRMS), USGS, Open-Meteo and OpenStreetMap data into area-specific hazard alerts. Predictions are rule-based on published agency thresholds and always show their sources.</p></details>
        <details className="py-1 text-sm"><summary className="cursor-pointer flex items-center gap-1"><Shield className="inline h-3 w-3" /> Data & privacy</summary><p className="mt-1 text-xs text-muted-foreground">Your contacts, saved places, SOS history and reports are visible only to you. Location is read only when you allow it. SOS shares your activation location with your saved contacts through Twilio; this is not continuous live tracking. Selected coordinates are also sent to weather, NASA and mapping services for area assessments. Settings and offline maps stay on this device.</p></details>
        <Button variant="outline" size="sm" className="my-2 gap-2" onClick={exportData}><Download className="h-3 w-3"/>Export my private data</Button>
        <details className="py-1 text-sm"><summary className="cursor-pointer flex items-center gap-1"><HelpCircle className="inline h-3 w-3" /> Help</summary><p className="mt-1 text-xs text-muted-foreground">Tap any place on the map for its prediction. Hold the SOS button 1.5 s or say “Hey B fox, help me”. In India dial 112 for emergencies.</p></details>
      </Panel>
      <Panel>
        <Button variant="outline" className="w-full gap-2" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button>
        <div className="mt-4 rounded-xl border border-high/50 p-3">
          <p className="text-sm font-medium text-high">Delete account</p>
          <p className="text-[11px] text-muted-foreground">Removes your profile, contacts, places, SOS history and reports permanently. Type DELETE to confirm.</p>
          <div className="mt-2 flex gap-2"><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" /><Button variant="destructive" disabled={confirm !== "DELETE" || busy} onClick={doDelete}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}</Button></div>
        </div>
      </Panel>
    </div>
  );
}
