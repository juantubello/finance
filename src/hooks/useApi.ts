import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { GastoCreateRequest, GastosByCategoryResponse, CategoryCreateRequest } from "@/types/api";

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
