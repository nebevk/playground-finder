"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";

// Inside a <Link>: while the link's page loads, its icon becomes a spinner. Pages have no shared
// loading screen (so a missing page answers with a real 404, BL-44), so this is what tells the
// visitor their tap registered.
export function PendingIcon({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <span className={`loading loading-spinner ${className}`} aria-hidden /> : children;
}

// The same for a link without an icon: a small spinner while its page loads.
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="loading loading-spinner loading-xs shrink-0" aria-hidden /> : null;
}
