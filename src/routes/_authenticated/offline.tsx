import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Trash2, MapPin, Phone, LifeBuoy, FileText, WifiOff } from "lucide-react";
import { listAreas, deleteOfflineArea, listReports, TILE_CACHE, type OfflineArea, type SavedReport } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Panel, ago } from "@/components/app/bits";
import { supabase } from '@/integrations/supabase/client';
import { OFFLINE_HELP_CONTACTS, validateHelpContacts } from '@/lib/offline-help-policy';
import { deliverFile } from '@/lib/file-download';

export const Route = createFileRoute("/_authenticated/offline")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Offline maps & emergency info — B fox" }, { name: "description", content: "Downloaded maps, safe zones, saved reports and emergency guidance that work without internet." }, { property: "og:title", content: "Offline — B fox" }, { property: "og:description", content: "Maps, safe zones and emergency info that work without internet." }] }),
  component: Offline,
});

const NUMBERS = [["112", "All emergencies (India)"], ["108", "Ambulance"], ["101", "Fire"], ["100", "Police"], ["1078", "NDMA disaster helpline"], ["1070", "State disaster control room"]];
const GUIDE = [
  ["Flood", "Move to the highest floor or a marked safe zone. Never walk or drive through moving water — 15 cm can knock you down."],
  ["Earthquake", "Drop, cover under a sturdy table, hold on. Stay away from windows. Go outside only after shaking stops."],
  ["Cyclone / storm", "Stay indoors away from windows. Switch off mains if water enters. Keep a radio and torch."],
  ["Heat wave", "Stay in shade, drink water and ORS, wet cloth on the neck. Seek help for confusion or no sweating."],
  ["Tsunami", "If the ground shakes hard near the coast or the sea recedes, go inland or to 30 m+ height immediately."],
  ["Fire / smoke", "Stay low under smoke, cover nose with wet cloth, use stairs not lifts."],
];

