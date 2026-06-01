"use client";

import { useActionState, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteAccountAction, type DeleteAccountState } from "@/app/[locale]/profile/actions";

export function DeleteAccountButton({ locale }: { locale: string }) {
  const t = useTranslations("profile");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccountAction,
    undefined,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls={id}
        className="btn btn-error btn-outline gap-2"
      >
        <Trash2 className="size-4" aria-hidden />
        {t("deleteAccount")}
      </button>

      <dialog ref={dialogRef} id={id} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("deleteConfirmTitle")}</h3>
          <p className="mt-2 text-sm text-base-content/80">{t("deleteConfirmBody")}</p>

          {state?.error && (
            <p role="alert" className="mt-3 text-sm text-error">
              {t("deleteError")}
            </p>
          )}

          <div className="modal-action mt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="btn btn-ghost btn-sm"
            >
              {t("deleteCancel")}
            </button>
            <form action={action}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" disabled={pending} className="btn btn-error btn-sm">
                {pending ? t("deleting") : t("deleteConfirm")}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label={t("deleteCancel")} />
        </form>
      </dialog>
    </>
  );
}
