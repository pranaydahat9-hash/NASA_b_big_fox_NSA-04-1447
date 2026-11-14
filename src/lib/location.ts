import { useEffect, useState } from "react";
export type Loc = { lat: number; lon: number; accuracy: number | null; name?: string; at: string };
const KEY = "fox.lastLocation";
export function getLastLocation(): Loc | null { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
export function saveLastLocation(l: Loc) { localStorage.setItem(KEY, JSON.stringify(l)); window.dispatchEvent(new Event("fox-location")); }
export function requestLocation(timeout = 12000): Promise<Loc> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("Geolocation is not supported on this device"));
    navigator.geolocation.getCurrentPosition(
      (p) => { const l = { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, at: new Date().toISOString() }; saveLastLocation(l); res(l); },
      (e) => rej(new Error(e.code === 1 ? "Location permission denied" : "Could not get location")),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}
export function useLastLocation() {
  const [l, setL] = useState<Loc | null>(null);
  useEffect(() => { setL(getLastLocation()); const h = () => setL(getLastLocation()); window.addEventListener("fox-location", h); return () => window.removeEventListener("fox-location", h); }, []);
  return l;
}
