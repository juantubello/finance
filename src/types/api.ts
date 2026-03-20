export interface GastoResponse {
  id: number;
  dateTime: string;
  description: string;
  amount: number;
  categoryId: number | null;
  category: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  currencyId: number;
  currency: string;
  currencySymbol: string;
  labels: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: number;
  name: string;
}

export interface CategoryRule {
  id: number;
  keyword: string;
  categoryId: number;
  categoryName: string;
}

export interface GastosByCategoryResponse {
  categoryId: number;
  categoryName: string;
  categoryDescription: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  amount: number;
  currencyId: number;
  currency: string;
  currencySymbol: string;
}

export interface GastosByCategoryRangeResponse {
  totals: GastosByCategoryResponse[];
  byMonth: {
    year: number;
    month: number;
    categories: GastosByCategoryResponse[];
  }[];
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export interface CurrencyResponse {
  id: number;
  name: string;
  symbol: string;
}

// ── Ingresos ──────────────────────────────────────────────────────────────────

export interface IngresoResponse {
  id: number;
  dateTime: string;
  description: string;
  amount: number;
  categoryId: number | null;
  category: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  currencyId: number;
  currency: string;
  currencySymbol: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngresoCreateRequest {
  dateTime: string;
  description: string;
  amount: number;
  currencyId: number;
  categoryId: number | null;
}

export interface IncomeCategoryResponse {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

// ── Ahorros ───────────────────────────────────────────────────────────────────

export interface SavingAsset {
  id: number;
  nombre: string;
  ticker: string;
  tipo: "fiat" | "crypto" | "cedear";
  decimales: number;
}

export interface SavingBalance {
  activoId: number;
  activo: string;
  ticker: string;
  tipo: string;
  decimales: number;
  balance: number;
}

export interface SavingMovement {
  id: number;
  dateTime: string;
  activoId: number;
  activo: string;
  ticker: string;
  tipo: string;
  decimales: number;
  cantidad: number;
  precioArs: number | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingCreateRequest {
  dateTime: string;
  activoId: number;
  cantidad: number;
  precioArs: number | null;
  description: string;
}

// ── Cedears ───────────────────────────────────────────────────────────────────

export interface CedearSPY {
  ticker: string;
  description: string;
  lastPrice: number;
  previousClosing: number;
  variation: number;
  ratio: number;
  lastQuote: string;
}

// ── Disponible ────────────────────────────────────────────────────────────────

export interface AvailableResponse {
  totalIngresos: number;
  totalGastos: number;
  disponible: number;
  moneda: string;
}

export interface GastoCreateRequest {
  dateTime: string;
  description: string;
  amount: number;
  categoryId: number | null;
  currencyId: number;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}
