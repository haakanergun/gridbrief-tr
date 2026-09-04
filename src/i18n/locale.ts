export const locales = ["tr", "en"] as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localeCode(locale: Locale): string {
  return locale === "en" ? "en-US" : "tr-TR";
}

export function localePath(locale: Locale): string {
  return `/${locale}`;
}
