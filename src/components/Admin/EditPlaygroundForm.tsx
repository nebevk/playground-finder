"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import {
  EQUIPMENT_KEYS,
  SURFACE_TYPES,
  type EquipmentKey,
  type FeatureAnswers,
  type SurfaceType,
} from "@/lib/playground-types";
import { useTranslations } from "next-intl";
import { updatePlaygroundAction } from "@/app/[locale]/admin/actions";
import { FeatureAnswerChips } from "@/components/Playground/FeatureAnswers";
import { DESCRIPTION_MAX, NAME_MAX } from "@/lib/limits";

type Playground = {
  id: string;
  name: string;
  description: string | null;
  surfaces: SurfaceType[];
  /** The answers so far (answersOf): has it, doesn't have it, or missing = don't know. */
  features: FeatureAnswers;
  equipment: EquipmentKey[];
};

export function EditPlaygroundForm({
  playground,
  locale,
  trigger,
  triggerClassName,
}: {
  playground: Playground;
  locale: string;
  /** The opening button's content; `triggerClassName` styles the button itself. */
  trigger: ReactNode;
  triggerClassName: string;
}) {
  const t = useTranslations("admin.playgrounds");
  const tFields = useTranslations("add.step2");
  const tDetail = useTranslations("detail");
  const tSurf = useTranslations("add.step2.surfaceOptions");
  const tCommon = useTranslations("common");
  const id = useId();
  const ref = useRef<HTMLDialogElement | null>(null);
  const [features, setFeatures] = useState(playground.features);

  return (
    <>
      {/* A real button, not display: contents around a styled span: that has no box, so it can't
          be clicked by tests and isn't reliably focusable or announced. */}
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls={id}
        className={triggerClassName}
      >
        {trigger}
      </button>

      <dialog ref={ref} id={id} className="modal">
        <div className="modal-box max-w-xl">
          <h3 className="text-lg font-bold">{t("editTitle")}</h3>
          <form
            action={(fd) => {
              fd.set("id", playground.id);
              fd.set("locale", locale);
              return updatePlaygroundAction(fd);
            }}
            className="mt-4 flex flex-col gap-3"
          >
            <label className="form-control">
              <span className="label-text mb-1">{t("name")}</span>
              <input
                name="name"
                defaultValue={playground.name}
                required
                maxLength={NAME_MAX}
                className="input w-full"
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">{tFields("description")}</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={playground.description ?? ""}
                maxLength={DESCRIPTION_MAX}
                className="textarea w-full"
              />
            </label>

            <fieldset>
              <legend className="label-text mb-1">{t("surface")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {SURFACE_TYPES.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name="surfaces"
                      value={s}
                      defaultChecked={playground.surfaces.includes(s)}
                      className="checkbox checkbox-primary checkbox-sm"
                    />
                    <span>{tSurf(s)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-1">
              <legend className="label-text mb-1">{tFields("features")}</legend>
              <FeatureAnswerChips answers={features} onChange={setFeatures} hiddenInputs />
            </fieldset>

            <fieldset>
              <legend className="label-text mb-1">{tDetail("equipment")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name="equipment"
                      value={key}
                      defaultChecked={playground.equipment.includes(key)}
                      className="checkbox checkbox-primary checkbox-sm"
                    />
                    <span>{tDetail(`equipmentOptions.${key}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => ref.current?.close()}
                className="btn btn-ghost btn-sm"
              >
                {tCommon("cancel")}
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                {t("save")}
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
