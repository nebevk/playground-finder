"use client";

import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Images, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FEATURE_ICONS, FeatureToggle } from "@/components/FeatureChip";
import { LocationPickerClient } from "@/components/Map/LocationPickerClient";
import type { ExistingPlayground } from "@/components/Map/LocationPicker";
import { Turnstile } from "@/components/Turnstile";
import { formatDistance, haversineMeters } from "@/lib/geo";
import { resizeImage } from "@/lib/image";
import { MAX_PHOTOS, MAX_TOTAL_PHOTO_BYTES } from "@/lib/photo-checks";
import { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES } from "@/lib/playground-types";
import { createPlaygroundAction, type AddState } from "./actions";

const MAX_TOTAL_MB = MAX_TOTAL_PHOTO_BYTES / 1024 / 1024;
// A new pin this close to an existing playground is probably the same one (BL-60).
const DUPLICATE_RADIUS_M = 50;
const FORM_ID = "add-playground-form";

type LatLng = { lat: number; lng: number };
type PhotoNotice = { tooMany: boolean; failed: boolean; tooLarge: boolean };
const NO_NOTICE: PhotoNotice = { tooMany: false, failed: false, tooLarge: false };

export function AddFlow({
  locale,
  emailVerified,
  existing,
}: {
  locale: string;
  emailVerified: boolean;
  existing: ExistingPlayground[];
}) {
  const t = useTranslations("add");
  const tFilters = useTranslations("filters");
  const displayLocale = useLocale();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<PhotoNotice>(NO_NOTICE);
  // Validate on tap: "Naprej" is always enabled and says what's missing (design critique).
  const [stepError, setStepError] = useState<"noLocation" | "noName" | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

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

  function goNext() {
    if (step === 1 && !location) return setStepError("noLocation");
    if (step === 2 && !name.trim()) {
      setStepError("noName");
      nameInput.current?.focus();
      return;
    }
    setStepError(null);
    setStep((s) => (s === 1 ? 2 : 3));
  }

  const [state, action, pending] = useActionState<AddState, FormData>(createPlaygroundAction, undefined);

  const possibleDuplicate = location
    ? existing
        .map((p) => ({ p, d: haversineMeters(location.lat, location.lng, p.lat, p.lng) }))
        .filter(({ d }) => d <= DUPLICATE_RADIUS_M)
        .sort((a, b) => a.d - b.d)[0]
    : undefined;

  const stepTitles = [t("step1.title"), t("step2.title"), t("step3.title")];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <ul className="steps w-full">
        {stepTitles.map((title, i) => (
          <li key={title} className={`step text-sm ${step >= i + 1 ? "step-primary" : ""}`} aria-current={step === i + 1 ? "step" : undefined}>
            {title}
          </li>
        ))}
      </ul>

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-base-content/70">{t("step1.hint")}</p>
          <div className="h-[50dvh] min-h-72">
            <LocationPickerClient
              value={location}
              onChange={(pos) => {
                setLocation(pos);
                setStepError(null);
              }}
              existing={existing}
            />
          </div>
          {possibleDuplicate && (
            <div role="status" className="alert alert-warning flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {t("step1.duplicate", {
                  name: possibleDuplicate.p.name,
                  distance: formatDistance(possibleDuplicate.d, displayLocale),
                })}
              </span>
              <Link href={`/playground/${possibleDuplicate.p.id}`} className="btn btn-outline bg-base-100">
                {t("step1.openExisting")}
              </Link>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-2">
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-sm">{t("step2.name")}</legend>
            <input
              ref={nameInput}
              type="text"
              required
              className="input w-full"
              placeholder={t("step2.namePlaceholder")}
              value={name}
              aria-invalid={stepError === "noName" || undefined}
              aria-describedby={stepError === "noName" ? "name-error" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setStepError(null);
              }}
            />
            {stepError === "noName" && (
              <p id="name-error" className="text-sm text-error">
                {t("errors.noName")}
              </p>
            )}
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend text-sm">{t("step2.description")}</legend>
            <textarea
              className="textarea w-full"
              rows={3}
              placeholder={t("step2.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend text-sm">{t("step2.surface")}</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {SURFACE_TYPES.map((s) => (
                <label
                  key={s}
                  className={`btn has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                    surface === s ? "btn-primary" : "btn-outline border-base-content/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="surface"
                    value={s}
                    className="sr-only"
                    checked={surface === s}
                    onChange={() => setSurface(s)}
                    // Tapping the chosen surface again clears it (it's optional).
                    onClick={() => surface === s && setSurface("")}
                  />
                  {t(`step2.surfaceOptions.${s}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend text-sm">{t("step2.features")}</legend>
            <div className="flex flex-wrap gap-2">
              {PLAYGROUND_FEATURE_KEYS.map((key) => (
                <FeatureToggle
                  key={key}
                  icon={FEATURE_ICONS[key]}
                  label={tFilters(`feature.${key}`)}
                  checked={!!features[key]}
                  onChange={() => setFeatures({ ...features, [key]: !features[key] })}
                />
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("step3.heading")}</h2>
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
                  className={`btn btn-outline gap-2 ${processing || photos.length >= MAX_PHOTOS ? "btn-disabled" : ""}`}
                >
                  <Camera className="size-5" aria-hidden />
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
                  className={`btn btn-outline gap-2 ${processing || photos.length >= MAX_PHOTOS ? "btn-disabled" : ""}`}
                >
                  <Images className="size-5" aria-hidden />
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
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((file, i) => (
                      <li key={`${file.name}-${i}`} className="relative aspect-square overflow-hidden rounded-box bg-base-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={t("step3.removePhoto", { n: i + 1, total: photos.length })}
                          className="btn btn-circle absolute top-1 right-1 bg-base-100/90 backdrop-blur"
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

          {/* The submit button lives in the sticky bar below (form attribute); the Turnstile
              widget stays here, inside the form, so its token is submitted with it. */}
          <form
            id={FORM_ID}
            action={(fd) => {
              if (location) {
                fd.set("lat", String(location.lat));
                fd.set("lng", String(location.lng));
              }
              fd.set("name", name);
              fd.set("description", description);
              if (surface) fd.set("surface_type", surface);
              for (const k of PLAYGROUND_FEATURE_KEYS) if (features[k]) fd.set(k, "on");
              for (const f of photos) fd.append("photos", f);
              fd.set("locale", locale);
              return action(fd);
            }}
          >
            <Turnstile />
          </form>
        </section>
      )}

      {(stepError === "noLocation" || state?.error) && (
        <p role="alert" className="text-sm text-error">
          {stepError === "noLocation" && t("errors.noLocation")}
          {state?.error === "no_location" && t("errors.noLocation")}
          {state?.error === "no_name" && t("errors.noName")}
          {state?.error === "upload_failed" && t("errors.uploadFailed")}
          {state?.error === "turnstile_failed" && t("errors.turnstile")}
          {state?.error === "verify_email" && t("step3.verifyEmail")}
          {state?.error === "too_many_photos" && t("step3.tooMany", { max: MAX_PHOTOS })}
          {state?.error === "photos_too_large" && t("step3.tooLarge", { mb: MAX_TOTAL_MB })}
          {state?.error === "photo_metadata" && t("errors.photoMetadata")}
          {(state?.error === "generic" || state?.error === "auth_required") && t("errors.generic")}
        </p>
      )}

      {/* Sticky action bar: always above the bottom nav, never scrolled out of reach. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 -mx-4 flex items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-4 py-3 md:bottom-0">
        {step > 1 ? (
          <button type="button" onClick={() => setStep((s) => (s === 3 ? 2 : 1))} className="btn btn-ghost">
            {t("back")}
          </button>
        ) : (
          <span />
        )}
        {/* Distinct keys: if React reused one <button> and flipped its type to "submit" inside
            the click that moves to step 3, the browser would submit the form on that click. */}
        {step < 3 ? (
          <button key="next" type="button" onClick={goNext} className="btn btn-primary min-w-32">
            {t("next")}
          </button>
        ) : (
          <button key="submit" type="submit" form={FORM_ID} disabled={pending} className="btn btn-primary min-w-32">
            {pending ? t("submitting") : t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
