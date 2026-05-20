"use client";

import { useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/app/[locale]/profile/actions";

export function DeleteAccountButton({ locale }: { locale: string }) {
  const t = useTranslations("profile");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

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

          <div className="modal-action mt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="btn btn-ghost btn-sm"
            >
              {t("deleteCancel")}
            </button>
            <form action={deleteAccountAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-error btn-sm">
                {t("deleteConfirm")}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
