"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Turnstile } from "@/components/Turnstile";
import { forgotPasswordAction, type AuthState } from "../actions";

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    forgotPasswordAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="floating-label">
        <span>{t("email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input input-bordered w-full"
          placeholder={t("email")}
        />
      </label>

      {state?.error === "turnstile_failed" && (
        <p role="alert" className="text-sm text-error">
          {t("turnstileFailed")}
        </p>
      )}
      {state?.error && state.error !== "turnstile_failed" && (
        <p role="alert" className="text-sm text-error">
          {t("errorGeneric")}
        </p>
      )}
      {state?.info === "check_email" && (
        <p role="status" className="text-sm text-success">
          {t("resetEmailSent")}
        </p>
      )}

      <Turnstile />

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending && <span className="loading loading-spinner loading-sm" aria-hidden />}
        {t("submitForgot")}
      </button>

      <Link href="/login" className="link link-hover text-sm text-center">
        {t("backToLogin")}
      </Link>
    </form>
  );
}
