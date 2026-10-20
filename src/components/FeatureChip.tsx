import type { LucideIcon } from "lucide-react";
import { Fence, GlassWater, Layers, SquareParking, Toilet, Trees } from "lucide-react";
import type { FeatureKey } from "@/lib/playground-types";

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  is_fenced: Fence,
  has_shade: Trees,
  has_water: GlassWater,
  has_toilets: Toilet,
  has_parking: SquareParking,
};
export const SURFACE_ICON = Layers;

// One way to show playground attributes everywhere (design critique, BL-59).

/** Static chip for the sheet and detail page. `missing` = not reported ("ni podatka"). */
export function FeatureBadge({
  icon: Icon,
  label,
  missing,
  missingLabel,
}: {
  icon: LucideIcon;
  label: string;
  missing?: boolean;
  missingLabel?: string;
}) {
  return (
    <li
      // Neutral: violet means "you can tap this", and these are information.
      className={`badge h-auto min-h-7 gap-1.5 py-1 ${missing ? "badge-ghost text-base-content/60" : "badge-soft"}`}
    >
      <Icon className={`size-3.5 shrink-0 ${missing ? "" : "text-base-content/70"}`} aria-hidden />
      <span>
        {label}
        {missing && missingLabel && <span className="font-normal"> · {missingLabel}</span>}
      </span>
    </li>
  );
}

/** 44 px toggle chip wrapping a real checkbox, for filters and the add form. */
export function FeatureToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  name,
}: {
  icon?: LucideIcon;
  label: string;
  checked: boolean;
  onChange: () => void;
  name?: string;
}) {
  return (
    <label
      className={`btn gap-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
        checked ? "btn-primary" : "btn-outline border-base-content/30"
      }`}
    >
      <input type="checkbox" name={name} className="sr-only" checked={checked} onChange={onChange} />
      {Icon && <Icon className="size-4" aria-hidden />}
      {label}
    </label>
  );
}
