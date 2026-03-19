import { useState, useEffect } from "react";
import type { GastosByCategoryResponse } from "@/types/api";

const BAR_COLORS_LIGHT = [
  "#c8f0b0", "#ffc8c8", "#d0d0d0", "#b8d8ff",
  "#ffe8a0", "#e0c0ff", "#b0f0e0", "#ffd4a0",
];

const BAR_COLORS_DARK = [
  "#6ee7b7", "#fca5a5", "#94a3b8", "#93c5fd",
  "#fcd34d", "#c4b5fd", "#5eead4", "#fdba74",
];

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export const BAR_COLORS = BAR_COLORS_LIGHT;

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(Math.round(amount));
}

interface Props {
  categories: GastosByCategoryResponse[];
  // Use indices so selection works even when categoryId is null/inconsistent
  activeIndices: number[];
  onSelect: (index: number) => void;
}

const BAR_MAX_H = 175;

export default function CategoryBarChart({ categories, activeIndices, onSelect }: Props) {
  const isDark = useIsDark();
  const colors = isDark ? BAR_COLORS_DARK : BAR_COLORS_LIGHT;

  if (!categories.length) return null;

  const max = Math.max(...categories.map((c) => c.amount));
  const total = categories.reduce((s, c) => s + c.amount, 0);
  const hasSelection = activeIndices.length > 0;

  return (
    <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar pb-2 pt-1">
      {categories.map((cat, i) => {
        const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
        const barH = max > 0 ? Math.max(28, Math.round((cat.amount / max) * BAR_MAX_H)) : 28;
        const color = cat.categoryColor ?? colors[i % colors.length];
        const isActive = activeIndices.includes(i);
        const isDimmed = hasSelection && !isActive;

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex flex-col items-center flex-shrink-0 w-[88px] focus:outline-none transition-opacity ${
              isDimmed ? "opacity-40" : "opacity-100"
            }`}
          >
            <div
              className={`w-[68px] rounded-2xl border-2 border-dashed flex items-end justify-center relative overflow-hidden transition-all ${
                isActive ? "border-primary" : "border-border"
              }`}
              style={{ height: BAR_MAX_H }}
            >
              <div
                className="w-full rounded-2xl flex items-center justify-center transition-all duration-500"
                style={{ height: barH, backgroundColor: color }}
              >
                {cat.categoryIcon && (
                  <span className="text-xl leading-none">{cat.categoryIcon}</span>
                )}
              </div>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground mt-1 w-full text-center truncate px-1">
              {cat.categoryName}
            </span>
            <span className="text-[11px] font-bold text-foreground tabular">
              {formatAmount(cat.amount)}
            </span>
            <span className="text-[10px] text-muted-foreground tabular">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}
