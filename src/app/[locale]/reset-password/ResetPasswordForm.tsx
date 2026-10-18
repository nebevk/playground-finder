"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updatePasswordAction, type AuthState } from "../(auth)/actions";

export function ResetPasswordForm({ locale, tokenHash }: { locale: string; tokenHash: string | null }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    undefined,
  );
  const linkProblem = state?.error === "link_invalid" || state?.error === "session_expired";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {/* Once a submit has used up the token, retries rely on the session it created. */}
      {tokenHash && !state?.verified && <input type="hidden" name="token_hash" value={tokenHash} />}

      <label className="floating-label">
        <span>{t("newPassword")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input w-full"
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
          className="input w-full"
          placeholder={t("confirmPassword")}
        />
      </label>

      {state?.error === "password_mismatch" && (
        <p role="alert" className="text-sm text-error">
          {t("passwordMismatch")}
        </p>
      )}
      {state?.error === "same_password" && (
        <p role="alert" className="text-sm text-error">
          {t("samePassword")}
        </p>
      )}
      {linkProblem && (
        <p role="alert" className="text-sm text-error">
          {t("resetLinkInvalid")}{" "}
          <Link href="/forgot-password" className="link">
            {t("forgotTitle")}
          </Link>
        </p>
      )}
      {state?.error &&
        !linkProblem &&
        state.error !== "password_mismatch" &&
        state.error !== "same_password" && (
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
