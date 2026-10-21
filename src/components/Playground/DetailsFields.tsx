"use client";

import type { Ref } from "react";
import { useTranslations } from "next-intl";
import { FEATURE_ICONS, FeatureToggle } from "@/components/FeatureChip";
import { DESCRIPTION_MAX, NAME_MAX } from "@/lib/limits";
import {
  EQUIPMENT_KEYS,
  PLAYGROUND_FEATURE_KEYS,
  SURFACE_TYPES,
  type EquipmentKey,
  type FeatureKey,
} from "@/lib/playground-types";

// A playground's details, shared by the add flow (step 2) and the owner's edit page: the name
// (required), a description, the surface (tap the chosen one again to clear it, it's optional),
// what the playground has (an unticked feature means "doesn't have it", shown as "Brez …") and
// its play equipment.
export function DetailsFields({
  name,
  onNameChange,
  nameError = false,
  nameInput,
  description,
  onDescriptionChange,
  surface,
  onSurfaceChange,
  features,
  onFeatureToggle,
  equipment,
  onEquipmentToggle,
}: {
  name: string;
  onNameChange: (name: string) => void;
  /** Show "Vnesi ime igrišča." under the name field. */
  nameError?: boolean;
  nameInput?: Ref<HTMLInputElement>;
  description: string;
  onDescriptionChange: (description: string) => void;
  surface: string;
  onSurfaceChange: (surface: string) => void;
  features: Partial<Record<FeatureKey, boolean>>;
  onFeatureToggle: (key: FeatureKey) => void;
  equipment: readonly EquipmentKey[];
  onEquipmentToggle: (key: EquipmentKey) => void;
}) {
  const t = useTranslations("add");
  const tFilters = useTranslations("filters");
  const tDetail = useTranslations("detail");

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm">{t("step2.name")}</legend>
        <input
          ref={nameInput}
          type="text"
          required
          className="input w-full"
          placeholder={t("step2.namePlaceholder")}
          maxLength={NAME_MAX}
          value={name}
          aria-invalid={nameError || undefined}
          aria-describedby={nameError ? "name-error" : undefined}
          onChange={(e) => onNameChange(e.target.value)}
        />
        {nameError && (
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
          maxLength={DESCRIPTION_MAX}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
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
                onChange={() => onSurfaceChange(s)}
                // Tapping the chosen surface again clears it (it's optional).
                onClick={() => surface === s && onSurfaceChange("")}
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
              onChange={() => onFeatureToggle(key)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend text-sm">{t("step2.equipment")}</legend>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_KEYS.map((key) => (
            <FeatureToggle
              key={key}
              label={tDetail(`equipmentOptions.${key}`)}
              checked={equipment.includes(key)}
              onChange={() => onEquipmentToggle(key)}
            />
          ))}
        </div>
      </fieldset>
    </>
  );
}
