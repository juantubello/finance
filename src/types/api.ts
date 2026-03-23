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
  senderDeviceId?: string | null;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

// ── Tarjetas ──────────────────────────────────────────────────────────────────

export interface CardExpenseParsed {
  cardholderName: string;
  date: string;
  description: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  amountArs: number | null;
  amountUsd: number | null;
}

export interface CardStatementParsed {
  cardType: "VISA" | "MASTERCARD";
  statementMonth: number;
  statementYear: number;
  closeDate: string;
  dueDate: string;
  nextCloseDate: string;
  nextDueDate: string;
  expenses: CardExpenseParsed[];
}

export interface CardStatement {
  id: number;
  cardId: number;
  cardType: "VISA" | "MASTERCARD";
  statementMonth: number;
  statementYear: number;
  closeDate: string;
  dueDate: string;
  nextCloseDate: string;
  nextDueDate: string;
  exchangeRateUsd: number;
  pdfPath: string | null;
}

export interface CardExpense {
  id: number;
  statementId: number;
  cardholderName: string;
  date: string;
  description: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  amountArs: number | null;
  amountUsd: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  /** Client-side resolved logo URL from logo rules */
  logoUrl?: string | null;
}

export interface CardStatementSaveRequest {
  cardId: number;
  statementMonth: number;
  statementYear: number;
  closeDate: string;
  dueDate: string;
  nextCloseDate: string;
  nextDueDate: string;
  exchangeRateUsd: number;
  expenses: CardExpenseParsed[];
  senderDeviceId?: string | null;
}

export interface PushSubscriptionDto {
  id: number;
  deviceId: string;
  alias: string;
  endpoint: string;
  active: boolean;
  receiveOwn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscribeRequest {
  deviceId: string;
  alias: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushUpdateRequest {
  active: boolean;
  receiveOwn: boolean;
}

export interface CardDto {
  id: number;
  name: string;
  bank: string;
  type: "VISA" | "MASTERCARD";
  createdAt: string;
}

export interface CardCategoryDto {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  logoUrl: string | null;
}

export interface CardCategoryRuleDto {
  id: number;
  keyword: string;
  categoryId: number;
  categoryName: string;
  priority: number;
}

export interface LogoRuleDto {
  id: number;
  keyword: string;
  logoUrl: string;
  priority: number;
}
