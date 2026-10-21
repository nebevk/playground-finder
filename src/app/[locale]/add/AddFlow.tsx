"use client";

import { useActionState, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocationPickerClient } from "@/components/Map/LocationPickerClient";
import { DetailsFields } from "@/components/Playground/DetailsFields";
import { PhotoPicker } from "@/components/Playground/PhotoPicker";
import type { ExistingPlayground } from "@/components/Map/LocationPicker";
import { Turnstile } from "@/components/Turnstile";
import { formatDistance, haversineMeters } from "@/lib/geo";
import { MAX_PHOTOS, MAX_TOTAL_PHOTO_BYTES } from "@/lib/photo-checks";
import { PLAYGROUND_FEATURE_KEYS } from "@/lib/playground-types";
import { createPlaygroundAction, type AddState } from "./actions";

const MAX_TOTAL_MB = MAX_TOTAL_PHOTO_BYTES / 1024 / 1024;
// A new pin this close to an existing playground is probably the same one (BL-60).
const DUPLICATE_RADIUS_M = 50;
const FORM_ID = "add-playground-form";

type LatLng = { lat: number; lng: number };

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
  const displayLocale = useLocale();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  // Validate on tap: "Naprej" is always enabled and says what's missing (design critique).
  const [stepError, setStepError] = useState<"noLocation" | "noName" | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

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
          <DetailsFields
            name={name}
            onNameChange={(value) => {
              setName(value);
              if (value.trim()) setStepError(null);
            }}
            nameError={stepError === "noName"}
            nameInput={nameInput}
            description={description}
            onDescriptionChange={setDescription}
            surface={surface}
            onSurfaceChange={setSurface}
            features={features}
            onFeatureToggle={(key) => setFeatures({ ...features, [key]: !features[key] })}
          />
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
            <PhotoPicker photos={photos} onChange={setPhotos} max={MAX_PHOTOS} />
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
