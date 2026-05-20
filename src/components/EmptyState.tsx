import type { ReactNode } from "react";

type Variant = "reviews" | "photos" | "playgrounds" | "moderation";

function Illustration({ variant }: { variant: Variant }) {
  const stroke = "currentColor";
  const fill = "currentColor";
  switch (variant) {
    case "reviews":
      return (
        <svg viewBox="0 0 120 100" className="h-24 w-24 text-base-content/30" aria-hidden>
          <path d="M20 30 h60 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 H45 l-15 12 v-12 H20 a10 10 0 0 1 -10 -10 V40 a10 10 0 0 1 10 -10 z" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="35" cy="50" r="3" fill={fill} />
          <circle cx="50" cy="50" r="3" fill={fill} />
          <circle cx="65" cy="50" r="3" fill={fill} />
        </svg>
      );
    case "photos":
      return (
        <svg viewBox="0 0 120 100" className="h-24 w-24 text-base-content/30" aria-hidden>
          <rect x="15" y="25" width="90" height="60" rx="8" fill="none" stroke={stroke} strokeWidth="2" />
          <rect x="42" y="18" width="36" height="12" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="60" cy="55" r="14" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="60" cy="55" r="6" fill={fill} opacity="0.5" />
        </svg>
      );
    case "playgrounds":
      return (
        <svg viewBox="0 0 120 100" className="h-24 w-24 text-base-content/30" aria-hidden>
          <line x1="25" y1="20" x2="25" y2="80" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="20" x2="50" y2="80" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <line x1="25" y1="30" x2="50" y2="30" stroke={stroke} strokeWidth="2" />
          <line x1="25" y1="45" x2="50" y2="45" stroke={stroke} strokeWidth="2" />
          <line x1="25" y1="60" x2="50" y2="60" stroke={stroke} strokeWidth="2" />
          <path d="M50 25 Q100 50 90 85" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <circle cx="90" cy="88" r="4" fill={fill} />
        </svg>
      );
    case "moderation":
      return (
        <svg viewBox="0 0 120 100" className="h-24 w-24 text-base-content/30" aria-hidden>
          <path d="M60 20 L82 30 V52 c0 14 -10 24 -22 28 c-12 -4 -22 -14 -22 -28 V30 L60 20 z" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M52 50 l6 6 l12 -14" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function EmptyState({
  variant,
  title,
  description,
  action,
}: {
  variant: Variant;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-box border border-dashed border-base-300 px-6 py-10 text-center">
      <Illustration variant={variant} />
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="text-sm text-base-content/60">{description}</p>}
      {action}
    </div>
  );
}
