import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Mic, MicOff, Send, X, Ear } from "lucide-react";
import { askFox, type FoxMsg, type FoxAction } from "@/lib/fox.functions";
import { useSettings, type Settings } from "@/lib/settings";
import { speechLang, t } from "@/lib/i18n";
import { getFoxContext, emitFox } from "@/lib/fox-bus";
import { useSos } from "@/lib/use-sos";
import { supabase } from "@/integrations/supabase/client";
import { getLastLocation } from "@/lib/location";
import { FoxMark } from "@/components/app/FoxMark";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isEmergencyCommand, isFoxPage, parseLocalCommand, settingValue } from "@/lib/fox-commands";


const WAKE = /\b(hey|hi|ok)?\s*fox\b|फॉक्स/i;

function speak(text: string, lang: string) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, ""));
  u.lang = lang;
  const v = speechSynthesis.getVoices().find((x) => x.lang === lang) ?? speechSynthesis.getVoices().find((x) => x.lang.startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  u.rate = 1.02; u.pitch = 1.05;
  speechSynthesis.speak(u);
}

export function FoxAgent() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<(FoxMsg & { actions?: string[] })[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { s, set } = useSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const ask = useServerFn(askFox);
  const { trigger } = useSos();
  const recRef = useRef<any>(null);
  const handsRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lang = speechLang(s.language);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => {
    const iv = setInterval(() => setSpeaking(typeof speechSynthesis !== "undefined" && speechSynthesis.speaking), 300);
    return () => clearInterval(iv);
  }, []);

  const say = (text: string) => { if (s.voiceReplies) speak(text, lang); };

  async function runAction(a: FoxAction): Promise<string> {
    const g = a.args as any;
    switch (a.name) {
      case "run_drill": { if (g.tier !== 'high') throw new Error('Unsupported drill'); emitFox('drill', 'high'); setOpen(false); return 'Red-alert practice started. No messages sent.'; }
      case "navigate": { if (!isFoxPage(g.page)) throw new Error("Unknown page"); await nav({ to: `/${g.page}` }); return `Opened ${g.page}`; }
      case "set_setting": {
        const values = settingValue(String(g.key), g.value);
        if (!values) throw new Error("Unsupported setting value");
        for (const [key, value] of Object.entries(values)) set(key as keyof Settings, value);
        return `Set ${g.key} → ${g.value}`;
      }
      case "search_map": nav({ to: "/map", search: { q: g.query } }); return `Searching map: ${g.query}`;
      case "open_saved_location": {
        const { data } = await supabase.from("saved_locations").select("name, lat, lon").ilike("name", `%${g.name}%`).limit(1);
        if (!data?.[0]) return `No saved location named "${g.name}"`;
        nav({ to: "/map", search: { lat: data[0].lat, lon: data[0].lon } }); return `Opened ${data[0].name}`;
      }
      case "show_safe_zones": { const l = getLastLocation(); nav({ to: "/map", search: l ? { lat: l.lat, lon: l.lon, safe: 1 } : { safe: 1 } }); return "Showing safe zones"; }
      case "trigger_sos": {
        const r = await trigger("fox", g.reason);
        nav({ to: "/sos" });
        const delivered = r.deliveries.filter((d) => d.status === "delivered").length;
        const pending = r.deliveries.filter((d) => ["sent", "queued", "accepted", "sending"].includes(d.status)).length;
        return `SOS: ${delivered}/${r.contactCount} confirmed delivered; ${pending} awaiting confirmation. ${r.deliveries.some((d) => d.status === "not_configured" || d.status === "failed") ? "Automatic sending unavailable; use manual SMS or Call 112." : r.contactCount ? "" : "No contacts saved — use Call 112."}`;
      }
      case "add_contact": {
        if (!String(g.name ?? "").trim() || !/^\+[1-9]\d{6,14}$/.test(String(g.phone ?? "").replace(/[ ()-]/g, ""))) throw new Error("Use a name and phone number with international country code");
        const { error } = await supabase.from("emergency_contacts").insert({ name: g.name, phone: String(g.phone).replace(/[ ()-]/g, ""), relation: g.relation ?? null });
        emitFox("contacts-changed", null);
        return error ? `Could not add contact: ${error.message}` : `Added contact ${g.name}`;
      }
      case "download_report": nav({ to: "/reports", search: { make: 1 } }); return "Preparing PDF report";
    }
    return `Unknown action ${a.name}`;
  }

  async function send(text: string) {
    const q = text.trim(); if (!q || busy) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setMsgs(m=>[...m,{role:"assistant",content:"Sign in to use FOX actions and your saved contacts. For an immediate emergency, call 112."}]); return; }
    setInput("");
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    // Local emergency fast-path: no AI round trip before SOS goes out.
    if (isEmergencyCommand(q)) {
      const line = s.language === "hi" ? "आपातकालीन SOS भेज रहा हूँ, आपका लाइव लोकेशन भी।" : s.language === "mr" ? "आपत्कालीन SOS पाठवत आहे, तुमचे लाइव्ह लोकेशनसह." : "Sending SOS with your live location to your emergency contacts now.";
      setBusy(true); say(line);
      setMsgs((m) => [...m, { role: "assistant", content: line }]);
      try { const res = await runAction({ name: "trigger_sos", args: { reason: q } }); setMsgs((m) => [...m, { role: "assistant", content: res, actions: ["trigger_sos"] }]); say(res); }
      catch (e) { await nav({ to: "/sos" }); const message = "SOS could not be sent. Use manual SMS or Call 112."; setMsgs((m) => [...m, { role: "assistant", content: message }]); say(message); toast.error((e as Error).message); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true);
    try {
      const local = parseLocalCommand(q);
      if (local) { const result = await runAction(local); setMsgs((m) => [...m, { role: "assistant", content: result }]); say(result); return; }
      const l = getLastLocation();
      const context = `Current page: ${loc.pathname}${loc.searchStr}\nSettings: ${JSON.stringify(s)}\nLast known location: ${l ? `${l.lat.toFixed(4)},${l.lon.toFixed(4)} at ${l.at}` : "unknown"}\n\n${getFoxContext()}`;
      const r = await ask({ data: { messages: next.map(({ role, content }) => ({ role, content })), context, language: s.language } });
      if (r.error) { const error = r.error; setMsgs((m) => [...m, { role: "assistant", content: error }]); say(error); return; }
      const results: string[] = [];
      for (const a of r.actions) {
        if (a.name === 'trigger_sos' && !isEmergencyCommand(q)) { results.push('No SOS sent. Open Direct SOS to activate it, or say “Hey FOX, help me” in an emergency.'); continue; }
        results.push(await runAction(a));
      }
      const reply = results.length ? results.join(". ") : r.reply || "No action was performed.";
      setMsgs((m) => [...m, { role: "assistant", content: reply, actions: results }]);
      say(reply);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry, something went wrong: " + (e as Error).message }]);
    } finally { setBusy(false); }
  }

  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  function listenOnce() {
    if (!SR) { toast.error("Voice input isn't supported in this browser — try Chrome, or type instead."); return; }
    if (listening) { recRef.current?.stop(); return; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const r = new SR(); r.lang = lang; r.interimResults = true; r.maxAlternatives = 1;
    let final = "";
    r.onresult = (e: any) => { let tx = ""; for (const res of e.results) tx += res[0].transcript; setInput(tx); if (e.results[e.results.length - 1].isFinal) final = tx; };
    r.onerror = (e: any) => { setListening(false); if (e.error === "not-allowed") toast.error("Microphone permission denied. Open the app in its own tab if you're in the preview."); };
    r.onend = () => { setListening(false); if (final) send(final.replace(WAKE, "").trim() || final); };
    recRef.current = r; setListening(true); r.start();
  }

  // Hands-free "Hey FOX" wake word
  useEffect(() => {
    if (!s.handsFree || !SR) return;
    let alive = true;
    const start = () => {
      if (!alive) return;
      const r = new SR(); r.lang = lang; r.continuous = true; r.interimResults = false;
      r.onresult = (e: any) => {
        const tx = e.results[e.results.length - 1][0].transcript as string;
        if (isEmergencyCommand(tx) && WAKE.test(tx)) { setOpen(true); send(tx); }
        else if (WAKE.test(tx)) { const cmd = tx.replace(WAKE, "").trim(); setOpen(true); if (cmd.length > 2) send(cmd); else say("Yes?"); }
      };
      r.onend = () => setTimeout(start, 400);
      r.onerror = (e: { error: string }) => { if (["not-allowed", "service-not-allowed", "audio-capture"].includes(e.error)) { alive = false; set("handsFree", false); toast.error("Microphone unavailable — hands-free mode stopped. Text commands still work."); } };
      handsRef.current = r; try { r.start(); } catch {}
    };
    start();
    return () => { alive = false; try { handsRef.current?.stop(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.handsFree, lang]);

  const suggestions = s.language === "hi" ? ["मुंबई में क्या खतरा है?", "सुरक्षित क्षेत्र दिखाओ", "थीम गुलाबी करो"] : s.language === "mr" ? ["मुंबईत कोणता धोका आहे?", "सुरक्षित क्षेत्र दाखवा", "भाषा इंग्रजी करा"] : ["What's the risk in Mumbai?", "Show safe zones near me", "Explain this graph", "Switch to Hindi", "Make text bigger"];

  return (
    <>
      <Button aria-label="Open FOX assistant" onClick={() => setOpen(true)} className="haptic fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-neon glow sm:right-[max(1rem,calc(50vw-23rem))]">
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping-slow" />
        <FoxMark className="relative h-8 w-8 rounded-full" />
        {s.handsFree && <Ear className="absolute -left-1 -top-1 h-4 w-4 rounded-full bg-background p-0.5 text-cyan" />}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="FOX assistant" className="glass flex h-[78dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl animate-float-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="relative"><FoxMark className="h-9 w-9" />{(busy || speaking) && <span className="absolute inset-0 rounded-full ring-2 ring-primary animate-ping-slow" />}</div>
              <div className="min-w-0 flex-1"><div className="font-display font-bold">FOX</div><div className="text-[10px] text-muted-foreground">{busy ? "thinking…" : speaking ? "speaking…" : listening ? "listening…" : "Ready"}</div></div>
              <button onClick={() => set("handsFree", !s.handsFree)} className={cn("haptic rounded-full border px-2 py-1 text-[10px]", s.handsFree ? "border-cyan text-cyan" : "text-muted-foreground")}>“Hey FOX” {s.handsFree ? "on" : "off"}</button>
              <button aria-label="Close" onClick={() => setOpen(false)} className="haptic rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{t("askFox", s.language)}</p>
                  <div className="flex flex-wrap gap-2">{suggestions.map((x) => <button key={x} onClick={() => send(x)} className="haptic rounded-full border bg-surface px-3 py-1.5 text-xs text-foreground hover:border-primary">{x}</button>)}</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm animate-float-up", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-surface border")}>
                  <div className="prose prose-sm max-w-none text-inherit [&_*]:text-inherit"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  {m.actions?.length ? <div className="mt-1 flex flex-wrap gap-1">{m.actions.map((a, j) => <span key={j} className="rounded-full bg-cyan/15 px-2 py-0.5 font-mono text-[9px] text-cyan">⚡ {a}</span>)}</div> : null}
                </div>
              ))}
              {busy && <div className="flex h-6 items-end gap-1 px-2">{[0, 1, 2, 3].map((i) => <span key={i} className="w-1 rounded bg-primary animate-bars" style={{ height: 18, animationDelay: `${i * 0.12}s` }} />)}</div>}
              <div ref={endRef} />
            </div>
            <form className="flex items-center gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
              <button type="button" onClick={listenOnce} aria-label="Speak" className={cn("haptic grid h-11 w-11 shrink-0 place-items-center rounded-full border", listening ? "bg-high text-destructive-foreground animate-pulse" : "bg-surface")}>
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <input aria-label="Message FOX" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("askFox", s.language)} className="h-11 min-w-0 flex-1 rounded-full border bg-surface px-4 text-sm outline-none focus:border-primary" />
              <button aria-label="Send" disabled={busy} className="haptic grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-neon text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
