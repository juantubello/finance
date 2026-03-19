import type { CategoryRule } from "@/types/api";

/**
 * Returns the first matching { categoryId, keyword } or null.
 * Rules come from GET /category-rules (passed in as parameter).
 * Matching is word-boundary based (case-insensitive).
 */
export function detectCategoryFromDescription(
  description: string,
  rules: CategoryRule[],
): { categoryId: number; keyword: string } | null {
  if (!description.trim() || rules.length === 0) return null;
  for (const rule of rules) {
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(description)) {
      return { categoryId: rule.categoryId, keyword: rule.keyword };
    }
  }
  return null;
}
