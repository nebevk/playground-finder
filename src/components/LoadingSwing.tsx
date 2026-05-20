export function LoadingSwing({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex h-full w-full flex-col items-center justify-center gap-4 bg-base-200/40 p-6"
    >
      <svg viewBox="0 0 120 100" className="h-20 w-24" aria-hidden>
        <line x1="10" y1="14" x2="110" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-base-content/60" />
        <g className="origin-[60px_14px] animate-[swing_1.8s_ease-in-out_infinite]" style={{ transformOrigin: "60px 14px" }}>
          <line x1="40" y1="14" x2="40" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-base-content/70" />
          <line x1="80" y1="14" x2="80" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-base-content/70" />
          <rect x="32" y="70" width="56" height="8" rx="3" className="fill-primary" />
        </g>
      </svg>
      {label && <p className="text-sm text-base-content/70">{label}</p>}
    </div>
  );
}
