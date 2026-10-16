"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Images, X } from "lucide-react";
import { LocationPickerClient } from "@/components/Map/LocationPickerClient";
import { Turnstile } from "@/components/Turnstile";
import { resizeImage } from "@/lib/image";
import { MAX_PHOTOS, MAX_TOTAL_PHOTO_BYTES } from "@/lib/photo-checks";
import { createPlaygroundAction, type AddState } from "./actions";

const SURFACE_OPTIONS = ["tartan", "sand", "grass", "gravel"] as const;
const FEATURE_KEYS = ["is_fenced", "has_shade", "has_water", "has_toilets", "has_parking"] as const;
const MAX_TOTAL_MB = MAX_TOTAL_PHOTO_BYTES / 1024 / 1024;

type LatLng = { lat: number; lng: number };
type PhotoNotice = { tooMany: boolean; failed: boolean; tooLarge: boolean };
const NO_NOTICE: PhotoNotice = { tooMany: false, failed: false, tooLarge: false };

export function AddFlow({ locale, emailVerified }: { locale: string; emailVerified: boolean }) {
  const t = useTranslations("add");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<PhotoNotice>(NO_NOTICE);

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    // Allow the user to re-pick the same file later by clearing the input value.
    e.target.value = "";
    if (incoming.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
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
      setPhotos((prev) => [...prev, ...fitting]);
      setNotice(next);
    } finally {
      setProcessing(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setNotice(NO_NOTICE);
  }

  const [state, action, pending] = useActionState<AddState, FormData>(
    createPlaygroundAction,
    undefined,
  );

  const total = 3;
  const canNext1 = location !== null;
  const canNext2 = name.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-base-content/60">{t("step", { n: step, total })}</span>
      </div>

      <ul className="steps w-full">
        <li className={`step ${step >= 1 ? "step-primary" : ""}`}>{t("step1.title")}</li>
        <li className={`step ${step >= 2 ? "step-primary" : ""}`}>{t("step2.title")}</li>
        <li className={`step ${step >= 3 ? "step-primary" : ""}`}>{t("step3.title")}</li>
      </ul>

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-base-content/70">{t("step1.hint")}</p>
          <div className="h-[55dvh] min-h-80">
            <LocationPickerClient value={location} onChange={setLocation} />
          </div>
          {location && (
            <p className="text-xs text-base-content/60">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <label className="form-control">
            <span className="label-text mb-1">{t("step2.name")}</span>
            <input
              type="text"
              required
              className="input input-bordered w-full"
              placeholder={t("step2.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">{t("step2.description")}</span>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder={t("step2.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <fieldset>
            <legend className="label-text mb-2">{t("step2.surface")}</legend>
            <div className="flex flex-wrap gap-2">
              {SURFACE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSurface(s === surface ? "" : s)}
                  className={`btn btn-sm ${surface === s ? "btn-primary" : "btn-outline"}`}
                >
                  {t(`step2.surfaceOptions.${s}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label-text mb-2">{t("step2.features")}</legend>
            <div className="flex flex-col gap-2">
              {FEATURE_KEYS.map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={!!features[key]}
                    onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                  />
                  <span>{t(`step2.featureOptions.${key}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-3">
          {!emailVerified ? (
            <div role="alert" className="alert alert-warning text-sm">
              {t("step3.verifyEmail")}
            </div>
          ) : (
            <>
              <div role="alert" className="alert alert-info text-sm">
                {t("step3.disclaimer")}
              </div>

              <div className="flex flex-wrap gap-2">
                <label
                  className={`btn btn-primary gap-2 ${
                    processing || photos.length >= MAX_PHOTOS ? "btn-disabled" : ""
                  }`}
                >
                  <Camera className="size-4" aria-hidden />
                  {t("step3.takePhoto")}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={addPhotos}
                    disabled={processing || photos.length >= MAX_PHOTOS}
                    className="hidden"
                  />
                </label>
                <label
                  className={`btn btn-outline gap-2 ${
                    processing || photos.length >= MAX_PHOTOS ? "btn-disabled" : ""
                  }`}
                >
                  <Images className="size-4" aria-hidden />
                  {t("step3.chooseGallery")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={addPhotos}
                    disabled={processing || photos.length >= MAX_PHOTOS}
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
                    {t("step3.selected", { count: photos.length, max: MAX_PHOTOS })}
                    {" · "}
                    {t("step3.totalSize", {
                      kb: Math.round(photos.reduce((acc, p) => acc + p.size, 0) / 1024),
                    })}
                  </p>
                  <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {photos.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="relative aspect-square overflow-hidden rounded-box bg-base-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={t("step3.removePhoto")}
                          className="btn btn-circle btn-sm absolute right-1 top-1 min-h-9 w-9 min-w-9 bg-base-100/90 backdrop-blur"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {notice.tooMany && (
                <p role="alert" className="text-sm text-warning">
                  {t("step3.tooMany", { max: MAX_PHOTOS })}
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
          )}
        </section>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-error">
          {state.error === "no_location" && t("errors.noLocation")}
          {state.error === "no_name" && t("errors.noName")}
          {state.error === "upload_failed" && t("errors.uploadFailed")}
          {state.error === "turnstile_failed" && t("errors.turnstile")}
          {state.error === "verify_email" && t("step3.verifyEmail")}
          {state.error === "too_many_photos" && t("step3.tooMany", { max: MAX_PHOTOS })}
          {state.error === "photos_too_large" && t("step3.tooLarge", { mb: MAX_TOTAL_MB })}
          {state.error === "photo_metadata" && t("errors.photoMetadata")}
          {(state.error === "generic" || state.error === "auth_required") && t("errors.generic")}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            className="btn btn-ghost"
          >
            {t("back")}
          </button>
        ) : (
          <span />
        )}

        {step < 3 && (
          <button
            type="button"
            disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
            onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
            className="btn btn-primary"
          >
            {t("next")}
          </button>
        )}

        {step === 3 && (
          <form
            action={(fd) => {
              if (location) {
                fd.set("lat", String(location.lat));
                fd.set("lng", String(location.lng));
              }
              fd.set("name", name);
              fd.set("description", description);
              if (surface) fd.set("surface_type", surface);
              for (const k of FEATURE_KEYS) if (features[k]) fd.set(k, "on");
              for (const f of photos) fd.append("photos", f);
              fd.set("locale", locale);
              return action(fd);
            }}
            className="flex flex-col gap-3"
          >
            <Turnstile />
            <button type="submit" disabled={pending} className="btn btn-primary self-end">
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
