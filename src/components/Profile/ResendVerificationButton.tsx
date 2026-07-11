"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationAction, type AuthState } from "@/app/[locale]/(auth)/actions";

export function ResendVerificationButton({ locale }: { locale: string }) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    resendVerificationAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" disabled={pending} className="btn btn-sm btn-outline">
        {pending && <span className="loading loading-spinner loading-xs" aria-hidden />}
        {t("resendVerification")}
      </button>
      {state?.info && (
        <p role="status" className="text-xs text-success">
          {t("resendSuccess")}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-xs text-error">
          {t("resendError")}
        </p>
      )}
    </form>
  );
}
