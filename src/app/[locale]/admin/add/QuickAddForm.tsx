"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocationPickerClient } from "@/components/Map/LocationPickerClient";
import { useToast } from "@/components/Toast/ToastProvider";
import { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES } from "@/lib/playground-types";
import {
  geocodeAddressAction,
  nearbyPlaygroundsAction,
  quickAddPlaygroundAction,
  type NearbyPlayground,
} from "./actions";

type LatLng = { lat: number; lng: number };

export function QuickAddForm({ locale }: { locale: string }) {
  const t = useTranslations("admin.quickAdd");
  const tFields = useTranslations("add.step2");
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  const [address, setAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surface, setSurface] = useState("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [nearby, setNearby] = useState<NearbyPlayground[]>([]);

  // Live duplicate check whenever the pin moves (debounced).
  const checkSeq = useRef(0);
  useEffect(() => {
    const seq = ++checkSeq.current;
    if (!location) return;
    const handle = setTimeout(async () => {
      const result = await nearbyPlaygroundsAction(location.lat, location.lng);
      if (seq === checkSeq.current) setNearby(result);
    }, 400);
    return () => clearTimeout(handle);
  }, [location]);

  function handleGeocode() {
    if (!address.trim()) return;
    setGeocoding(true);
    startTransition(async () => {
      const result = await geocodeAddressAction(address);
      setGeocoding(false);
      if (!result) {
        showToast(t("geocodeFail"), "error");
        return;
      }
      setLocation({ lat: result.lat, lng: result.lng });
    });
  }

  function handleSubmit() {
    if (!location || !name.trim()) return;
    startTransition(async () => {
      const res = await quickAddPlaygroundAction(
        {
          lat: location.lat,
          lng: location.lng,
          name,
          description,
          surface_type: surface,
          features,
        },
        locale,
      );
      if (!res.ok) {
        showToast(t("error"), "error");
        return;
      }
      showToast(t("success"), "success");
      // Keep the pin (likely adding more nearby), clear the rest.
      setName("");
      setDescription("");
      setSurface("");
      setFeatures({});
    });
  }

  const canSubmit = location !== null && name.trim().length > 0 && !pending;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-base-content/70">{t("intro")}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleGeocode();
            }
          }}
          placeholder={t("addressPlaceholder")}
          aria-label={t("addressLabel")}
          className="input input-bordered input-sm flex-1"
        />
        <button
          type="button"
          onClick={handleGeocode}
          disabled={geocoding || !address.trim()}
          className="btn btn-sm gap-1"
        >
          {geocoding ? (
            <span className="loading loading-spinner loading-xs" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          {t("geocode")}
        </button>
      </div>

      <div className="h-[40dvh] min-h-64">
        <LocationPickerClient value={location} onChange={setLocation} />
      </div>

      {location !== null && nearby.length > 0 && (
        <div role="alert" className="alert alert-warning items-start gap-2 text-sm">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t("nearbyWarning")}</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {nearby.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Link href={`/playground/${p.id}`} className="link" target="_blank">
                    {p.name}
                  </Link>{" "}
                  · {t("nearbyDistance", { distance: p.distance_m })}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <label className="form-control">
        <span className="label-text mb-1">{tFields("name")}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tFields("namePlaceholder")}
          className="input input-bordered input-sm w-full"
        />
      </label>

      <label className="form-control">
        <span className="label-text mb-1">{tFields("description")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={tFields("descriptionPlaceholder")}
          className="textarea textarea-bordered textarea-sm w-full"
        />
      </label>

      <fieldset>
        <legend className="label-text mb-2">{tFields("surface")}</legend>
        <div className="flex flex-wrap gap-2">
          {SURFACE_TYPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSurface(s === surface ? "" : s)}
              className={`btn btn-xs ${surface === s ? "btn-primary" : "btn-outline"}`}
            >
              {tFields(`surfaceOptions.${s}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label-text mb-2">{tFields("features")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {PLAYGROUND_FEATURE_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={!!features[key]}
                onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                className="checkbox checkbox-primary checkbox-sm"
              />
              <span className="text-sm">{tFields(`featureOptions.${key}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="btn btn-primary self-start gap-2"
      >
        {pending && <span className="loading loading-spinner loading-sm" aria-hidden />}
        {t("submit")}
      </button>
    </div>
  );
}
