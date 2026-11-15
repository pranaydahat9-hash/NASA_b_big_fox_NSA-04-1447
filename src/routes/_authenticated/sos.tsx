import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Siren, Phone, MessageSquare, Trash2, UserPlus, Loader2, CheckCircle2, XCircle, Clock, MapPin, Users, Ambulance, Shield, Flame, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSmsStatus, refreshSosDelivery } from "@/lib/sos.functions";
import { useSos, getLastSos, subscribeSos, manualLinks, type SosResult } from "@/lib/use-sos";
import { onFox } from "@/lib/fox-bus";
import { haptic } from "@/lib/haptics";
import { Panel, LevelBadge, ago } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EMERGENCY_SERVICES } from '@/lib/emergency-policy';
import { DrillControls } from '@/components/app/DrillControls';

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "SOS & family safety — B fox" }, { name: "description", content: "Send an SOS with your live location to your emergency contacts and manage family safety." }, { property: "og:title", content: "SOS & family safety — B fox" }, { property: "og:description", content: "Send an SOS with your live location to your emergency contacts." }] }),
  component: SosPage,
});

const PHONE = /^\+[1-9][0-9 ()-]{6,20}$/;

function SosPage() {
  const qc = useQueryClient();
  const { trigger, busy } = useSos();
  const [res, setRes] = useState<SosResult | null>(getLastSos());
  const [hold, setHold] = useState(0);
  const timer = useRef<any>(null);
  const smsFn = useServerFn(getSmsStatus);
  const refreshFn = useServerFn(refreshSosDelivery);
  const sms = useQuery({ queryKey: ["sms-status"], queryFn: () => smsFn() });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: async () => (await supabase.from("emergency_contacts").select("*").order("created_at")).data ?? [] });
  const history = useQuery({ queryKey: ["sos-history"], queryFn: async () => (await supabase.from("sos_events").select("id, created_at, trigger, lat, lon, deliveries").order("created_at", { ascending: false }).limit(10)).data ?? [] });
  const [form, setForm] = useState({ name: "", phone: "", relation: "", is_family: true });

  useEffect(() => subscribeSos((r) => { setRes(r); qc.invalidateQueries({ queryKey: ["sos-history"] }); }), [qc]);
  useEffect(() => onFox("contacts-changed", () => qc.invalidateQueries({ queryKey: ["contacts"] })), [qc]);

  useEffect(() => {
    if (!res?.id || !res.deliveries.some(d => ["sent", "queued", "accepted", "sending"].includes(d.status))) return;
    const id = res.id;
    const timer = setInterval(() => { refreshFn({ data: { id } }).then(deliveries => { setRes(r => r ? { ...r, deliveries } : r); qc.invalidateQueries({ queryKey: ["sos-history"] }); }).catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [res?.id, res?.deliveries, refreshFn, qc]);

  const fire = async () => {
    try { const r = await trigger("button"); setRes(r); } catch (e) { toast.error("SOS failed: " + (e as Error).message + " — use the manual buttons below."); }
  };
  const start = () => {
    if (busy) return;
    haptic("warn"); let v = 0;
    timer.current = setInterval(() => { v += 5; setHold(v); if (v % 25 === 0) haptic("tap"); if (v >= 100) { clearInterval(timer.current); setHold(0); fire(); } }, 75);
  };
  const stop = () => { clearInterval(timer.current); setHold(0); };
  useEffect(() => () => clearInterval(timer.current), []);

  const add = async () => {
    if (!form.name.trim() || !PHONE.test(form.phone.trim())) return void toast.error("Enter a name and a valid phone number (with country code, e.g. +91…)");
    const { error } = await supabase.from("emergency_contacts").insert({ name: form.name.trim().slice(0, 80), phone: form.phone.replace(/[ ()-]/g, ""), relation: form.relation.trim() || null, is_family: form.is_family });
    if (error) return void toast.error(error.message);
    haptic("success"); setForm({ name: "", phone: "", relation: "", is_family: true }); qc.invalidateQueries({ queryKey: ["contacts"] });
  };
  const del = async (id: string) => { await supabase.from("emergency_contacts").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["contacts"] }); };

  const phones = (contacts.data ?? []).map((c) => c.phone);
  const fallbackMsg = res?.message ?? "SOS: I need help. Sent via B fox.";
  const links = manualLinks(phones, fallbackMsg);

  return (
    <div className="space-y-4">
      <Panel title="Emergency services · India" icon={<Phone className="h-4 w-4 text-high" />}>
        <Button asChild variant="outline" className="mb-3 w-full"><a href="/emergency-kit.html">No internet? Open offline help</a></Button>
        <div className="grid grid-cols-3 gap-2">{EMERGENCY_SERVICES.map((service, i) => {
          const Icon = [Ambulance, Shield, Flame][i] ?? Phone;
          return <Button asChild key={service.name} variant="outline" className="h-auto flex-col gap-1 px-1 py-3 text-xs"><a href={`tel:${service.number}`}><Icon className="h-5 w-5 text-high" />{service.name}<span className="text-muted-foreground">{service.number}</span></a></Button>;
        })}</div>
        <p className="mt-2 text-[11px] text-muted-foreground">112 is India’s unified emergency dispatch for medical, police and fire assistance. Outside India, use your local emergency number.</p>
        <Button asChild variant="outline" className="mt-2 w-full"><a href="#emergency-contacts"><Users className="h-4 w-4" />Emergency contacts</a></Button>
      </Panel>
      <Panel>
        <div className="flex flex-col items-center py-4">
          <Button variant="danger"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!e.repeat) start(); } }} onKeyUp={stop}
            onPointerCancel={stop} onBlur={stop}
            onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} disabled={busy}
            aria-label="Hold to send SOS"
            className="relative grid h-44 w-44 shrink-0 select-none overflow-hidden whitespace-normal p-0 place-items-center rounded-full bg-high text-destructive-foreground shadow-[0_0_60px_-10px_var(--hazard-high)] transition active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-high opacity-30 animate-ping-slow" />
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${hold * 2.95} 300`} /></svg>
            {busy ? <Loader2 className="h-10 w-10 animate-spin" /> : <span className="flex flex-col items-center"><Siren className="h-9 w-9 animate-jitter" /><span className="mt-1 text-lg font-bold tracking-widest">SOS</span><span className="text-[10px] opacity-80">hold 1.5 s</span></span>}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Or say “Hey B fox, help me”. Shares your GPS location at activation with {contacts.data?.length ?? 0} contact(s).</p>
          {sms.data && !sms.data.configured && <p className="mt-2 rounded-lg border border-med/50 bg-med/10 p-2 text-center text-[11px] text-med">{sms.data.reason} Use the manual buttons below.</p>}
        </div>
      </Panel>

      {res && (
        <Panel title="Delivery status" icon={<MessageSquare className="h-4 w-4 text-primary" />} right={<span className="text-[10px] text-muted-foreground">{ago(res.at)}</span>}>
          <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{res.lat != null ? `${res.lat.toFixed(5)}, ${res.lon?.toFixed(5) ?? "?"}` : "No location"}{res.locError ? ` · ${res.locError}` : ""}</p>
          {res.deliveries.length === 0 && <p className="text-sm text-med">No contacts saved — add one below or use the manual buttons.</p>}
          <ul className="space-y-1.5">
            {res.deliveries.map((d, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border bg-surface/60 p-2 text-xs">
                <span className="min-w-0 break-words">{d.name} · {d.phone}<span className="block text-[10px] text-muted-foreground">{d.detail}</span></span>
                <span className={cn("inline-flex items-center gap-1 font-mono uppercase", d.status === "delivered" ? "text-low" : ["failed", "undelivered"].includes(d.status) ? "text-high" : "text-med")}>
                  {d.status === "delivered" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{d.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Manual fallback" icon={<Phone className="h-4 w-4 text-high" />}>
        <div className="grid grid-cols-3 gap-2">
          <a href={links.call112} className="rounded-xl border border-high/60 bg-high/10 p-3 text-center text-xs font-semibold text-high active:scale-95 transition">Call 112</a>
          <a href={links.sms} className="rounded-xl border bg-surface/60 p-3 text-center text-xs font-semibold active:scale-95 transition">SMS all</a>
          <a href={links.whatsapp} target="_blank" rel="noreferrer" className="rounded-xl border bg-surface/60 p-3 text-center text-xs font-semibold active:scale-95 transition">WhatsApp</a>
        </div>
      </Panel>

      <div id="emergency-contacts" className="scroll-mt-24"><Panel title="Emergency contacts" icon={<Users className="h-4 w-4 text-cyan" />}>
        <ul className="space-y-1.5">
          {(contacts.data ?? []).map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border bg-surface/60 p-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", c.is_family ? "bg-primary" : "bg-cyan")} />
              <div className="min-w-0 flex-1"><div className="truncate font-medium">{c.name}{c.relation ? <span className="text-muted-foreground"> · {c.relation}</span> : null}</div><div className="font-mono text-[11px] text-muted-foreground">{c.phone}</div></div>
              <a href={`tel:${c.phone}`} className="rounded-lg p-1.5 text-low hover:bg-muted" aria-label={`Call ${c.name}`}><Phone className="h-4 w-4" /></a>
              <button onClick={() => del(c.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label={`Remove ${c.name}`}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {contacts.data?.length === 0 && <li className="text-xs text-muted-foreground">No contacts yet.</li>}
        </ul>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="+91 98…" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Relation (optional)" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
          <label className="flex min-h-10 items-center justify-between rounded-md border px-3 text-xs">Family <Switch checked={form.is_family} onCheckedChange={(v) => setForm({ ...form, is_family: v })} /></label>
        </div>
        <Button className="mt-2 w-full gap-1.5" onClick={add}><UserPlus className="h-4 w-4" />Add contact</Button>
      </Panel></div>

      <Panel title="Three alert levels" icon={<Bell className="h-4 w-4 text-primary" />}>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-xl border border-low/50 bg-low/10 p-2"><LevelBadge level="low" /><p className="mt-1">News-style notice, months ahead (e.g. faster glacier melt).</p></div>
          <div className="rounded-xl border border-med/60 bg-med/10 p-2"><LevelBadge level="medium" /><p className="mt-1">Pop-up alert in the month the hazard may occur.</p></div>
          <div className="rounded-xl border border-high/70 bg-high/10 p-2"><LevelBadge level="high" /><p className="mt-1">24–48 h before: 2-minute alarm + SMS with nearest safe area.</p></div>
        </div>
        <div className="mt-3"><DrillControls /></div>
      </Panel>

      <Panel title="SOS history" icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
        {(history.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No SOS sent yet.</p> : (
          <ul className="space-y-1 text-xs">
            {(history.data ?? []).map((h) => {
              const ds = (h.deliveries as any[]) ?? [];
              return <li key={h.id} className="flex flex-wrap justify-between gap-2 rounded-lg border bg-surface/60 p-2"><span>{new Date(h.created_at).toLocaleString()} · {h.trigger}</span><span className="font-mono">{ds.filter((d) => d.status === "delivered").length}/{ds.length} confirmed</span></li>;
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
