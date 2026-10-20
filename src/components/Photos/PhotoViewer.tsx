"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReportButton } from "@/components/Reviews/ReportButton";

export type ViewerPhoto = { id: string; url: string; alt: string };

/** How much a tap zooms in, relative to the photo's fitted size. */
const ZOOM = 2.5;

const OpenPhotoContext = createContext<(index: number) => void>(() => {});

// The detail page's photo viewer: full screen, one photo at a time. Swipe (or use the arrows and
// the arrow keys) to move between photos; tap a photo, or the zoom button, to see it larger and
// pan around (phones can pinch too); report it from here when signed in. One viewer per page:
// PhotoButton opens it at a given photo. Reporting lives here rather than on every thumbnail.
export function PhotoViewer({
  photos,
  playgroundId,
  locale,
  canReport,
  children,
}: {
  photos: ViewerPhoto[];
  playgroundId: string;
  locale: string;
  canReport: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("detail");
  const tCommon = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  // The zoomed photo's width in px, and where it was tapped (0–1), or null when not zoomed.
  const [zoom, setZoom] = useState<{ width: number; x: number; y: number } | null>(null);

  const scrollToPhoto = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior });
  }, []);

  const open = useCallback(
    (i: number) => {
      setIndex(i);
      setZoom(null);
      dialog.current?.showModal();
      // Once the dialog has laid out, jump (not glide) to the tapped photo.
      requestAnimationFrame(() => scrollToPhoto(i, "instant"));
    },
    [scrollToPhoto],
  );

  const go = (delta: number) => {
    setZoom(null);
    scrollToPhoto(Math.min(photos.length - 1, Math.max(0, index + delta)));
  };

  // The position follows the scroll, so swipes, buttons and keys all keep it right.
  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) {
      setIndex(i);
      setZoom(null);
    }
  };

  const zoomIn = (img: HTMLImageElement, x = 0.5, y = 0.5) =>
    setZoom({ width: img.getBoundingClientRect().width * ZOOM, x, y });

  const toggleZoomFromButton = () => {
    if (zoom) return setZoom(null);
    const img = slides.current[index]?.querySelector("img");
    if (img) zoomIn(img);
  };

  // Zoomed in: scroll so the tapped spot sits in the middle of the screen.
  useLayoutEffect(() => {
    const slide = slides.current[index];
    const img = slide?.querySelector("img");
    if (!zoom || !slide || !img) return;
    slide.scrollLeft = zoom.x * img.offsetWidth - slide.clientWidth / 2;
    slide.scrollTop = zoom.y * img.offsetHeight - slide.clientHeight / 2;
  }, [zoom, index]);

  const current = photos[index];

  return (
    <OpenPhotoContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        aria-label={t("photos")}
        onClose={() => setZoom(null)}
        onKeyDown={(e) => {
          // Not from inside the report dialog: its arrow keys move between the reasons.
          if ((e.target as HTMLElement).closest("dialog") !== dialog.current) return;
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        className="photo-viewer m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden border-0 bg-black p-0 text-white backdrop:bg-black"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-1 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
            <p aria-live="polite" className="flex-1 px-3 text-sm font-semibold tabular-nums">
              <span aria-hidden>
                {index + 1} / {photos.length}
              </span>
              <span className="sr-only">{t("photoPosition", { n: index + 1, total: photos.length })}</span>
            </p>
            <button
              type="button"
              onClick={toggleZoomFromButton}
              aria-pressed={zoom !== null}
              aria-label={zoom ? t("zoomOut") : t("zoomIn")}
              className="btn btn-ghost btn-circle text-white hover:bg-white/10"
            >
              {zoom ? <ZoomOut className="size-5" aria-hidden /> : <ZoomIn className="size-5" aria-hidden />}
            </button>
            {canReport && current && (
              <ReportButton
                targetType="photo"
                targetId={current.id}
                playgroundId={playgroundId}
                locale={locale}
                label={t("report")}
                buttonClassName="btn btn-ghost gap-1 text-white hover:bg-white/10"
              />
            )}
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={tCommon("close")}
              className="btn btn-ghost btn-circle text-white hover:bg-white/10"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>

          {/* One full-width slide per photo; zoomed in, the slide scrolls instead of the track. */}
          <div
            ref={track}
            onScroll={onScroll}
            className={`flex min-h-0 flex-1 snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] ${
              zoom ? "overflow-x-hidden" : "overflow-x-auto"
            }`}
          >
            {photos.map((p, i) => {
              const zoomed = zoom !== null && i === index;
              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    slides.current[i] = el;
                  }}
                  // A tap on the black around the photo closes the viewer.
                  onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
                  className={`flex h-full w-full shrink-0 snap-center items-center-safe justify-center-safe ${
                    zoomed ? "overflow-auto" : "overflow-hidden p-2 md:px-20"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.alt}
                    draggable={false}
                    onClick={(e) => {
                      if (zoomed) return setZoom(null);
                      const rect = e.currentTarget.getBoundingClientRect();
                      zoomIn(e.currentTarget, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
                    }}
                    style={zoomed ? { width: zoom.width, maxWidth: "none", maxHeight: "none", height: "auto" } : undefined}
                    className={`select-none ${zoomed ? "cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {photos.length > 1 && !zoom && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label={t("previousPhoto")}
              className="btn btn-circle absolute top-1/2 left-3 hidden -translate-y-1/2 border-0 bg-white/90 text-black md:inline-flex"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === photos.length - 1}
              aria-label={t("nextPhoto")}
              className="btn btn-circle absolute top-1/2 right-3 hidden -translate-y-1/2 border-0 bg-white/90 text-black md:inline-flex"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        )}
      </dialog>
    </OpenPhotoContext.Provider>
  );
}

// A photo on the page that opens the viewer at its position.
export function PhotoButton({
  index,
  label,
  className,
  children,
}: {
  index: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const open = useContext(OpenPhotoContext);
  return (
    <button type="button" onClick={() => open(index)} aria-label={label} className={className}>
      {children}
    </button>
  );
}
