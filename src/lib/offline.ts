// Offline storage: map tiles in Cache Storage, reports in IndexedDB, last data in localStorage.
export const TILE_CACHE = "fox-tiles-v1";
export type BaseStyle = "dark" | "light";
// Keyless tile providers (CARTO basemaps now require an API key).
export const TILE_PROVIDERS: Record<BaseStyle, { url: string; attribution: string }> = {
  dark: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attribution: "© OpenStreetMap contributors © Esri" },
  light: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" },
};
export const tileUrl = (style: BaseStyle, z: number, x: number, y: number) =>
  TILE_PROVIDERS[style].url.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

export function lonLatToTile(lon: number, lat: number, z: number) {
  const x = Math.floor(((lon + 180) / 360) * 2 ** z);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
  return { x, y };
}

export function tilesForArea(lat: number, lon: number, radiusKm: number, zooms: number[]) {
  const dLat = radiusKm / 111, dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const list: { z: number; x: number; y: number }[] = [];
  for (const z of zooms) {
    const a = lonLatToTile(lon - dLon, lat + dLat, z), b = lonLatToTile(lon + dLon, lat - dLat, z);
    for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++) list.push({ z, x, y });
  }
  return list;
}

export async function downloadArea(style: BaseStyle, lat: number, lon: number, radiusKm: number, onProgress: (done: number, total: number) => void) {
  const cache = await caches.open(TILE_CACHE);
  const tiles = tilesForArea(lat, lon, radiusKm, [10, 11, 12, 13, 14, 15]);
  let done = 0;
  const queue = [...tiles];
  const worker = async () => {
    while (queue.length) {
      const t = queue.shift()!;
      const url = tileUrl(style, t.z, t.x, t.y);
      try { if (!(await cache.match(url))) { const r = await fetch(url, { mode: "cors" }); if (r.ok) await cache.put(url, r); } } catch {}
      onProgress(++done, tiles.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return tiles.length;
}

export async function cachedTileBlobUrl(url: string): Promise<string | null> {
  try { const c = await caches.open(TILE_CACHE); const r = await c.match(url); if (!r) return null; return URL.createObjectURL(await r.blob()); } catch { return null; }
}

export type OfflineArea = { id: string; name: string; lat: number; lon: number; radiusKm: number; tiles: number; savedAt: string; zones: any[] };
export const listAreas = (): OfflineArea[] => { try { return JSON.parse(localStorage.getItem("fox.offlineAreas") || "[]"); } catch { return []; } };
export const saveArea = (a: OfflineArea) => localStorage.setItem("fox.offlineAreas", JSON.stringify([a, ...listAreas().filter((x) => x.id !== a.id)]));
export const removeArea = (id: string) => localStorage.setItem("fox.offlineAreas", JSON.stringify(listAreas().filter((x) => x.id !== id)));

// ---- IndexedDB for PDFs ----
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("fox", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("reports", { keyPath: "id" });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export type SavedReport = { id: string; title: string; place: string; createdAt: string; level: string; blob: Blob };
export async function saveReport(r: SavedReport) { const d = await db(); await new Promise((res, rej) => { const tx = d.transaction("reports", "readwrite"); tx.objectStore("reports").put(r); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
export async function listReports(): Promise<SavedReport[]> { const d = await db(); return new Promise((res) => { const q = d.transaction("reports").objectStore("reports").getAll(); q.onsuccess = () => res((q.result as SavedReport[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }); }
export async function deleteReport(id: string) { const d = await db(); d.transaction("reports", "readwrite").objectStore("reports").delete(id); }

export function cacheJson(key: string, v: unknown) { try { localStorage.setItem("fox.cache." + key, JSON.stringify({ at: new Date().toISOString(), v })); } catch {} }
export function readJson<T>(key: string): { at: string; v: T } | null { try { return JSON.parse(localStorage.getItem("fox.cache." + key) || "null"); } catch { return null; } }
