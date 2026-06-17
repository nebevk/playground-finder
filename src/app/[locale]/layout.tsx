import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Geist_Mono, Nunito, Chewy } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Analytics } from "@vercel/analytics/next";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { CookieBanner } from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import "../globals.css";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const chewy = Chewy({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

// viewportFit: "cover" lets `env(safe-area-inset-*)` resolve to real values on
// notch / home-indicator devices, so the fixed bottom dock can pad itself clear of
// the iOS home bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
    <html
      lang={locale}
      data-theme="retro"
      className={`${nunito.variable} ${geistMono.variable} ${chewy.variable}`}
    >
      <body className="min-h-dvh antialiased bg-base-100 text-base-content">
        <NextIntlClientProvider>
          <ToastProvider>
            <div className="flex min-h-dvh md:flex-row">
              <SideNav />
              <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-none">
                <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                  {children}
                </main>
                <BottomNav />
              </div>
            </div>
            <CookieBanner />
          </ToastProvider>
        </NextIntlClientProvider>
        <Analytics />
        {/* Simple Analytics — privacy-first, cookieless visitor stats. */}
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
