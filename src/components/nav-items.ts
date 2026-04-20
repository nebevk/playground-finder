import { Map, Search, Plus, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: "/" | "/search" | "/add" | "/profile";
  icon: LucideIcon;
  key: "map" | "search" | "add" | "profile";
};

export const navItems: readonly NavItem[] = [
  { href: "/", icon: Map, key: "map" },
  { href: "/search", icon: Search, key: "search" },
  { href: "/add", icon: Plus, key: "add" },
  { href: "/profile", icon: User, key: "profile" },
];
