"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems, isNavItemActive } from "./nav-items";
import { BrandStack } from "./Brand";

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
    </aside>
  );
}
