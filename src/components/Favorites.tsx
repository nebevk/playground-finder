"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { setFavoriteAction } from "@/app/[locale]/playground/[id]/actions";
import { useToast } from "@/components/Toast/ToastProvider";

type FavoritesValue = {
  signedIn: boolean;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

// Favourites (FR-PG-04) for everything inside: which playgrounds the visitor saved, and saving or
// removing one. The heart changes at once; if saving fails it changes back and says so.
export function FavoritesProvider({
  signedIn,
  initial,
  children,
}: {
  signedIn: boolean;
  initial: readonly string[];
  children: ReactNode;
}) {
  const t = useTranslations("favorites");
  const { showToast } = useToast();
  const [ids, setIds] = useState(() => new Set(initial));

  const set = useCallback((id: string, on: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const on = !ids.has(id);
      set(id, on);
      setFavoriteAction(id, on)
        .then((res) => res.ok || Promise.reject(new Error("not saved")))
        .catch(() => {
          set(id, !on);
          showToast(t("error"), "error");
        });
    },
    [ids, set, showToast, t],
  );

  const value = useMemo(() => ({ signedIn, isFavorite: (id: string) => ids.has(id), toggle }), [signedIn, ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// The heart: saves or removes a favourite; for visitors, a link to sign in first.
export function FavoriteButton({ playgroundId }: { playgroundId: string }) {
  const t = useTranslations("favorites");
  const locale = useLocale();
  const pathname = usePathname();
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("FavoriteButton must be used inside <FavoritesProvider>");

  if (!ctx.signedIn) {
    return (
      <Link
        href={{ pathname: "/login", query: { next: `/${locale}${pathname}` } }}
        aria-label={t("signIn")}
        className="btn btn-ghost btn-circle shrink-0"
      >
        <Heart className="size-5" aria-hidden />
      </Link>
    );
  }
  const on = ctx.isFavorite(playgroundId);
  return (
    <button
      type="button"
      onClick={() => ctx.toggle(playgroundId)}
      aria-label={t("label")}
      aria-pressed={on}
      className="btn btn-ghost btn-circle shrink-0"
    >
      <Heart className={`size-5 ${on ? "fill-current text-error" : ""}`} aria-hidden />
    </button>
  );
}
