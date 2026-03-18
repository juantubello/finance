import type {
  GastoResponse,
  GastosByCategoryResponse,
  GastosByCategoryRangeResponse,
  CategoryResponse,
  CurrencyResponse,
  GastoCreateRequest,
  CategoryCreateRequest,
} from "@/types/api";

// En dev: Vite proxea /api → backend HTTP (evita Mixed Content con HTTPS)
// En prod: configurar Nginx para hacer el mismo proxy
const BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Normalize a raw category object regardless of field naming convention */
function normalizeCategory(c: any): CategoryResponse {
  const id = c.id ?? c.categoryId ?? c.category_id ?? null;
  return {
    id,
    name: c.name || c.category || c.categoryName || c.label || `Cat ${id}`,
    description: c.description || c.categoryDescription || null,
    icon: c.icon || c.categoryIcon || c.emoji || c.image || null,
  };
}

/** Normalize a raw currency object regardless of field naming convention */
function normalizeCurrency(c: any): CurrencyResponse {
  return {
    id: c.id,
    // Accept: name | currency | currencyName | label | code
    name: c.name || c.currency || c.currencyName || c.label || c.code || `Currency ${c.id}`,
    // Accept: symbol | currencySymbol | sign | code
    symbol: c.symbol || c.currencySymbol || c.sign || c.code || "?",
  };
}

export const api = {
  getGastos: (year: number, month: number) =>
    request<GastoResponse[]>(`/gastos?year=${year}&month=${month}`),

  getGasto: (id: number) =>
    request<GastoResponse>(`/gastos/${id}`),

  getGastosByCategories: async (year: number, month: number): Promise<GastosByCategoryResponse[]> => {
    const raw = await request<any[]>(`/gastosByCategories?year=${year}&month=${month}`);
    console.log("[API /gastosByCategories raw]:", raw);
    return raw.map((c: any) => ({
      // categoryId: accept categoryId | id | category_id
      categoryId: c.categoryId ?? c.id ?? c.category_id ?? null,
      categoryName: c.categoryName || c.name || c.category || `Cat ${c.categoryId ?? c.id}`,
      categoryDescription: c.categoryDescription || c.description || null,
      categoryIcon: c.categoryIcon || c.icon || c.emoji || null,
      amount: c.amount ?? 0,
      currencyId: c.currencyId ?? c.currency_id ?? null,
      currency: c.currency || c.currencyName || c.name || "",
      currencySymbol: c.currencySymbol || c.symbol || "",
    }));
  },

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

  getCategories: async (): Promise<CategoryResponse[]> => {
    const raw = await request<any[]>("/categories");
    console.log("[API /categories raw]:", raw);
    return raw.map(normalizeCategory);
  },

  getCurrencies: async (): Promise<CurrencyResponse[]> => {
    const raw = await request<any[]>("/currencies");
    console.log("[API /currencies raw]:", raw);
    return raw.map(normalizeCurrency);
  },

  createCategory: (data: CategoryCreateRequest) =>
    request<CategoryResponse>("/categories", { method: "POST", body: JSON.stringify(data) }),

  updateCategory: (id: number, data: CategoryCreateRequest) =>
    request<CategoryResponse>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteCategory: (id: number) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),
};
