import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { GastoCreateRequest, GastosByCategoryResponse, CategoryCreateRequest, IngresoCreateRequest, SavingCreateRequest, CedearSPY, CardStatementSaveRequest, CardCategoryDto } from "@/types/api";

export function useGastos(year: number, month: number) {
  return useQuery({
    queryKey: ["gastos", year, month],
    queryFn: () => api.getGastos(year, month),
  });
}

export function useGastosForYear(year: number) {
  const results = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => ({
      queryKey: ["gastos", year, i + 1],
      queryFn: () => api.getGastos(year, i + 1),
      enabled: year > 0,
    })),
  });
  const isLoading = year > 0 && results.some((r) => r.isLoading);
  const data = isLoading ? undefined : results.flatMap((r) => r.data ?? []);
  return { data, isLoading };
}

export function useGastosByCategories(year: number, month: number) {
  return useQuery({
    queryKey: ["gastosByCategories", year, month],
    queryFn: () => api.getGastosByCategories(year, month),
  });
}

export function useGastosByCategoriesForYear(year: number) {
  const results = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => ({
      queryKey: ["gastosByCategories", year, i + 1],
      queryFn: () => api.getGastosByCategories(year, i + 1),
      enabled: year > 0,
    })),
  });
  const isLoading = results.some((r) => r.isLoading);
  if (isLoading) return { data: undefined as GastosByCategoryResponse[] | undefined, isLoading: true };

  const allCats = results.flatMap((r) => r.data ?? []);
  const map = new Map<string, GastosByCategoryResponse>();
  for (const cat of allCats) {
    const key = `${cat.categoryId}-${cat.currencyId}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += cat.amount;
    } else {
      map.set(key, { ...cat });
    }
  }
  return { data: Array.from(map.values()), isLoading: false };
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: api.getCurrencies,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GastoCreateRequest) => api.createGasto(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["gastosByCategories"] });
      qc.invalidateQueries({ queryKey: ["available"] });
    },
  });
}

export function useUpdateGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GastoCreateRequest }) => api.updateGasto(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["gastosByCategories"] });
      qc.invalidateQueries({ queryKey: ["available"] });
    },
  });
}

export function useDeleteGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteGasto(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["gastosByCategories"] });
      qc.invalidateQueries({ queryKey: ["available"] });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreateRequest) => api.createCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryCreateRequest }) =>
      api.updateCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useLabels() {
  return useQuery({ queryKey: ["labels"], queryFn: api.getLabels, staleTime: 60 * 1000 });
}

export function useCategoryRules() {
  return useQuery({ queryKey: ["categoryRules"], queryFn: api.getCategoryRules, staleTime: 60 * 1000 });
}

export function useCreateCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { keyword: string; categoryId: number }) => api.createCategoryRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categoryRules"] }),
  });
}

export function useUpdateCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { keyword: string; categoryId: number } }) => api.updateCategoryRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categoryRules"] }),
  });
}

export function useDeleteCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCategoryRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categoryRules"] }),
  });
}

// ── Ingresos ──────────────────────────────────────────────────────────────────

export function useIngresos(year: number, month: number) {
  return useQuery({
    queryKey: ["ingresos", year, month],
    queryFn: () => api.getIngresos(year, month),
    enabled: year > 0 && month > 0,
  });
}

export function useIngresosForYear(year: number) {
  const results = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => ({
      queryKey: ["ingresos", year, i + 1],
      queryFn: () => api.getIngresos(year, i + 1),
      enabled: year > 0,
    })),
  });
  const isLoading = year > 0 && results.some(r => r.isLoading);
  const data = isLoading ? undefined : results.flatMap(r => r.data ?? []);
  return { data, isLoading };
}

export function useCreateIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IngresoCreateRequest) => api.createIngreso(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["available"] });
    },
  });
}

export function useUpdateIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: IngresoCreateRequest }) => api.updateIngreso(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["available"] });
    },
  });
}

export function useDeleteIngreso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteIngreso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["available"] });
    },
  });
}

export function useIncomeCategories() {
  return useQuery({
    queryKey: ["incomeCategories"],
    queryFn: api.getIncomeCategories,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Ahorros ───────────────────────────────────────────────────────────────────

export function useSavingAssets() {
  return useQuery({
    queryKey: ["savingAssets"],
    queryFn: api.getSavingAssets,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSavingBalance() {
  return useQuery({
    queryKey: ["savingBalance"],
    queryFn: api.getSavingBalance,
  });
}

export function useSavings(activoId?: number) {
  return useQuery({
    queryKey: ["savings", activoId],
    queryFn: () => api.getSavings(activoId),
  });
}

export function useCreateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SavingCreateRequest) => api.createSaving(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["savingBalance"] });
    },
  });
}

export function useUpdateSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SavingCreateRequest }) => api.updateSaving(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["savingBalance"] });
    },
  });
}

export function useDeleteSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSaving(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings"] });
      qc.invalidateQueries({ queryKey: ["savingBalance"] });
    },
  });
}

export function useAvailable() {
  return useQuery({
    queryKey: ["available"],
    queryFn: api.getAvailable,
    staleTime: 60 * 1000,
  });
}

const TICKER_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  SOL: "solana",
  ADA: "cardano",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
};

export function useCryptoPrices(tickers: string[]) {
  const ids = [...new Set(
    tickers.map(t => TICKER_TO_COINGECKO_ID[t.toUpperCase()]).filter(Boolean)
  )];
  return useQuery<Record<string, { usd: number }>>({
    queryKey: ["cryptoPrices", ids.join(",")],
    queryFn: async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`
      );
      return res.json();
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function tickerToCoingeckoId(ticker: string): string | undefined {
  return TICKER_TO_COINGECKO_ID[ticker.toUpperCase()];
}

