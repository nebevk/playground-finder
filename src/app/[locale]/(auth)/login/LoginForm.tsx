"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginAction, type AuthState } from "../actions";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, undefined);

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
          autoComplete="current-password"
          className="input input-bordered w-full"
          placeholder={t("password")}
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-error">
          {t("errorGeneric")}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending && <span className="loading loading-spinner loading-sm" aria-hidden />}
        {t("submitLogin")}
      </button>

      <Link href="/signup" className="link link-hover text-sm text-center">
        {t("switchToSignup")}
      </Link>
    </form>
  );
}
