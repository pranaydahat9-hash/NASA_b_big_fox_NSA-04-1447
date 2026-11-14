export function FoxMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs><linearGradient id="fx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--neon)" /><stop offset="1" stopColor="var(--cyan)" /></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#fx)" strokeWidth="1.5" strokeDasharray="3 4" className="origin-center animate-scan" />
      <path d="M10 12 L18 22 L24 18 L30 22 L38 12 L36 28 L24 38 L12 28 Z" fill="url(#fx)" />
      <circle cx="19" cy="26" r="1.8" fill="var(--background)" /><circle cx="29" cy="26" r="1.8" fill="var(--background)" />
    </svg>
  );
}
