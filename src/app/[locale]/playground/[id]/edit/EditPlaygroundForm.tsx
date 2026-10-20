"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocationPickerClient } from "@/components/Map/LocationPickerClient";
import { DetailsFields } from "@/components/Playground/DetailsFields";
import { PLAYGROUND_FEATURE_KEYS, type FeatureKey } from "@/lib/playground-types";
import { updateOwnPlaygroundAction, type EditState } from "../actions";

export type EditablePlayground = {
  id: string;
  name: string;
  description: string;
  surface: string;
  lat: number;
  lng: number;
  features: Record<FeatureKey, boolean>;
};

// The owner's edit form (FR-ADD-08): move the pin, fix the details. Same fields as the add flow.
export function EditPlaygroundForm({ playground, locale }: { playground: EditablePlayground; locale: string }) {
  const t = useTranslations("edit");
  const tAdd = useTranslations("add");
  const tCommon = useTranslations("common");
  const [location, setLocation] = useState({ lat: playground.lat, lng: playground.lng });
  const [name, setName] = useState(playground.name);
  const [description, setDescription] = useState(playground.description);
  const [surface, setSurface] = useState(playground.surface);
  const [features, setFeatures] = useState(playground.features);
  const [nameError, setNameError] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<EditState, FormData>(updateOwnPlaygroundAction, undefined);

  return (
    <form
      noValidate
      action={(fd) => {
        if (!name.trim()) {
          setNameError(true);
          nameInput.current?.focus();
          return;
        }
        fd.set("id", playground.id);
        fd.set("locale", locale);
        fd.set("lat", String(location.lat));
        fd.set("lng", String(location.lng));
        fd.set("name", name);
        fd.set("description", description);
        if (surface) fd.set("surface_type", surface);
        for (const k of PLAYGROUND_FEATURE_KEYS) if (features[k]) fd.set(k, "on");
        return action(fd);
      }}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{tAdd("step1.title")}</h2>
        <p className="text-sm text-base-content/70">{tAdd("step1.hint")}</p>
        <div className="h-72">
          <LocationPickerClient value={location} onChange={setLocation} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{tAdd("step2.title")}</h2>
        <DetailsFields
          name={name}
          onNameChange={(value) => {
            setName(value);
            if (value.trim()) setNameError(false);
          }}
          nameError={nameError || state?.error === "no_name"}
          nameInput={nameInput}
          description={description}
          onDescriptionChange={setDescription}
          surface={surface}
          onSurfaceChange={setSurface}
          features={features}
          onFeatureToggle={(key) => setFeatures({ ...features, [key]: !features[key] })}
        />
      </section>

      {state?.error && state.error !== "no_name" && (
        <p role="alert" className="text-sm text-error">
          {state.error === "not_found" && t("errors.notFound")}
          {state.error === "no_location" && tAdd("errors.noLocation")}
          {state.error === "generic" && tAdd("errors.generic")}
        </p>
      )}

      {/* Sticky action bar, as in the add flow: always above the bottom nav. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 -mx-4 flex items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-4 py-3 md:bottom-0">
        <Link href={`/playground/${playground.id}`} className="btn btn-ghost">
          {tCommon("cancel")}
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary min-w-32">
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
