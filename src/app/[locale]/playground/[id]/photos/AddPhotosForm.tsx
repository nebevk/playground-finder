"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PhotoPicker, UploadingPhotos } from "@/components/Playground/PhotoPicker";
import { Turnstile } from "@/components/Turnstile";
import { MAX_PHOTOS, MAX_TOTAL_PHOTO_BYTES } from "@/lib/photo-checks";
import { addPhotosAction, type AddPhotosState } from "../actions";

// Adding photos to an existing playground (FR-ADD-06). `remaining` is how many more this person
// may add here (8 per playground in total); the server re-checks it.
export function AddPhotosForm({
  playgroundId,
  locale,
  verified,
  remaining,
}: {
  playgroundId: string;
  locale: string;
  verified: boolean;
  remaining: number;
}) {
  const t = useTranslations("addPhotos");
  const tAdd = useTranslations("add");
  const tCommon = useTranslations("common");
  const [photos, setPhotos] = useState<File[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [state, action, pending] = useActionState<AddPhotosState, FormData>(addPhotosAction, undefined);

  const back = (
    <Link href={`/playground/${playgroundId}`} className="btn btn-ghost self-start">
      {tCommon("cancel")}
    </Link>
  );
  if (!verified) {
    return (
      <>
        <div role="alert" className="alert alert-warning text-sm">
          {t("verifyEmail")}
        </div>
        {back}
      </>
    );
  }
  if (remaining <= 0) {
    return (
      <>
        <p className="text-base-content/80">{t("limitReached", { max: MAX_PHOTOS })}</p>
        {back}
      </>
    );
  }

  const error = state?.error;
  return (
    <form
      action={(fd) => {
        fd.set("playground_id", playgroundId);
        fd.set("locale", locale);
        for (const f of photos) fd.append("photos", f);
        return action(fd);
      }}
      className="flex flex-col gap-4"
    >
      <PhotoPicker photos={photos} onChange={setPhotos} max={remaining} onProcessingChange={setPreparing} />
      <Turnstile resetKey={state} />

      {pending && <UploadingPhotos />}

      {error && (
        <p role="alert" className="text-sm text-error">
          {error === "photo_limit" && t("limitReached", { max: MAX_PHOTOS })}
          {error === "too_many_photos" && tAdd("step3.tooMany", { max: remaining })}
          {error === "verify_email" && t("verifyEmail")}
          {error === "photos_too_large" && tAdd("step3.tooLarge", { mb: MAX_TOTAL_PHOTO_BYTES / 1024 / 1024 })}
          {error === "photo_metadata" && tAdd("errors.photoMetadata")}
          {error === "upload_failed" && tAdd("errors.uploadFailed")}
          {error === "turnstile_failed" && tAdd("errors.turnstile")}
          {error === "rate_limited" && tAdd("errors.rateLimited")}
          {error === "no_photos" && t("noPhotos")}
          {error === "not_found" && t("notFound")}
          {error === "generic" && tAdd("errors.generic")}
        </p>
      )}

      {/* Sticky action bar, as in the add flow: always above the bottom nav. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 -mx-4 flex items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-4 py-3 md:bottom-0">
        <Link href={`/playground/${playgroundId}`} className="btn btn-ghost">
          {tCommon("cancel")}
        </Link>
        <button type="submit" disabled={pending || preparing || photos.length === 0} className="btn btn-primary min-w-32">
          {pending ? t("uploading") : t("submit")}
        </button>
      </div>
    </form>
  );
}
