import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "./i18n";

export type Settings = {
  theme: "abyss" | "light" | "blossom"; language: Lang; fontScale: number; reduceMotion: boolean; highContrast: boolean;
  voiceReplies: boolean; alarmSound: boolean; clicks: boolean; notifyLow: boolean; notifyMedium: boolean; notifyHigh: boolean; handsFree: boolean;
};
const DEFAULTS: Settings = { theme: "blossom", language: "en", fontScale: 1, reduceMotion: false, highContrast: false, voiceReplies: true, alarmSound: true, clicks: true, notifyLow: true, notifyMedium: true, notifyHigh: true, handsFree: false };
const Ctx = createContext<{ s: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void }>({ s: DEFAULTS, set: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("fox.settings") || "{}"); if (!localStorage.getItem("fox.theme.v2")) { saved.theme = "blossom"; localStorage.setItem("fox.theme.v2", "1"); localStorage.setItem("fox.settings", JSON.stringify(saved)); } setS({ ...DEFAULTS, ...saved }); } catch {}
  }, []);
  useEffect(() => {
    const h = document.documentElement;
    h.classList.remove("theme-light", "theme-blossom");
    if (s.theme !== "abyss") h.classList.add(`theme-${s.theme}`);
    h.style.setProperty("--font-scale", String(s.fontScale));
    h.classList.toggle("reduce-motion", s.reduceMotion);
    h.classList.toggle("high-contrast", s.highContrast);
    h.lang = s.language;
    localStorage.setItem("fox.clicks", s.clicks ? "on" : "off");
  }, [s]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setS((p) => { const n = { ...p, [k]: v }; localStorage.setItem("fox.settings", JSON.stringify(n)); return n; });
  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);
