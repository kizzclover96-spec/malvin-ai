/* ============================================================================
   currency — the small set of currencies a B-Vin business can take, plus
   the one formatPrice() helper every price display should go through.
   Previously every price in the app was hardcoded to "€X.XX"; this is the
   single place that changes now that a business picks its own currency
   (profile.currency, defaulting to "EUR" for every business that predates
   this feature and never set one).
============================================================================ */

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc (CHF)" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona (kr)" },
  { code: "NOK", symbol: "kr", label: "Norwegian Krone (kr)" },
  { code: "DKK", symbol: "kr", label: "Danish Krone (kr)" },
  { code: "PLN", symbol: "zł", label: "Polish Złoty (zł)" },
  { code: "CZK", symbol: "Kč", label: "Czech Koruna (Kč)" },
  { code: "TRY", symbol: "₺", label: "Turkish Lira (₺)" },
  { code: "AED", symbol: "AED", label: "UAE Dirham (AED)" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar (CA$)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (A$)" },
];

export const DEFAULT_CURRENCY = "EUR";

const SYMBOL_BY_CODE: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
);

/** "9.5" + "USD" -> "$9.50". Falls back to the raw code as a prefix for any currency not in the list above. */
export function formatPrice(amount: number, currencyCode?: string): string {
  const code = currencyCode || DEFAULT_CURRENCY;
  const symbol = SYMBOL_BY_CODE[code] || `${code} `;
  const value = (Number.isFinite(amount) ? amount : 0).toFixed(2);
  // Multi-character symbols (CHF, kr, zł, Kč, AED, CA$, A$) read better with
  // a space before the number; single-glyph symbols (€ $ £ ₺) sit flush.
  const spaced = symbol.length > 1;
  return spaced ? `${symbol} ${value}` : `${symbol}${value}`;
}
