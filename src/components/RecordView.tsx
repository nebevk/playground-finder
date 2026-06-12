"use client";

import { useEffect, useRef } from "react";
import { recordPlaygroundViewAction } from "@/app/[locale]/playground/[id]/actions";

// Records a detail-page view once on mount. Lives in a client effect so prefetching a
// link (which doesn't run client effects) doesn't inflate the counter.
export function RecordView({ id }: { id: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void recordPlaygroundViewAction(id);
  }, [id]);
  return null;
}
