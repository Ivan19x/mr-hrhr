// MR_HRHR wordmark: a rising candle trio + monospace name.
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "lg" ? 56 : size === "md" ? 36 : 26;
  const text = size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-lg";
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={px} />
      <span className={`font-num font-black tracking-tight ${text}`}>
        MR<span className="text-electric">_</span>HRHR
      </span>
    </span>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-terminal-raised)" />
      <line x1="8" y1="11" x2="8" y2="25" stroke="var(--color-down)" strokeWidth="1.5" />
      <rect x="5.5" y="14" width="5" height="8" rx="1" fill="var(--color-down)" />
      <line x1="16" y1="8" x2="16" y2="22" stroke="var(--color-up)" strokeWidth="1.5" />
      <rect x="13.5" y="10" width="5" height="9" rx="1" fill="var(--color-up)" />
      <line x1="24" y1="4" x2="24" y2="17" stroke="var(--color-up)" strokeWidth="1.5" />
      <rect x="21.5" y="6" width="5" height="8" rx="1" fill="var(--color-up)" />
      <path d="M4 27 L28 5" stroke="var(--color-electric)" strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}
