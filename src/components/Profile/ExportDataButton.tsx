"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { exportDataAction } from "@/app/[locale]/profile/actions";

export function ExportDataButton() {
  const t = useTranslations("profile");
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportDataAction();
      if (result.error || !result.data) return;

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `playground-finder-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button type="button" onClick={handleExport} disabled={pending} className="btn btn-outline gap-2">
      <Download className="size-4" aria-hidden />
      {pending ? t("exporting") : t("exportData")}
    </button>
  );
}