function Offline() {
  const [areas, setAreas] = useState<OfflineArea[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [online, setOnline] = useState(true);
  const [contactStatus, setContactStatus] = useState('');
  const [storage, setStorage] = useState<{usage?:number;quota?:number}>({});
  useEffect(() => {
    navigator.storage?.estimate().then(setStorage).catch(()=>{});
    setAreas(listAreas()); listReports().then(setReports).catch(() => {});
    setOnline(navigator.onLine);
    const h = () => setOnline(navigator.onLine); window.addEventListener("online", h); window.addEventListener("offline", h);
    return () => { window.removeEventListener("online", h); window.removeEventListener("offline", h); };
  }, []);
  const drop = async (a: OfflineArea) => { try { await deleteOfflineArea(a.id); setAreas(listAreas()); setStorage(await navigator.storage.estimate()); } catch { toast.error("Could not remove cached area"); } };
  const saveContacts = async () => {
    try {
      const { data, error } = await supabase.from('emergency_contacts').select('name, phone'); if (error) throw error;
      const contacts = validateHelpContacts(data ?? []);
      localStorage.setItem(OFFLINE_HELP_CONTACTS, JSON.stringify({ savedAt: new Date().toISOString(), contacts }));
      setContactStatus(`${contacts.length} contacts saved on this device.`);
    } catch { toast.error('Could not save contacts. Connect to the internet and try again.'); }
  };

  return (
    <div className="space-y-4">
      <Panel title="Help without internet" icon={<LifeBuoy className="h-4 w-4 text-high" />}>
        <Button asChild variant="outline" className="mb-3 w-full"><Link to="/community">Nearby Community · design preview</Link></Button>
        <Button asChild variant="danger" className="w-full"><a href="/emergency-kit.html">Open offline emergency kit</a></Button>
        <p className="mt-2 text-xs text-muted-foreground">Calls and SMS need mobile signal, not internet. Without any signal, use the phone’s local distress sound and visible HELP signal to attract nearby people. B fox cannot discover or message nearby phones without a network.</p>
        <p className="mt-2 text-xs text-muted-foreground">Save your contacts below only on a trusted device. Anyone using this device can see the offline copy, even when signed out. Remove it in the emergency kit when no longer needed.</p>
        <Button variant="outline" className="mt-3 w-full" disabled={!online} onClick={saveContacts}>Save emergency contacts on this device</Button>
        {contactStatus && <p role="status" className="mt-2 text-xs text-low">{contactStatus}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">Offline reopening works only after opening the published app online once. Offline launch is disabled in the editor preview.</p>
      </Panel>
      <p className="text-xs text-muted-foreground">Device storage: {((storage.usage ?? 0)/1048576).toFixed(1)} MB used{storage.quota ? ` / ${(storage.quota/1048576).toFixed(0)} MB available` : ""}.</p>
      {!online && <div className="flex items-center gap-2 rounded-xl border border-med/60 bg-med/10 p-3 text-sm text-med"><WifiOff className="h-4 w-4" />You're offline — showing saved data.</div>}
      <Panel title="Downloaded map areas" icon={<Download className="h-4 w-4 text-primary" />}>
        {areas.length === 0 ? <p className="text-xs text-muted-foreground">None yet. On the <Link to="/map" className="text-primary underline">map</Link>, pick a place and tap Download to save it with its safe zones.</p> : (
          <ul className="space-y-1.5">{areas.map((a) => (
            <li key={a.id} className="rounded-lg border bg-surface/60 p-2 text-sm">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><Link to="/map" search={{ lat: a.lat, lon: a.lon, safe: 1 }} className="flex-1 truncate font-medium hover:underline">{a.name}</Link><Button size="icon" variant="ghost" aria-label="Remove" onClick={() => drop(a)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></Button></div>
              <p className="text-[11px] text-muted-foreground">{a.radiusKm} km · {a.tiles} tiles · {a.zones?.length ?? 0} safe zones · saved {ago(a.savedAt)}</p>
              {a.zones?.length > 0 && <ul className="mt-1 text-[11px]">{a.zones.slice(0, 5).map((z: any, i: number) => <li key={i}>• {z.name} ({z.kind?.replace("_", " ")}) — {z.distKm} km</li>)}</ul>}
            </li>))}</ul>
        )}
      </Panel>
      <Panel title="Saved reports" icon={<FileText className="h-4 w-4 text-cyan" />}>
        {reports.length === 0 ? <p className="text-xs text-muted-foreground">No PDF reports saved.</p> : <ul className="space-y-1 text-xs">{reports.map((r) => <li key={r.id} className="flex items-center gap-2"><Button variant="link" className="min-w-0 flex-1 justify-start truncate px-0 text-xs" onClick={() => { const url = URL.createObjectURL(r.blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 30000); }}>{r.place} · {new Date(r.createdAt).toLocaleDateString()} · {(r.blob.size/1024).toFixed(0)} KB</Button><Button size="icon" variant="ghost" aria-label={`Download report for ${r.place}`} onClick={() => void deliverFile(r.blob, `${r.title.replace(/[^\w]+/g, "_")}.pdf`).catch(() => toast.error("Could not download saved PDF"))}><Download className="h-4 w-4" /></Button></li>)}</ul>}
      </Panel>
      <Panel title="Emergency numbers" icon={<Phone className="h-4 w-4 text-high" />}>
        <div className="grid grid-cols-2 gap-2">{NUMBERS.map(([n, l]) => <a key={n} href={`tel:${n}`} className="rounded-xl border bg-surface/60 p-2.5 transition active:scale-95"><div className="font-mono text-lg font-bold text-high">{n}</div><div className="text-[11px] text-muted-foreground">{l}</div></a>)}</div>
      </Panel>
      <Panel title="What to do" icon={<LifeBuoy className="h-4 w-4 text-low" />}>
        {GUIDE.map(([t, d]) => <details key={t} className="border-b py-2 text-sm last:border-0"><summary className="cursor-pointer font-medium">{t}</summary><p className="mt-1 text-xs text-muted-foreground">{d}</p></details>)}
        <p className="mt-2 text-[10px] text-muted-foreground">Based on NDMA India public guidelines (ndma.gov.in).</p>
      </Panel>
    </div>
  );
}
