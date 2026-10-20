// A rating with one decimal in the visitor's notation: "4,6" in Slovenian, "4.6" in English.
export function formatRating(avg: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(avg);
}
