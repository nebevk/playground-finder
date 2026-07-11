"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updatePasswordAction, type AuthState } from "../(auth)/actions";

export function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="floating-label">
        <span>{t("newPassword")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input input-bordered w-full"
          placeholder={t("newPassword")}
        />
      </label>

      <label className="floating-label">
        <span>{t("confirmPassword")}</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input input-bordered w-full"
          placeholder={t("confirmPassword")}
        />
      </label>

      {state?.error === "password_mismatch" && (
        <p role="alert" className="text-sm text-error">
          {t("passwordMismatch")}
        </p>
      )}
      {state?.error === "session_expired" && (
        <p role="alert" className="text-sm text-error">
          {t("resetLinkInvalid")}{" "}
          <Link href="/forgot-password" className="link">
            {t("forgotTitle")}
          </Link>
        </p>
      )}
      {state?.error &&
        state.error !== "password_mismatch" &&
        state.error !== "session_expired" && (
          <p role="alert" className="text-sm text-error">
            {t("errorGeneric")}
          </p>
        )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending && <span className="loading loading-spinner loading-sm" aria-hidden />}
        {t("submitReset")}
      </button>
    </form>
  );
}
