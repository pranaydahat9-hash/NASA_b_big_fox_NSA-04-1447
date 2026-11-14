import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Map, Siren, ShieldCheck, FileText, Settings as Cog } from "lucide-react";
import { FoxMark } from "./FoxMark";
import { FoxAgent } from "@/components/fox/FoxAgent";
import { AlertCenter } from "./AlertCenter";
import { useSettings } from "@/lib/settings";
import { t, type Key } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const NAV: { to: string; key: Key; icon: typeof Map }[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/map", key: "map", icon: Map },
  { to: "/sos", key: "sos", icon: Siren },
  { to: "/prevent", key: "prevent", icon: ShieldCheck },
  { to: "/reports", key: "reports", icon: FileText },
  { to: "/settings", key: "settings", icon: Cog },
];

export function AppShell() {
  const { s } = useSettings();
  const loc = useLocation();
  useEffect(() => {
    const h = (e: PointerEvent) => { const el = (e.target as HTMLElement)?.closest("button,a,[role=button],[role=tab],[role=switch]"); if (el) haptic("tap"); };
    window.addEventListener("pointerdown", h);
    return () => window.removeEventListener("pointerdown", h);
  }, []);
  const [online, setOnline] = useOnline();
  void setOnline;
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl pb-28">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/70 px-4 py-2.5 backdrop-blur-xl">
        <Link to="/dashboard" className="flex items-center gap-2">
          <FoxMark className="h-8 w-8" />
          <div className="leading-tight"><div className="font-display text-lg font-extrabold tracking-tight">FOX</div><div className="text-[10px] font-medium text-muted-foreground">Stay aware. Stay safe.</div></div>
        </Link>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5", online ? "text-low" : "text-med")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-low animate-flicker" : "bg-med")} />{online ? "LIVE" : "OFFLINE"}
          </span>
          <Link to="/offline" className="rounded-full border px-2 py-0.5 text-muted-foreground hover:text-foreground">{t("offline", s.language)}</Link>
        </div>
      </header>
      <main key={loc.pathname} className="px-3 pt-3 sm:px-5">
        <Outlet />
      </main>
      <AlertCenter />
      <FoxAgent />
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
        <div className="glass grid grid-cols-6 rounded-2xl p-1">
          {NAV.map(({ to, key, icon: Icon }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={cn("haptic group relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                {active && <span className="absolute inset-0 rounded-xl bg-primary/10" />}{active && <span className="absolute -top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary" />}
                <span className="relative">
                  <Icon className={cn("h-4 w-4 transition-transform group-hover:-translate-y-0.5", key === "sos" && "text-high animate-flicker")} strokeWidth={2.4} />
                  {key === "sos" && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-high animate-ping-slow" />}
                </span>
                <span className="relative">{t(key, s.language)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { useState } from "react";
function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(navigator.onLine);
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return [on, setOn] as const;
}
