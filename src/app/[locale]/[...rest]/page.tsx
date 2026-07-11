import { notFound } from "next/navigation";

// Catch-all for unknown paths within a locale, so users get the localized
// not-found page instead of the framework default.
export default function CatchAllPage() {
  notFound();
}
