import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GridBriefApp } from "@/app/page";
import { isLocale, locales } from "@/i18n/locale";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return locale === "en"
    ? {
        title: "GridBrief TR — Türkiye electricity market operations",
        description:
          "An agent-ready market, asset and planning workspace built on EPİAŞ Transparency 2.0 data.",
      }
    : {
        title: "GridBrief TR — Türkiye enerji piyasası operasyon merkezi",
        description:
          "EPİAŞ Şeffaflık 2.0 verileriyle çalışan organizasyon, santral, planlama ve piyasa risk çalışma alanı.",
      };
}

export default async function LocalizedHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <GridBriefApp locale={locale} />;
}
