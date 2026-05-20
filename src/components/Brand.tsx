import { useTranslations } from "next-intl";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-2xl bg-primary text-primary-content shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 512 512" className="h-3/5 w-3/5" fill="currentColor" aria-hidden>
        <g>
          <rect x="100" y="140" width="22" height="260" rx="11" />
          <rect x="200" y="140" width="22" height="260" rx="11" />
          <rect x="100" y="190" width="122" height="14" rx="7" />
          <rect x="100" y="240" width="122" height="14" rx="7" />
          <rect x="100" y="290" width="122" height="14" rx="7" />
          <rect x="100" y="340" width="122" height="14" rx="7" />
          <path d="M222 150 Q420 210 380 400" stroke="currentColor" strokeWidth={28} strokeLinecap="round" fill="none" />
          <circle cx="380" cy="408" r="20" />
        </g>
      </svg>
    </span>
  );
}

export function BrandStack({
  size = 56,
  align = "start",
  nameSize = "text-3xl",
}: {
  size?: number;
  align?: "start" | "center";
  nameSize?: "text-2xl" | "text-3xl" | "text-4xl" | "text-5xl";
}) {
  const t = useTranslations("app");
  return (
    <div className={`flex items-center gap-3 ${align === "center" ? "flex-col text-center" : ""}`}>
      <BrandMark size={size} />
      <div className="flex flex-col">
        <span className={`font-display ${nameSize} leading-none text-primary-content`}>
          {t("name")}
        </span>
        <span className="mt-1 text-xs text-base-content/60 leading-snug">{t("slogan")}</span>
      </div>
    </div>
  );
}
