import type { ForexRates } from "@/hooks/useForexRates";

const ARS_SYMBOLS = ["$", "ARS", "AR$", "P$"];
const USD_SYMBOLS = ["USD", "U$S", "US$"];

export function isARS(symbol: string) {
  return ARS_SYMBOLS.includes(symbol);
}

export function isUSD(symbol: string) {
  return USD_SYMBOLS.includes(symbol);
}

export function isExotic(symbol: string) {
  return !isARS(symbol) && !isUSD(symbol);
}

/**
 * Convert amount in any currency to ARS.
 * Chain: EXOTIC → USD (via forex) → ARS (via dolarBlue)
 * Returns null if rates are not available yet.
 * @param currencyCode - ISO 3-letter code (e.g. "EUR") for forex lookup. Falls back to currencySymbol.
 */
export function toARS(
  amount: number,
  currencySymbol: string,
  forexRates: ForexRates | undefined,
  dolarBlue: number | undefined,
  currencyCode?: string,
): number | null {
  if (isARS(currencySymbol)) return amount;
  if (!dolarBlue) return null;
  if (isUSD(currencySymbol)) return amount * dolarBlue;

  // Exotic: use forex rates (base = USD, rates[code] = units of currency per 1 USD)
  if (!forexRates) return null;
  const lookupKey = (currencyCode ?? currencySymbol).toUpperCase();
  const rate = forexRates[lookupKey];
  if (!rate) return null;
  const inUSD = amount / rate;
  return inUSD * dolarBlue;
}

/**
 * Convert amount in any currency to USD.
 * @param currencyCode - ISO 3-letter code (e.g. "EUR") for forex lookup. Falls back to currencySymbol.
 */
export function toUSD(
  amount: number,
  currencySymbol: string,
  forexRates: ForexRates | undefined,
  dolarBlue: number | undefined,
  currencyCode?: string,
): number | null {
  if (isUSD(currencySymbol)) return amount;
  if (isARS(currencySymbol)) {
    if (!dolarBlue) return null;
    return amount / dolarBlue;
  }
  if (!forexRates) return null;
  const lookupKey = (currencyCode ?? currencySymbol).toUpperCase();
  const rate = forexRates[lookupKey];
  if (!rate) return null;
  return amount / rate;
}
