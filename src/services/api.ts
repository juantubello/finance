import type {
  GastoResponse,
  GastosByCategoryResponse,
  GastosByCategoryRangeResponse,
  CategoryResponse,
  CurrencyResponse,
  GastoCreateRequest,
  CategoryCreateRequest,
  Label,
  CategoryRule,
  LabelRule,
  IngresoResponse,
  IngresoCreateRequest,
  IncomeCategoryResponse,
  SavingAsset,
  SavingBalance,
  SavingMovement,
  SavingCreateRequest,
  AvailableResponse,
  CedearSPY,
  CardStatementParsed,
  CardStatement,
  CardExpense,
  CardStatementSaveRequest,
  CardDto,
  CardCategoryDto,
  CardCategoryRuleDto,
  LogoRuleDto,
  PushSubscriptionDto,
  PushSubscribeRequest,
  PushUpdateRequest,
} from "@/types/api";

// En dev: Vite proxea /api → backend HTTP (evita Mixed Content con HTTPS)
// En prod: configurar Nginx para hacer el mismo proxy
const BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID ?? "",
      "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET ?? "",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  const text = await res.text();
  return text ? JSON.parse(text) : undefined as T;
}

/** Normalize a raw category object regardless of field naming convention */
function normalizeCategory(c: any): CategoryResponse {
  const id = c.id ?? c.categoryId ?? c.category_id ?? null;
  return {
    id,
    name: c.name || c.category || c.categoryName || c.label || `Cat ${id}`,
    description: c.description || c.categoryDescription || null,
    icon: c.icon || c.categoryIcon || c.emoji || c.image || null,
    color: c.color ?? c.categoryColor ?? null,
  };
}

