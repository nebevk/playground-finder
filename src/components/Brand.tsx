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
          {punct && <span className="brand-punct text-primary">{punct}</span>}
        </span>
        <span className="mt-1 text-xs text-base-content/60 leading-snug">{t("slogan")}</span>
      </div>
    </div>
  );
}
