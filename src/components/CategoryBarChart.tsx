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
  activeIndices: number[];
  onSelect: (index: number) => void;
  // Optional ARS-equivalent amounts for bar height/percentage when amounts are in mixed currencies
  heightAmounts?: number[];
  privacyMode?: boolean;
  // Optional image URLs for categories that use logos instead of emoji icons (e.g. card categories)
  logoUrls?: (string | null | undefined)[];
}

const BAR_MAX_H = 175;
const BAR_VISIBLE_H = 177;
const CHART_ITEM_H = 233;

export default function CategoryBarChart({ categories, activeIndices, onSelect, heightAmounts, privacyMode, logoUrls }: Props) {
  const isDark = useIsDark();
  const colors = isDark ? BAR_COLORS_DARK : BAR_COLORS_LIGHT;

  if (!categories.length) return null;

  const heights = heightAmounts ?? categories.map(c => c.amount);
  const max = Math.max(...heights);
  const totalHeight = heights.reduce((s, v) => s + v, 0);
  const hasSelection = activeIndices.length > 0;

  return (
    <div className="flex items-start gap-3 px-5 overflow-x-auto no-scrollbar pb-2 pt-1.5">
      {categories.map((cat, i) => {
        const h = heights[i] ?? cat.amount;
        const pct = totalHeight > 0 ? Math.round((h / totalHeight) * 100) : 0;
        const barH = max > 0 ? Math.max(28, Math.round((h / max) * BAR_MAX_H)) : 28;
        const color = cat.categoryColor ?? colors[i % colors.length];
        const isActive = activeIndices.includes(i);
        const isDimmed = hasSelection && !isActive;
        const showSymbol = !!cat.currencySymbol;
        const logoUrl = logoUrls?.[i];

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex flex-col items-center justify-start flex-shrink-0 w-[88px] focus:outline-none transition-opacity ${
              isDimmed ? "opacity-40" : "opacity-100"
            }`}
            style={{ height: CHART_ITEM_H }}
          >
            <div className="w-[68px] flex items-end pt-[2px]" style={{ height: BAR_VISIBLE_H }}>
              <div
                className={`w-[68px] rounded-2xl border-2 border-dashed relative overflow-hidden transition-colors ${isActive ? "border-primary" : "border-border"}`}
                style={{
                  height: BAR_MAX_H,
                  clipPath: "inset(calc(var(--chart-drain-progress, 0) * 100%) 0 0 0)",
                  opacity: "calc(1 - (var(--chart-drain-progress, 0) * 0.82))",
                }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-2xl transition-transform duration-150 will-change-transform"
                  style={{
                    height: barH,
                    backgroundColor: color,
                    transformOrigin: "bottom center",
                    transform: "scaleY(calc(1 - var(--chart-drain-progress, 0)))",
                  }}
                />
                {(logoUrl || cat.categoryIcon) && (
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-center pointer-events-none transition-[opacity,transform] duration-150 will-change-[opacity,transform]"
                    style={{
                      height: Math.max(barH, 44),
                      opacity: "calc(1 - (var(--chart-drain-progress, 0) * 1.05))",
                      transform: "translate3d(0, calc(var(--chart-drain-progress, 0) * 22px), 0) scale(calc(1 - (var(--chart-drain-progress, 0) * 0.18)))",
                    }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover shadow-sm" />
                    ) : (
                      <span className="text-xl leading-none">{cat.categoryIcon}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              className="w-full mt-1 transition-opacity duration-150"
              style={{ opacity: "calc(1 - (var(--chart-drain-progress, 0) * 0.55))" }}
            >
              <div className="h-6 text-[10px] leading-3 font-semibold text-muted-foreground w-full text-center truncate px-1">
                {cat.categoryName}
              </div>
              <div className="h-[14px] text-[11px] leading-[14px] font-bold text-foreground tabular">
                {privacyMode ? "***" : `${showSymbol ? `${cat.currencySymbol} ` : ""}${formatAmount(cat.amount)}`}
              </div>
              <div className="h-3.5 text-[10px] leading-[14px] text-muted-foreground tabular">{privacyMode ? "—" : `${pct}%`}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
