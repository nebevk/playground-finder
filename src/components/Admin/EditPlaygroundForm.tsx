"use client";

import { useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { updatePlaygroundAction } from "@/app/[locale]/admin/actions";

const SURFACE_OPTIONS = ["tartan", "sand", "grass", "gravel"] as const;
const FEATURE_KEYS = ["is_fenced", "has_shade", "has_water", "has_toilets", "has_parking"] as const;

type Playground = {
  id: string;
  name: string;
  description: string | null;
  surface_type: "tartan" | "sand" | "grass" | "gravel" | null;
  is_fenced: boolean;
  has_shade: boolean;
  has_water: boolean;
  has_toilets: boolean;
  has_parking: boolean;
};

export function EditPlaygroundForm({
  playground,
  locale,
  trigger,
}: {
  playground: Playground;
  locale: string;
  trigger: ReactNode;
}) {
  const t = useTranslations("admin.playgrounds");
  const tFeat = useTranslations("add.step2.featureOptions");
  const tSurf = useTranslations("add.step2.surfaceOptions");
  const id = useId();
  const ref = useRef<HTMLDialogElement | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls={id}
        className="contents"
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
                className="input input-bordered w-full"
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Description</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={playground.description ?? ""}
                className="textarea textarea-bordered w-full"
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">{t("surface")}</span>
              <select
                name="surface_type"
                defaultValue={playground.surface_type ?? ""}
                className="select select-bordered"
              >
                <option value="">-</option>
                {SURFACE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {tSurf(s)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="label-text mb-1">Features</legend>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name={key}
                      defaultChecked={playground[key]}
                      className="checkbox checkbox-primary checkbox-sm"
                    />
                    <span>{tFeat(key)}</span>
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
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                {t("save")}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
