"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems } from "./nav-items";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="dock dock-md fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-base-300 bg-base-100 md:hidden">
      {navItems.map(({ href, icon: Icon, key }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={active ? "dock-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-5" aria-hidden />
            <span className="dock-label">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
