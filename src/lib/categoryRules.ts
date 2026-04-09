import type { CategoryRule, Label, LabelRule } from "@/types/api";

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

export function detectLabelsFromDescription(
  description: string,
  rules: LabelRule[],
): Label[] {
  if (!description.trim() || rules.length === 0) return [];

  const collected: Label[] = [];
  const seenIds = new Set<number>();

  for (const rule of rules) {
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (!re.test(description)) continue;

    for (const label of rule.labels) {
      if (seenIds.has(label.id)) continue;
      seenIds.add(label.id);
      collected.push(label);
    }
  }

  return collected;
}
