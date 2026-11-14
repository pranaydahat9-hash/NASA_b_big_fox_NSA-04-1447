// Tiny event bus so FOX can drive any page, and pages can expose their data to FOX.
type Handler = (args: any) => void;
const handlers = new Map<string, Set<Handler>>();
export function onFox(name: string, h: Handler) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name)!.add(h);
  return () => { handlers.get(name)?.delete(h); };
}
export function emitFox(name: string, args: any) { handlers.get(name)?.forEach((h) => h(args)); }

const ctx = new Map<string, string>();
/** Pages register a short text summary of what's on screen (graph values, sources) for FOX to explain. */
export function setFoxContext(key: string, text: string | null) { if (text) ctx.set(key, text); else ctx.delete(key); }
export function getFoxContext() { return [...ctx.entries()].map(([k, v]) => `## ${k}\n${v}`).join("\n\n"); }

// pending actions that should run after navigation (e.g. search_map → /map)
let pending: { name: string; args: any } | null = null;
export const setPending = (p: typeof pending) => (pending = p);
export const takePending = (name: string) => { if (pending?.name === name) { const p = pending; pending = null; return p.args; } return null; };
