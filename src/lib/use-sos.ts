import { useServerFn } from "@tanstack/react-start";
import { useState, useCallback } from "react";
import { sendSos } from "./sos.functions";
import { getLastLocation, requestLocation } from "./location";
import { haptic } from "./haptics";

export type SosResult = Awaited<ReturnType<typeof sendSos>> & { lat: number | null; lon: number | null; at: string; locError?: string | undefined };
let last: SosResult | null = null;
const subs = new Set<(r: SosResult | null) => void>();

export function useSos() {
  const fn = useServerFn(sendSos);
  const [busy, setBusy] = useState(false);
  const trigger = useCallback(async (trig: string, note?: string) => {
    setBusy(true); haptic("heavy");
    let lat: number | null = null, lon: number | null = null, acc: number | null = null, locError: string | undefined, locationAt: string | undefined, stale = false;
    try { const l = await requestLocation(10000); lat = l.lat; lon = l.lon; acc = l.accuracy; locationAt = l.at; }
    catch (e) { locError = (e as Error).message; const l = getLastLocation(); if (l) { lat = l.lat; lon = l.lon; acc = l.accuracy; locationAt = l.at; stale = true; locError += " — used last known location"; } }
    try {
      const r = await fn({ data: { lat, lon, accuracy: acc, trigger: trig, ...(locationAt ? { locationAt } : {}), stale, ...(note !== undefined ? { note } : {}) } });
      const res: SosResult = { ...r, lat, lon, at: new Date().toISOString(), locError };
      last = res;
      subs.forEach((s) => s(last)); haptic("success");
      return res;
    } finally { setBusy(false); }
  }, [fn]);
  return { trigger, busy };
}
export const getLastSos = () => last;
export const subscribeSos = (f: (r: SosResult | null) => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function manualLinks(phones: string[], message: string) {
  const body = encodeURIComponent(message);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent);
  return {
    sms: `sms:${phones.join(",")}${isIOS ? "&" : "?"}body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
    call112: "tel:112",
  };
}
