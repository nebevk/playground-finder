"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginAction, type AuthState } from "../actions";

export function LoginForm({ locale, next }: { locale: string; next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      <label className="floating-label">
        <span>{t("email")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input w-full"
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
          autoComplete="current-password"
          className="input w-full"
          placeholder={t("password")}
        />
      </label>

      <Link href="/forgot-password" className="link link-primary -mt-2 inline-flex min-h-11 items-center self-end text-sm">
        {t("forgotPassword")}
      </Link>

      {state?.error && (
        <p role="alert" className="text-sm text-error">
          {state.error === "email_not_confirmed" ? t("emailNotConfirmed") : t("errorGeneric")}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending && <span className="loading loading-spinner loading-sm" aria-hidden />}
        {t("submitLogin")}
      </button>

      <Link
        href={next ? { pathname: "/signup", query: { next } } : "/signup"}
        className="link link-primary inline-flex min-h-11 items-center justify-center text-sm"
      >
        {t("switchToSignup")}
      </Link>
    </form>
  );
}
