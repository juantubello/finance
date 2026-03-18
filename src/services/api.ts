import type {
  GastoResponse,
  GastosByCategoryResponse,
  GastosByCategoryRangeResponse,
  CategoryResponse,
  CurrencyResponse,
  GastoCreateRequest,
} from "@/types/api";

const BASE = "http://localhost:6097";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getGastos: (year: number, month: number) =>
    request<GastoResponse[]>(`/gastos?year=${year}&month=${month}`),

  getGasto: (id: number) =>
    request<GastoResponse>(`/gastos/${id}`),

  getGastosByCategories: (year: number, month: number) =>
    request<GastosByCategoryResponse[]>(`/gastosByCategories?year=${year}&month=${month}`),

  getGastosByCategoryRange: (yf: number, mf: number, yt: number, mt: number) =>
    request<GastosByCategoryRangeResponse>(
      `/gastos/categorias/rango?yearFrom=${yf}&monthFrom=${mf}&yearTo=${yt}&monthTo=${mt}`
    ),

  createGasto: (data: GastoCreateRequest) =>
    request<GastoResponse>("/gastos", { method: "POST", body: JSON.stringify(data) }),

  updateGasto: (id: number, data: GastoCreateRequest) =>
    request<GastoResponse>(`/gastos/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteGasto: (id: number) =>
    request<void>(`/gastos/${id}`, { method: "DELETE" }),

  getCategories: () => request<CategoryResponse[]>("/categories"),

  getCurrencies: () => request<CurrencyResponse[]>("/currencies"),
};
