"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { LocationPickerClient } from "@/components/Map/LocationPickerClient";
import { createPlaygroundAction, type AddState } from "./actions";

const SURFACE_OPTIONS = ["tartan", "sand", "grass", "gravel"] as const;
const FEATURE_KEYS = ["is_fenced", "has_shade", "has_water", "has_toilets", "has_parking"] as const;

type LatLng = { lat: number; lng: number };

export function AddFlow({ locale, emailVerified }: { locale: string; emailVerified: boolean }) {
  const t = useTranslations("add");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<File[]>([]);

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
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                className="file-input file-input-bordered w-full"
                aria-label={t("step3.pick")}
              />
              {photos.length > 0 && (
                <p className="text-sm text-base-content/70">
                  {t("step3.selected", { count: photos.length })}
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
          {state.error === "verify_email" && t("step3.verifyEmail")}
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
          >
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
