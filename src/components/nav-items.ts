import { Map, Plus, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: "/" | "/add" | "/profile";
  icon: LucideIcon;
  key: "map" | "add" | "profile";
};

// Search is intentionally omitted for now — the route is unbuilt, so a Search tab
// would be a dead-end. Discovery happens through the map + filters. Re-add here when
// a real search experience exists.
export const navItems: readonly NavItem[] = [
  { href: "/", icon: Map, key: "map" },
  { href: "/add", icon: Plus, key: "add" },
  { href: "/profile", icon: User, key: "profile" },
];

// Locale-stripped pathname (usePathname from next-intl already strips the locale).
// Map "owns" the map index plus playground detail pages so the nav stays anchored
// while a user is browsing a specific playground.
export function isNavItemActive(href: NavItem["href"], pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/playground");
  return pathname === href || pathname.startsWith(`${href}/`);
}
