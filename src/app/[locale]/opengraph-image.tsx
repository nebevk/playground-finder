import { ImageResponse } from "next/og";
import { BRAND, MARK_RATIO, OG_SIZE, ogFonts, ogMark, ogTranslator, Wordmark } from "@/lib/og";

// The link preview for every page that has no card of its own: the swing on the brand purple,
// the name and the slogan, in the visitor's language.
export async function generateImageMetadata({ params }: { params: { locale: string } }) {
  const t = ogTranslator(params.locale);
  return [{ id: "site", alt: `${t("app.name")} ${t("app.slogan")}`, size: OG_SIZE, contentType: "image/png" }];
}

export default async function SiteImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = ogTranslator(locale);
  const [fonts, mark] = await Promise.all([ogFonts(), ogMark("on-purple")]);
  const markWidth = 300;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 72px",
          backgroundColor: BRAND.purple,
          backgroundImage: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purple} 55%, ${BRAND.magenta} 100%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={markWidth} height={Math.round(markWidth * MARK_RATIO)} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>
          <Wordmark name={t("app.name")} size={108} from="#ffffff" to={BRAND.pink} />
          <div style={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 40, lineHeight: 1.25, color: "rgba(255,255,255,0.92)" }}>
            {t("app.slogan")}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
