"use client";

import { Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems, isNavItemActive } from "./nav-items";
import { BrandStack } from "./Brand";
import { KOFI_URL } from "@/lib/links";

export function SideNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-base-300 md:bg-base-100">
      <div className="px-4 py-6">
        <Link href="/" className="block">
          <BrandStack size={140} align="center" nameSize="text-3xl" />
        </Link>
      </div>
      <ul className="menu menu-lg w-full gap-1 px-3">
        {navItems.map(({ href, icon: Icon, key }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <li key={key}>
              <Link
                href={href}
                className={active ? "menu-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden />
                {t(`nav.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-3 p-3">
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary w-full gap-2"
        >
          <Coffee className="size-5" aria-hidden />
          {t("nav.support")}
        </a>
        <div className="flex items-center justify-center gap-3 text-xs text-base-content/60">
          <Link href="/about" className="link link-hover">
            {t("nav.about")}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="link link-hover">
            {t("nav.privacy")}
          </Link>
        </div>
        <p className="text-center text-xs text-base-content/50">{t("nav.copyright")}</p>
      </div>
    </aside>
  );
}
