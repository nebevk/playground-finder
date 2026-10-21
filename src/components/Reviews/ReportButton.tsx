"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { submitReportAction, type ReportState } from "@/app/[locale]/playground/[id]/actions";

const REASONS = ["spam", "incorrect_info", "privacy_violation", "other"] as const;
type Reason = (typeof REASONS)[number];

export function ReportButton({
  targetType,
  targetId,
  playgroundId,
  locale,
  label,
  buttonClassName,
}: {
  targetType: "playground" | "review" | "photo";
  targetId: string;
  playgroundId: string;
  locale: string;
  /** Visible text; without it the button is a 44 px icon button named by `detail.report`. */
  label?: string;
  /** Replaces the trigger's classes, e.g. light text in the dark photo viewer. */
  buttonClassName?: string;
}) {
  const t = useTranslations("detail");
  const tCommon = useTranslations("common");
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [reason, setReason] = useState<Reason>("spam");
  const [state, action, pending] = useActionState<ReportState, FormData>(
    submitReportAction,
    undefined,
  );

  function open() {
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={label ?? t("report")}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        className={buttonClassName ?? (label ? "btn btn-ghost gap-1" : "btn btn-ghost btn-circle")}
      >
        <Flag className="size-4" aria-hidden />
        {label && <span>{label}</span>}
      </button>

      <dialog ref={dialogRef} id={dialogId} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("reportTitle")}</h3>

          <form
            action={(fd) => {
              fd.set("target_type", targetType);
              fd.set("target_id", targetId);
              fd.set("reason", reason);
              fd.set("playground_id", playgroundId);
              fd.set("locale", locale);
              return action(fd);
            }}
            className="mt-4 flex flex-col gap-2"
          >
            {REASONS.map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="radio radio-primary"
                />
                <span>{t(`reportReasons.${r}`)}</span>
              </label>
            ))}

            {state?.success && (
              <p role="status" className="text-sm text-success">
                {t("reportSuccess")}
              </p>
            )}
            {state?.error === "duplicate" && (
              <p role="alert" className="text-sm text-warning">
                {t("reportDuplicate")}
              </p>
            )}
            {state?.error && state.error !== "duplicate" && (
              <p role="alert" className="text-sm text-error">
                {state.error === "rate_limited" ? t("reviewError.rate_limited") : t("reviewError.generic")}
              </p>
            )}

            <div className="modal-action mt-4">
              <button type="button" onClick={close} className="btn btn-ghost">
                {t("reportCancel")}
              </button>
              <button type="submit" disabled={pending} className="btn btn-primary">
                {t("reportSubmit")}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label={tCommon("close")} />
        </form>
      </dialog>
    </>
  );
}
