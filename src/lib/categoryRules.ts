/**
 * Keyword → Category auto-assignment rules.
 *
 * Future backend endpoint spec:
 *
 *   GET  /api/category-rules
 *   Response: { id: number, keyword: string, categoryId: number }[]
 *
 *   POST /api/category-rules
 *   Body:     { keyword: string, categoryId: number }
 *   Response: { id: number, keyword: string, categoryId: number }
 *
 *   DELETE /api/category-rules/:id
 *   Response: 204 No Content
 *
 * For now rules live in localStorage, seeded with the defaults below.
 */

export interface CategoryRule {
  id: string;
  keyword: string;  // matched case-insensitively, anywhere in the description
  categoryId: number;
}

const STORAGE_KEY = "categoryRules";

// In-memory cache so we never read localStorage on every render
let _cache: CategoryRule[] | null = null;

const DEFAULT_RULES: CategoryRule[] = [
  { id: "default-1", keyword: "arnaldo",  categoryId: 6 }, // Boludes
  { id: "default-2", keyword: "carrefour", categoryId: 2 }, // Supermercado
  { id: "default-3", keyword: "dia",       categoryId: 2 }, // Supermercado
];

export function loadRules(): CategoryRule[] {
  if (_cache) return _cache;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      _cache = JSON.parse(stored) as CategoryRule[];
      return _cache;
    }
  } catch {}
  // Seed defaults on first run
  _cache = [...DEFAULT_RULES];
  saveRules(_cache);
  return _cache;
}

export function saveRules(rules: CategoryRule[]): void {
  _cache = rules;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {}
}

/**
 * Returns the first matching { categoryId, keyword } or null.
 * Uses whole-word matching to avoid false positives
 * (e.g. "dia" must not match inside "necesidad" or "india").
 */
export function detectCategoryFromDescription(
  description: string,
): { categoryId: number; keyword: string } | null {
  if (!description.trim()) return null;
  const lower = description.toLowerCase();
  const rules = loadRules();
  for (const rule of rules) {
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(lower)) {
      return { categoryId: rule.categoryId, keyword: rule.keyword };
    }
  }
  return null;
}
