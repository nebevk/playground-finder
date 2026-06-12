import { Home, Map, Plus, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: "/" | "/map" | "/add" | "/profile";
  icon: LucideIcon;
  key: "home" | "map" | "add" | "profile";
};

export const navItems: readonly NavItem[] = [
  { href: "/", icon: Home, key: "home" },
  { href: "/map", icon: Map, key: "map" },
  { href: "/add", icon: Plus, key: "add" },
  { href: "/profile", icon: User, key: "profile" },
];

// Home owns only "/". Map owns the map and playground detail pages (browsing a
// playground is part of the map flow).
export function isNavItemActive(href: NavItem["href"], pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/map") return pathname === "/map" || pathname.startsWith("/playground");
  return pathname === href || pathname.startsWith(`${href}/`);
}
