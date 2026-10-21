"use client";

import { useId } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";

export type LoaderVariant = "swing" | "slide" | "pin";

// The design kit's loaders: a swing (the default), a slide (long tasks such as uploads) and a
// hopping pin (maps and location). Inline rather than <img> files: the kit's exported SVGs lost
// their keyframes (now in globals.css, `ksi-*`), and inline they stop for people who prefer
// reduced motion. Decorative; the caller says what is loading.
export function Loader({ variant = "swing", className }: { variant?: LoaderVariant; className?: string }) {
  const blur = useId();
  // The kit's soft lilac and pink glow under each drawing.
  const glow = (cx1: number, cx2: number, cy: number, rx1: number, rx2: number) => (
    <>
      <defs>
        <filter id={blur} x="-40%" y="-120%" width="180%" height="340%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>
      <g filter={`url(#${blur})`}>
        <ellipse cx={cx1} cy={cy} rx={rx1} ry="7" fill="#d6b6f3" />
        <ellipse cx={cx2} cy={cy + 1} rx={rx2} ry="6" fill="#f3c1e1" />
      </g>
    </>
  );

  if (variant === "slide") {
    return (
      <svg viewBox="0 0 160 132" className={className} aria-hidden>
        <svg x="10" y="10" width="140" height="112" viewBox="0 0 140 112" overflow="visible">
          {glow(50, 102, 101, 38, 32)}
          <path d="M58 36 C 76 36, 86 88, 110 92 L 124 92" transform="translate(0,4)" stroke="#e4d6f7" strokeWidth="9" strokeLinecap="round" fill="none" />
          <line x1="58" y1="40" x2="58" y2="100" stroke="#8e4ae2" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="118" y1="94" x2="118" y2="100" stroke="#8e4ae2" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M58 36 C 76 36, 86 88, 110 92 L 124 92" stroke="#8e4ae2" strokeWidth="5" strokeLinecap="round" fill="none" />
          <line x1="22" y1="100" x2="30" y2="22" stroke="#8e4ae2" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="36" y1="100" x2="44" y2="22" stroke="#8e4ae2" strokeWidth="3.5" strokeLinecap="round" />
          {[86, 72, 58, 44].map((y, i) => (
            <line key={y} x1={23.4 + i * 1.45} y1={y} x2={37.4 + i * 1.45} y2={y} stroke="#8e4ae2" strokeWidth="2.5" strokeLinecap="round" />
          ))}
          <line x1="28.6" y1="36" x2="58" y2="36" stroke="#8e4ae2" strokeWidth="4" strokeLinecap="round" />
          <SlideBall />
        </svg>
      </svg>
    );
  }

  if (variant === "pin") {
    return (
      <svg viewBox="0 0 140 132" className={className} aria-hidden>
        <svg x="10" y="10" width="120" height="112" viewBox="0 0 120 112" overflow="visible">
          {glow(44, 78, 101, 32, 30)}
          <ellipse cx="60" cy="98" rx="13" ry="3.4" fill="none" stroke="#8e4ae2" strokeWidth="1.6" className="ksi-motion" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "ksi-ripple 1.1s ease-out -0.13s infinite" }} />
          <ellipse cx="60" cy="98" rx="11" ry="3" fill="#3b2a55" fillOpacity=".22" className="ksi-motion" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "ksi-pinshadow 1.1s ease-in-out infinite" }} />
          <g className="ksi-motion" style={{ transformBox: "view-box", transformOrigin: "60px 97px", animation: "ksi-hop 1.1s infinite" }}>
            <path d="M60 97 C 56 87, 44 81, 44 69 A 16 16 0 1 1 76 69 C 76 81, 64 87, 60 97 Z" fill="#8e4ae2" stroke="#7436c8" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="60" cy="69" r="5.8" fill="#ffffff" />
          </g>
        </svg>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 140 132" className={className} aria-hidden>
      <svg x="10" y="10" width="120" height="112" viewBox="0 0 120 112" overflow="visible">
        {glow(44, 78, 101, 32, 30)}
        <ellipse cx="60" cy="101" rx="9" ry="2.4" fill="#3b2a55" fillOpacity=".2" className="ksi-motion" style={{ animation: "ksi-shadow 0.85s cubic-bezier(.45,0,.55,1) infinite alternate" }} />
        <g className="ksi-motion" style={{ transformBox: "view-box", transformOrigin: "60px 19px", animation: "ksi-swing 0.85s cubic-bezier(.45,0,.55,1) infinite alternate" }}>
          <line x1="60" y1="20" x2="60" y2="80" stroke="#8e4ae2" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="50" y="78" width="20" height="6" rx="3" fill="#ac46b9" />
        </g>
        <line x1="60" y1="18" x2="25" y2="101" stroke="#8e4ae2" strokeWidth="5" strokeLinecap="round" />
        <line x1="60" y1="18" x2="95" y2="101" stroke="#8e4ae2" strokeWidth="5" strokeLinecap="round" />
        <circle cx="60" cy="18" r="4.5" fill="#8e4ae2" />
      </svg>
    </svg>
  );
}

// The ball riding down the slide (the kit's SMIL motion was lost in export, so it's redrawn here
// along the slide's own path). With reduced motion it waits at the bottom instead.
function SlideBall() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  if (reduced !== false) return <circle cx="122" cy="86" r="5.5" fill="#ac46b9" />;
  return (
    <circle r="5.5" fill="#ac46b9" opacity="0">
      <animateMotion
        dur="1.6s"
        repeatCount="indefinite"
        path="M58 30 C 76 30, 86 82, 110 86 L 124 86"
        keyPoints="0;0;1;1"
        keyTimes="0;0.15;0.8;1"
        calcMode="spline"
        keySplines="0 0 1 1;0.55 0 0.85 0.6;0 0 1 1"
      />
      <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.1;0.8;0.92;1" dur="1.6s" repeatCount="indefinite" />
    </circle>
  );
}

// A loading state: a loader with an optional caption, filling the space it's given.
export function LoadingState({ variant = "swing", label }: { variant?: LoaderVariant; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
      <Loader variant={variant} className="h-24 w-auto" />
      {label && <p className="text-sm text-base-content/70">{label}</p>}
    </div>
  );
}
