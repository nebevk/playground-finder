"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Images, X } from "lucide-react";
import { Loader } from "@/components/Loader";
import { resizeImage } from "@/lib/image";
import { MAX_TOTAL_PHOTO_BYTES } from "@/lib/photo-checks";

const MAX_TOTAL_MB = MAX_TOTAL_PHOTO_BYTES / 1024 / 1024;

type PhotoNotice = { tooMany: boolean; failed: boolean; tooLarge: boolean };
const NO_NOTICE: PhotoNotice = { tooMany: false, failed: false, tooLarge: false };

// Choosing photos to upload, shared by the add flow and "add photos" (FR-ADD-06): the camera or
// the gallery, each photo resized in the browser (which also drops metadata such as GPS,
// GDPR-09), all kept within one request's size budget, under the children's-faces notice
// (GDPR-07). `max` is how many more photos this person may add here. `onProcessingChange` tells
// the form while photos are still being prepared, so it can hold its submit button: sending
// then would leave them out.
export function PhotoPicker({
  photos,
  onChange,
  max,
  onProcessingChange,
}: {
  photos: File[];
  onChange: (photos: File[]) => void;
  max: number;
  onProcessingChange?: (processing: boolean) => void;
}) {
  const t = useTranslations("add");
  const [processing, setProcessingState] = useState(false);
  const setProcessing = (busy: boolean) => {
    setProcessingState(busy);
    onProcessingChange?.(busy);
  };
  const [notice, setNotice] = useState<PhotoNotice>(NO_NOTICE);
  // Thumbnails: object URLs, released when the selection changes or the picker goes away.
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    // Allow the user to re-pick the same file later by clearing the input value.
    e.target.value = "";
    if (incoming.length === 0) return;

    const room = max - photos.length;
    const accepted = incoming.slice(0, Math.max(0, room));
    const next: PhotoNotice = { ...NO_NOTICE, tooMany: incoming.length > accepted.length };
    if (accepted.length === 0) return setNotice(next);

    setProcessing(true);
    try {
      // Never fall back to the original file: it may carry GPS metadata (GDPR-09).
      const results = await Promise.allSettled(accepted.map((f) => resizeImage(f)));
      const resized = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      next.failed = resized.length < accepted.length;

      // All photos go in one request, so keep the total within the server's budget.
      const fitting: File[] = [];
      let total = photos.reduce((sum, p) => sum + p.size, 0);
      for (const file of resized) {
        if (total + file.size > MAX_TOTAL_PHOTO_BYTES) {
          next.tooLarge = true;
          continue;
        }
        total += file.size;
        fitting.push(file);
      }
      onChange([...photos, ...fitting]);
      setNotice(next);
    } finally {
      setProcessing(false);
    }
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
    setNotice(NO_NOTICE);
  }

  const full = processing || photos.length >= max;

  return (
    <>
      <div role="alert" className="alert alert-info text-sm">
        {t("step3.disclaimer")}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className={`btn btn-outline gap-2 ${full ? "btn-disabled" : ""}`}>
          <Camera className="size-5" aria-hidden />
          {t("step3.takePhoto")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={addPhotos}
            disabled={full}
            className="hidden"
          />
        </label>
        <label className={`btn btn-outline gap-2 ${full ? "btn-disabled" : ""}`}>
          <Images className="size-5" aria-hidden />
          {t("step3.chooseGallery")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={addPhotos}
            disabled={full}
            className="hidden"
          />
        </label>
      </div>

      {processing && (
        <p role="status" className="flex items-center gap-2 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" aria-hidden />
          {t("step3.processing")}
        </p>
      )}

      {photos.length > 0 && (
        <>
          <p className="text-sm text-base-content/70">
            {t("step3.selected", { count: photos.length, max })}
            {" · "}
            {t("step3.totalSize", { kb: Math.round(photos.reduce((acc, p) => acc + p.size, 0) / 1024) })}
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((file, i) => (
              <li key={`${file.name}-${i}`} className="relative aspect-square overflow-hidden rounded-box bg-base-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  disabled={processing}
                  aria-label={t("step3.removePhoto", { n: i + 1, total: photos.length })}
                  className="btn btn-circle absolute top-1 right-1 bg-base-100 shadow-sm"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {notice.tooMany && (
        <p role="alert" className="text-sm text-warning">
          {t("step3.tooMany", { max })}
        </p>
      )}
      {notice.failed && (
        <p role="alert" className="text-sm text-warning">
          {t("step3.processingFailed")}
        </p>
      )}
      {notice.tooLarge && (
        <p role="alert" className="text-sm text-warning">
          {t("step3.tooLarge", { mb: MAX_TOTAL_MB })}
        </p>
      )}
    </>
  );
}

// While photos upload: on a phone connection that can take a few seconds, so say so, with the
// design kit's slide loader (its loader for long tasks).
export function UploadingPhotos() {
  const t = useTranslations("add");
  return (
    <div role="status" className="flex items-center gap-3 rounded-box bg-base-200/60 p-3 text-sm">
      <Loader variant="slide" className="h-12 w-auto shrink-0" />
      <p>{t("step3.uploading")}</p>
    </div>
  );
}
