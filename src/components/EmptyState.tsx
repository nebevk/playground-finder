import type { ReactNode } from "react";

type Variant = "reviews" | "photos" | "playgrounds" | "moderation";

function Illustration({ variant }: { variant: Variant }) {
  const stroke = "currentColor";
  const fill = "currentColor";
  switch (variant) {
    case "reviews":
      return (
        <svg viewBox="0 0 120 100" className="h-16 w-16 text-primary" aria-hidden>
          <path d="M20 30 h60 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 H45 l-15 12 v-12 H20 a10 10 0 0 1 -10 -10 V40 a10 10 0 0 1 10 -10 z" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="35" cy="50" r="3" fill={fill} />
          <circle cx="50" cy="50" r="3" fill={fill} />
          <circle cx="65" cy="50" r="3" fill={fill} />
        </svg>
      );
    case "photos":
      return (
        <svg viewBox="0 0 120 100" className="h-16 w-16 text-primary" aria-hidden>
          <rect x="15" y="25" width="90" height="60" rx="8" fill="none" stroke={stroke} strokeWidth="2" />
          <rect x="42" y="18" width="36" height="12" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="60" cy="55" r="14" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="60" cy="55" r="6" fill={fill} opacity="0.5" />
        </svg>
      );
    case "playgrounds":
      // The design kit's empty-state swing, rocking gently (stops with reduced motion).
      return (
        <svg viewBox="0 0 160 140" className="h-auto w-24" aria-hidden>
          <svg x="10" y="10" width="140" height="120" viewBox="0 0 140 120" overflow="visible">
            <defs>
              <filter id="ksi-empty-glow" x="-40%" y="-120%" width="180%" height="340%">
                <feGaussianBlur stdDeviation="4.5" />
              </filter>
            </defs>
            <g filter="url(#ksi-empty-glow)">
              <ellipse cx="52" cy="108" rx="34" ry="7" fill="#d6b6f3" />
              <ellipse cx="90" cy="109" rx="32" ry="6" fill="#f3c1e1" />
            </g>
            <g
              className="ksi-motion"
              style={{
                transformBox: "view-box",
                transformOrigin: "70px 22px",
                animation: "ksi-rock 2.4s cubic-bezier(.45,0,.55,1) infinite alternate both",
              }}
            >
              <line x1="61" y1="23" x2="61" y2="84" stroke="#8e4ae2" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="79" y1="23" x2="79" y2="84" stroke="#8e4ae2" strokeWidth="2.4" strokeLinecap="round" />
              <rect x="55" y="82" width="30" height="6" rx="3" fill="#ac46b9" />
            </g>
            <line x1="30" y1="108" x2="36" y2="20" stroke="#8e4ae2" strokeWidth="5" strokeLinecap="round" />
            <line x1="110" y1="108" x2="104" y2="20" stroke="#8e4ae2" strokeWidth="5" strokeLinecap="round" />
            <line x1="22" y1="20" x2="118" y2="20" stroke="#8e4ae2" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </svg>
      );
    case "moderation":
      return (
        <svg viewBox="0 0 120 100" className="h-16 w-16 text-primary" aria-hidden>
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
    <div className="flex flex-col items-center gap-3 rounded-box bg-base-200/60 px-6 py-10 text-center">
      <div className="flex size-24 items-center justify-center">
        <Illustration variant={variant} />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="text-sm text-base-content/60">{description}</p>}
      {action}
    </div>
  );
}
