"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
      <p className="max-w-sm text-base-content/70">{t("errorBody")}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-2">
        {t("errorRetry")}
      </button>
    </section>
  );
}
