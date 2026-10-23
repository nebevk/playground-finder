import { ImageResponse } from "next/og";
import { formatRating } from "@/lib/format";
import { unpackPlayground } from "@/lib/map-snapshot";
import { BRAND, MARK_RATIO, OG_SIZE, ogFonts, ogMark, ogTranslator, Wordmark } from "@/lib/og";
import { EQUIPMENT_KEYS, getMapSnapshot, PLAYGROUND_FEATURE_KEYS } from "@/lib/playgrounds";

// A playground's link preview: its name, rating, features and play equipment beside the swing.
// Never its photos: link previews copy images onto other platforms' servers, out of reach of
// moderation and deletion (GDPR-16). Read from the public map snapshot: cached, and exactly what
// any visitor may see.
async function findPlayground(id: string) {
  const row = (await getMapSnapshot()).find((r) => r[0] === id);
  return row ? unpackPlayground(row) : null;
}

export async function generateImageMetadata({ params }: { params: { locale: string; id: string } }) {
  const t = ogTranslator(params.locale);
  const playground = await findPlayground(params.id);
  const alt = playground ? `${playground.name} · ${t("app.name")}` : t("app.name");
  return [{ id: "card", alt, size: OG_SIZE, contentType: "image/png" }];
}

const MAX_CHIPS = 6;

export default async function PlaygroundImage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = ogTranslator(locale);
  const [playground, fonts, mark] = await Promise.all([findPlayground(id), ogFonts(), ogMark("light")]);

  const name = playground?.name ?? t("app.name");
  const chips = playground
    ? [
        ...PLAYGROUND_FEATURE_KEYS.filter((k) => playground[k]).map((k) => t(`detail.feature.${k}`)),
        ...EQUIPMENT_KEYS.filter((k) => playground.equipment.includes(k)).map((k) => t(`detail.equipmentOptions.${k}`)),
      ].slice(0, MAX_CHIPS)
    : [];
  const rated = playground && playground.review_count > 0 && playground.avg_rating != null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          padding: "56px 64px",
          backgroundColor: BRAND.background,
          borderBottom: `14px solid ${BRAND.purple}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", maxWidth: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} width={72} height={Math.round(72 * MARK_RATIO)} alt="" />
            <Wordmark name={t("app.name")} size={48} from={BRAND.purple} to={BRAND.magenta} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                fontFamily: "Nunito",
                fontWeight: 800,
                fontSize: name.length > 34 ? 60 : 76,
                lineHeight: 1.1,
                color: BRAND.ink,
                lineClamp: 2,
                display: "block",
              }}
            >
              {name}
            </div>
            {playground && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Nunito", fontWeight: 700, fontSize: 36, color: BRAND.muted }}>
                <svg width="40" height="40" viewBox="0 0 24 24">
                  <path
                    d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
                    fill={rated ? BRAND.star : "none"}
                    stroke={rated ? BRAND.starEdge : BRAND.muted}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                {rated ? (
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: BRAND.ink, fontWeight: 800 }}>{formatRating(playground.avg_rating!, locale)}</span>
                    <span>{t("detail.reviewsCount", { count: playground.review_count })}</span>
                  </div>
                ) : (
                  <span>{t("detail.noRatingsYet")}</span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, minHeight: 56 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  padding: "8px 22px",
                  borderRadius: 999,
                  backgroundColor: BRAND.lavender,
                  color: "#5d2fa3",
                  fontFamily: "Nunito",
                  fontWeight: 700,
                  fontSize: 28,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={300} height={Math.round(300 * MARK_RATIO)} alt="" />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
