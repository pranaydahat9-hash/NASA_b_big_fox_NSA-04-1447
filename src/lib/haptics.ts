let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)());

/** Tactile feedback: vibration on phones + a tiny click tick everywhere. */
export function haptic(kind: "tap" | "heavy" | "success" | "warn" = "tap") {
  if (typeof window === "undefined") return;
  const pattern = { tap: 8, heavy: [20, 30, 20], success: [10, 40, 18], warn: [40, 60, 40] }[kind];
  try { navigator.vibrate?.(pattern as any); } catch {}
  if (localStorage.getItem("fox.clicks") === "off") return;
  try {
    const a = ac(); const o = a.createOscillator(); const g = a.createGain();
    o.type = "triangle"; o.frequency.value = kind === "heavy" ? 140 : kind === "warn" ? 300 : 520;
    g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.05);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.06);
  } catch {}
}

/** High-alert siren: ~2 minutes of buzzing + vibration until stopped. */
export function startAlarm(durationMs = 120_000) {
  const a = ac();
  void a.resume().catch(() => {});
  const o = a.createOscillator(); const g = a.createGain(); const lfo = a.createOscillator(); const lg = a.createGain();
  o.type = "sawtooth"; o.frequency.value = 760; lfo.frequency.value = 1.6; lg.gain.value = 260;
  lfo.connect(lg).connect(o.frequency); g.gain.value = 0.12; o.connect(g).connect(a.destination);
  o.start(); lfo.start();
  const vib = setInterval(() => { try { navigator.vibrate?.([600, 200]); } catch {} }, 800);
  let stopped = false;
  const stop = () => { if (stopped) return; stopped = true; clearInterval(vib); try { navigator.vibrate?.(0); o.stop(); lfo.stop(); } catch {} };
  setTimeout(stop, durationMs);
  return stop;
}
