import Image from "next/image";
import { useTranslations } from "next-intl";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority
      aria-hidden
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

// Just the animated wordmark — no logo, no slogan. For logo-less hero placements.
export function Wordmark({
  className = "text-4xl",
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  const t = useTranslations("app");
  const name = t("name");
  const match = name.match(/^(.*?)([?!.…]+)$/);
  const body = match?.[1] ?? name;
  const punct = match?.[2] ?? "";
  return (
    <span className={`font-display leading-none text-primary-content ${className}`}>
      {body}
      {punct && (
        <span className={`brand-punct text-primary ${animate ? "brand-punct--wiggle" : ""}`}>
          {punct}
        </span>
      )}
    </span>
  );
}

export function BrandStack({
  size = 56,
  align = "start",
  nameSize = "text-3xl",
  animatePunct = false,
}: {
  size?: number;
  align?: "start" | "center";
  nameSize?: "text-2xl" | "text-3xl" | "text-4xl" | "text-5xl";
  /** Wiggle the trailing "?" — reserve for hero placements, not the always-on nav. */
  animatePunct?: boolean;
}) {
  const t = useTranslations("app");
  const name = t("name");
  const match = name.match(/^(.*?)([?!.…]+)$/);
  const body = match?.[1] ?? name;
  const punct = match?.[2] ?? "";

  const isCenter = align === "center";
  return (
    <div className={`flex gap-3 ${isCenter ? "flex-col items-center text-center" : "items-center"}`}>
      <BrandMark size={size} />
      <div className={`flex flex-col ${isCenter ? "items-center" : ""}`}>
        <span className={`font-display whitespace-nowrap ${nameSize} leading-none text-primary-content`}>
          {body}
          {punct && (
            <span className={`brand-punct text-primary ${animatePunct ? "brand-punct--wiggle" : ""}`}>
              {punct}
            </span>
          )}
        </span>
        <span className="mt-1 text-xs text-base-content/60 leading-snug">{t("slogan")}</span>
      </div>
    </div>
  );
}
