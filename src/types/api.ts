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