/** Normalize a raw currency object regardless of field naming convention */
function normalizeCurrency(c: any): CurrencyResponse {
  const id = c.id ?? c.currencyId ?? c.currency_id ?? null;
  return {
    id,
    // Accept: name | currency | currencyName | label | code
    name: c.name || c.currency || c.currencyName || c.label || c.code || `Currency ${id}`,
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
      categoryColor: c.categoryColor ?? c.color ?? null,
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
    request<CategoryResponse>("/categories", {
      method: "POST",
      body: JSON.stringify({ categoryName: data.name, categoryDescription: data.description ?? null, categoryIcon: data.icon ?? null, categoryColor: data.color ?? null }),
    }),

  updateCategory: (id: number, data: CategoryCreateRequest) =>
    request<CategoryResponse>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ categoryName: data.name, categoryDescription: data.description ?? null, categoryIcon: data.icon ?? null, categoryColor: data.color ?? null }),
    }),

  deleteCategory: (id: number) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),

  getLabels: (): Promise<Label[]> =>
    request<Label[]>("/labels"),

  createLabel: (data: { name: string }) =>
    request<Label>("/labels", { method: "POST", body: JSON.stringify(data) }),

  updateLabel: (id: number, data: { name: string }) =>
    request<Label>(`/labels/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteLabel: (id: number) =>
    request<void>(`/labels/${id}`, { method: "DELETE" }),

  addGastoLabels: (gastoId: number, labels: string[]) =>
    request<{ gastoId: number; labels: Label[] }>(`/gastos/${gastoId}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels }),
    }),

  removeGastoLabel: (gastoId: number, labelId: number) =>
    request<void>(`/gastos/${gastoId}/labels/${labelId}`, { method: "DELETE" }),

  getCategoryRules: (): Promise<CategoryRule[]> =>
    request<CategoryRule[]>("/category-rules"),

  createCategoryRule: (data: { keyword: string; categoryId: number }) =>
    request<CategoryRule>("/category-rules", { method: "POST", body: JSON.stringify(data) }),

  updateCategoryRule: (id: number, data: { keyword: string; categoryId: number }) =>
    request<CategoryRule>(`/category-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteCategoryRule: (id: number) =>
    request<void>(`/category-rules/${id}`, { method: "DELETE" }),

  getLabelRules: (): Promise<LabelRule[]> =>
    request<LabelRule[]>("/label-rules"),

  createLabelRule: (data: { keyword: string; labelIds: number[] }) =>
    request<LabelRule>("/label-rules", { method: "POST", body: JSON.stringify(data) }),

  updateLabelRule: (id: number, data: { keyword: string; labelIds: number[] }) =>
    request<LabelRule>(`/label-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteLabelRule: (id: number) =>
    request<void>(`/label-rules/${id}`, { method: "DELETE" }),

  applyLabelRules: () =>
    request<{ updated: number }>("/label-rules/apply", { method: "POST" }),

  // ── Ingresos ────────────────────────────────────────────────────────────────

  getIngresos: (year: number, month: number) =>
    request<IngresoResponse[]>(`/ingresos?year=${year}&month=${month}`),

  getIngreso: (id: number) =>
    request<IngresoResponse>(`/ingresos/${id}`),

  createIngreso: (data: IngresoCreateRequest) =>
    request<IngresoResponse>("/ingresos", { method: "POST", body: JSON.stringify(data) }),

  updateIngreso: (id: number, data: IngresoCreateRequest) =>
    request<IngresoResponse>(`/ingresos/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteIngreso: (id: number) =>
    request<void>(`/ingresos/${id}`, { method: "DELETE" }),

  // ── Income Categories ────────────────────────────────────────────────────────

  getIncomeCategories: async (): Promise<IncomeCategoryResponse[]> => {
    const raw = await request<any[]>("/income-categories");
    return raw.map((c: any) => ({
      id: c.id ?? c.categoryId ?? null,
      name: c.name || c.categoryName || `Cat ${c.id}`,
      description: c.description || c.categoryDescription || null,
      icon: c.icon || c.categoryIcon || null,
      color: c.color ?? c.categoryColor ?? null,
    }));
  },

  createIncomeCategory: (data: { name: string; description?: string | null; icon?: string | null; color?: string | null }) =>
    request<IncomeCategoryResponse>("/income-categories", {
      method: "POST",
      body: JSON.stringify({ categoryName: data.name, categoryDescription: data.description ?? null, categoryIcon: data.icon ?? null, categoryColor: data.color ?? null }),
    }),

  updateIncomeCategory: (id: number, data: { name: string; description?: string | null; icon?: string | null; color?: string | null }) =>
    request<IncomeCategoryResponse>(`/income-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ categoryName: data.name, categoryDescription: data.description ?? null, categoryIcon: data.icon ?? null, categoryColor: data.color ?? null }),
    }),

  deleteIncomeCategory: (id: number) =>
    request<void>(`/income-categories/${id}`, { method: "DELETE" }),

  // ── Ahorros ─────────────────────────────────────────────────────────────────

  getSavingAssets: () =>
    request<SavingAsset[]>("/savings/assets"),

  getSavingBalance: () =>
    request<SavingBalance[]>("/savings/balance"),

  getSavings: (activoId?: number) =>
    request<SavingMovement[]>(activoId != null ? `/savings?activoId=${activoId}` : "/savings"),

  createSaving: (data: SavingCreateRequest) =>
    request<SavingMovement>("/savings", { method: "POST", body: JSON.stringify(data) }),

  updateSaving: (id: number, data: SavingCreateRequest) =>
    request<SavingMovement>(`/savings/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteSaving: (id: number) =>
    request<void>(`/savings/${id}`, { method: "DELETE" }),

  // ── Disponible ──────────────────────────────────────────────────────────────

  getAvailable: () =>
    request<AvailableResponse>("/available"),

  // ── Cedears ─────────────────────────────────────────────────────────────────

  getCedearSPY: () =>
    request<CedearSPY>("/cedears/spy"),

  // ── Tarjetas ─────────────────────────────────────────────────────────────────

  parseStatement: async (pdf: File): Promise<CardStatementParsed> => {
    const form = new FormData();
    form.append("pdf", pdf);
    const res = await fetch(`${BASE}/cards/statements/parse`, {
      method: "POST",
      headers: {
        "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID ?? "",
        "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET ?? "",
      },
      body: form,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  getCardStatement: async (cardType: string, year: number, month: number): Promise<CardStatement | null> => {
    const res = await fetch(`${BASE}/cards/statements?cardType=${cardType}&year=${year}&month=${month}`, {
      headers: {
        "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID ?? "",
        "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET ?? "",
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  getStatementPdfUrl: (statementId: number): string =>
    `${BASE}/cards/statements/${statementId}/pdf`,

  deleteStatement: (id: number) =>
    request<void>(`/cards/statements/${id}`, { method: "DELETE" }),

  getCardExpenses: (statementId: number): Promise<CardExpense[]> =>
    request<CardExpense[]>(`/cards/statements/${statementId}/expenses`),

  saveStatement: async (data: CardStatementSaveRequest, pdfFile: File): Promise<{ statementId: number; pdfPath: string }> => {
    const form = new FormData();
    form.append("pdf", pdfFile);
    form.append("data", JSON.stringify(data));
    const res = await fetch(`${BASE}/cards/statements`, {
      method: "POST",
      headers: {
        "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID ?? "",
        "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET ?? "",
      },
      body: form,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  getCards: () => request<CardDto[]>("/cards"),
  createCard: (data: { name: string; bank: string; type: string }) =>
    request<{ id: number }>("/cards", { method: "POST", body: JSON.stringify(data) }),
  updateCard: (id: number, data: { name: string; bank: string; type: string }) =>
    request<{ id: number }>(`/cards/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCard: (id: number) => request<void>(`/cards/${id}`, { method: "DELETE" }),

  getCardCategories: () => request<CardCategoryDto[]>("/cards/categories"),
  createCardCategory: (data: Omit<CardCategoryDto, "id">) =>
    request<{ id: number }>("/cards/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCardCategory: (id: number, data: Omit<CardCategoryDto, "id">) =>
    request<{ id: number }>(`/cards/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCardCategory: (id: number) => request<void>(`/cards/categories/${id}`, { method: "DELETE" }),

  getCardCategoryRules: () => request<CardCategoryRuleDto[]>("/cards/category-rules"),
  createCardCategoryRule: (data: { keyword: string; categoryId: number; priority: number }) =>
    request<{ id: number }>("/cards/category-rules", { method: "POST", body: JSON.stringify(data) }),
  updateCardCategoryRule: (id: number, data: { keyword: string; categoryId: number; priority: number }) =>
    request<{ id: number }>(`/cards/category-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCardCategoryRule: (id: number) => request<void>(`/cards/category-rules/${id}`, { method: "DELETE" }),
  applyCardCategoryRules: () => request<{ updated: number }>("/cards/category-rules/apply", { method: "POST" }),

  getLogoRules: () => request<LogoRuleDto[]>("/cards/logo-rules"),
  createLogoRule: (data: { keyword: string; logoUrl: string; priority: number }) =>
    request<{ id: number }>("/cards/logo-rules", { method: "POST", body: JSON.stringify(data) }),
  updateLogoRule: (id: number, data: { keyword: string; logoUrl: string; priority: number }) =>
    request<{ id: number }>(`/cards/logo-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLogoRule: (id: number) => request<void>(`/cards/logo-rules/${id}`, { method: "DELETE" }),

  // ── Push notifications ───────────────────────────────────────────────────
  getVapidPublicKey: () => request<{ publicKey: string }>("/push/vapid-public-key"),
  getPushSubscriptions: () => request<PushSubscriptionDto[]>("/push/subscriptions"),
  subscribePush: (data: PushSubscribeRequest) =>
    request<PushSubscriptionDto>("/push/subscribe", { method: "POST", body: JSON.stringify(data) }),
  updatePushSubscription: (id: number, data: PushUpdateRequest) =>
    request<PushSubscriptionDto>(`/push/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePushSubscription: (id: number) =>
    request<void>(`/push/subscriptions/${id}`, { method: "DELETE" }),
  testPushNotification: (id: number) =>
    request<{ sent: boolean }>(`/push/test/${id}`, { method: "POST" }),
};
