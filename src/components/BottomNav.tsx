"use client";

import { useRef } from "react";
import { Coffee, Ellipsis, FileText, Info, Shield, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PendingIcon } from "@/components/LinkPending";
import { navItems, isNavItemActive } from "./nav-items";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { KOFI_URL } from "@/lib/links";

const MORE_PAGES = [
  { href: "/about", icon: Info, key: "about" },
  { href: "/privacy", icon: Shield, key: "privacy" },
  { href: "/terms", icon: FileText, key: "terms" },
] as const;

// Mobile navigation. The fifth tab ("Več") opens a bottom sheet with the pages that have no
// tab of their own, so Privacy and Terms are always one tap away (GDPR-10), plus language
// and support.
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const moreActive = MORE_PAGES.some((p) => pathname === p.href);
  const close = () => sheet.current?.close();

  return (
    <>
      <nav className="dock dock-md fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map(({ href, icon: Icon, key }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <Link
              key={key}
              href={href}
              className={active ? "dock-active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              <PendingIcon>
                <Icon className="size-5" aria-hidden />
              </PendingIcon>
              <span className="dock-label">{t(key)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => sheet.current?.showModal()}
          aria-haspopup="dialog"
          className={moreActive ? "dock-active" : undefined}
        >
          <Ellipsis className="size-5" aria-hidden />
          <span className="dock-label">{t("more")}</span>
        </button>
      </nav>

      <dialog ref={sheet} className="modal modal-bottom md:hidden" aria-labelledby="more-sheet-title">
        <div className="modal-box pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="more-sheet-title" className="text-lg font-bold">
              {t("more")}
            </h2>
            <button type="button" onClick={close} aria-label={t("close")} className="btn btn-ghost btn-circle">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <ul className="menu menu-lg w-full p-0">
            {MORE_PAGES.map(({ href, icon: Icon, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  onClick={close}
                  aria-current={pathname === href ? "page" : undefined}
                  className="min-h-11 content-center"
                >
                  <Icon className="size-5" aria-hidden />
                  {t(key)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="min-h-11 content-center"
              >
                <Coffee className="size-5 text-secondary" aria-hidden />
                {t("support")}
              </a>
            </li>
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-base-300 pt-4">
            <span className="font-semibold">{t("language")}</span>
            <LocaleSwitcher />
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label={t("close")} tabIndex={-1}>
            {t("close")}
          </button>
        </form>
      </dialog>
    </>
  );
}