export function useCedearSPY() {
  return useQuery<CedearSPY>({
    queryKey: ["cedearSPY"],
    queryFn: api.getCedearSPY,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useDolarBlue() {
  return useQuery<{ compra: number; venta: number }>({
    queryKey: ["dolarBlue"],
    queryFn: async () => {
      const res = await fetch("https://dolarapi.com/v1/dolares/blue");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUSDCARS() {
  return useQuery<{ compra: number; venta: number } | null>({
    queryKey: ["usdcARS"],
    queryFn: async () => {
      const res = await fetch("https://criptoya.com/api/usdc/ars/1");
      const data = await res.json();
      // Pick dolarapp (ARQ) > arq > binance > letsbit > first available
      const exchange = data.dolarapp ?? data.arq ?? data.binance ?? data.letsbit ?? data.ripio ?? Object.values(data)[0];
      if (!exchange) return null;
      return { compra: exchange.totalBid, venta: exchange.totalAsk };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ── Tarjetas ───────────────────────────────────────────────────────────────────

export function useCardStatement(cardType: "VISA" | "MASTERCARD", year: number, month: number) {
  return useQuery({
    queryKey: ["cardStatement", cardType, year, month],
    queryFn: () => api.getCardStatement(cardType, year, month),
    enabled: year > 0 && month > 0,
  });
}

export function useCardExpenses(statementId: number | undefined) {
  return useQuery({
    queryKey: ["cardExpenses", statementId],
    queryFn: () => api.getCardExpenses(statementId!),
    enabled: statementId != null,
  });
}

export function useSaveStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, pdfFile }: { data: CardStatementSaveRequest; pdfFile: File }) =>
      api.saveStatement(data, pdfFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardStatement"] });
      qc.invalidateQueries({ queryKey: ["cardExpenses"] });
    },
  });
}

export function useDeleteStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteStatement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cardStatement"] });
      qc.invalidateQueries({ queryKey: ["cardExpenses"] });
    },
  });
}

export function useCards() {
  return useQuery({ queryKey: ["cards"], queryFn: api.getCards, staleTime: 5 * 60 * 1000 });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; bank: string; type: string }) => api.createCard(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; bank: string; type: string } }) => api.updateCard(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  });
}

export function useCardCategories() {
  return useQuery({ queryKey: ["cardCategories"], queryFn: api.getCardCategories, staleTime: 5 * 60 * 1000 });
}

export function useCreateCardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CardCategoryDto, "id">) => api.createCardCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardCategories"] }),
  });
}

export function useUpdateCardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<CardCategoryDto, "id"> }) => api.updateCardCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardCategories"] }),
  });
}

export function useDeleteCardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCardCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardCategories"] }),
  });
}

export function useCardCategoryRules() {
  return useQuery({ queryKey: ["cardCategoryRules"], queryFn: api.getCardCategoryRules, staleTime: 60 * 1000 });
}

export function useCreateCardCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { keyword: string; categoryId: number; priority: number }) => api.createCardCategoryRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardCategoryRules"] }),
  });
}

export function useUpdateCardCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { keyword: string; categoryId: number; priority: number } }) => api.updateCardCategoryRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardCategoryRules"] }),
  });
}

export function useDeleteCardCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCardCategoryRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardCategoryRules"] }),
  });
}

export function useLogoRules() {
  return useQuery({ queryKey: ["logoRules"], queryFn: api.getLogoRules, staleTime: 60 * 1000 });
}

export function useCreateLogoRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { keyword: string; logoUrl: string; priority: number }) => api.createLogoRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logoRules"] }),
  });
}

export function useUpdateLogoRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { keyword: string; logoUrl: string; priority: number } }) => api.updateLogoRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logoRules"] }),
  });
}

export function useDeleteLogoRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteLogoRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logoRules"] }),
  });
}
