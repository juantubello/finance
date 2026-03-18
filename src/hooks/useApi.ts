import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { GastoCreateRequest } from "@/types/api";

export function useGastos(year: number, month: number) {
  return useQuery({
    queryKey: ["gastos", year, month],
    queryFn: () => api.getGastos(year, month),
  });
}

export function useGastosByCategories(year: number, month: number) {
  return useQuery({
    queryKey: ["gastosByCategories", year, month],
    queryFn: () => api.getGastosByCategories(year, month),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: api.getCurrencies,
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
