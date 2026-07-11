"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Turnstile } from "@/components/Turnstile";
import { signupAction, type AuthState } from "../actions";

export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, undefined);

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

      <label className="floating-label">
        <span>{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input input-bordered w-full"
          placeholder={t("password")}
        />
      </label>

      <label className="label cursor-pointer items-start gap-3 py-1">
        <input
          name="consent"
          type="checkbox"
          required
          className="checkbox checkbox-primary mt-1"
        />
        <span className="label-text text-sm leading-snug">
          {t.rich("consent", {
            privacyLink: (chunks) => (
              <Link href="/privacy" className="link link-primary">
                {chunks}
              </Link>
            ),
            termsLink: (chunks) => (
              <Link href="/terms" className="link link-primary">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      <label className="label cursor-pointer items-start gap-3 py-1">
        <input
          name="age_confirmed"
          type="checkbox"
          required
          className="checkbox checkbox-primary mt-1"
        />
        <span className="label-text text-sm leading-snug">{t("ageConsent")}</span>
      </label>

      {state?.error === "consent_required" && (
        <p role="alert" className="text-sm text-error">
          {t("consentRequired")}
        </p>
      )}
      {state?.error === "age_required" && (
        <p role="alert" className="text-sm text-error">
          {t("ageRequired")}
        </p>
      )}
      {state?.error === "turnstile_failed" && (
        <p role="alert" className="text-sm text-error">
          {t("turnstileFailed")}
        </p>
      )}
      {state?.error &&
        !["consent_required", "age_required", "turnstile_failed"].includes(state.error) && (
          <p role="alert" className="text-sm text-error">
            {t("errorGeneric")}
          </p>
        )}
      {state?.info === "check_email" && (
        <p role="status" className="text-sm text-success">
          {t("checkEmail")}
        </p>
      )}

      <Turnstile />

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending && <span className="loading loading-spinner loading-sm" aria-hidden />}
        {t("submitSignup")}
      </button>

      <Link href="/login" className="link link-hover text-sm text-center">
        {t("switchToLogin")}
      </Link>
    </form>
  );
}
