import { useQuery } from "@tanstack/react-query";

export type ForexRates = Record<string, number>;

async function fetchForexRates(): Promise<ForexRates> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!res.ok) throw new Error("Forex fetch failed");
  const data = await res.json();
  return data.rates as ForexRates;
}

export function useForexRates() {
  return useQuery({
    queryKey: ["forex-rates"],
    queryFn: fetchForexRates,
    staleTime: 1000 * 60 * 60, // 1 hora
    retry: 2,
  });
}
