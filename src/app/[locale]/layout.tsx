import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Butterfly_Kids } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Analytics } from "@vercel/analytics/next";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { CookieBanner } from "@/components/CookieBanner";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const butterflyKids = Butterfly_Kids({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: t("name") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} ${butterflyKids.variable}`}>
      <body className="min-h-dvh antialiased bg-base-100 text-base-content">
        <NextIntlClientProvider>
          <div className="flex min-h-dvh md:flex-row">
            <SideNav />
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-none">
              <main className="flex-1 pb-20 md:pb-0">{children}</main>
              <BottomNav />
            </div>
          </div>
          <CookieBanner />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
