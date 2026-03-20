import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIngresos, useIngresosForYear, useIncomeCategories, useAvailable, useGastos, useGastosForYear, useDolarBlue, useUSDCARS } from "@/hooks/useApi";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import CategoryBarChart from "@/components/CategoryBarChart";
import SkeletonList from "@/components/SkeletonList";
import type { IngresoResponse } from "@/types/api";
import type { GastosByCategoryResponse } from "@/types/api";

interface Props {
  onEditIngreso: (i: IngresoResponse) => void;
  onMenu: () => void;
  onSettings: () => void;
  filterMode: FilterMode;
  year: number;
  month: number;
  onFilterModeChange: (mode: FilterMode) => void;
  onDateChange: (year: number, month: number) => void;
}

export default function Ingresos({ onEditIngreso, onMenu, onSettings, filterMode, year, month, onFilterModeChange, onDateChange }: Props) {
  const navigate = useNavigate();
  const [pillReady, setPillReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setPillReady(true)); }, []);
  const [search, setSearch] = useState("");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [conversionMode, setConversionMode] = useState<"blue" | "usdc">("blue");

  const monthQuery = useIngresos(filterMode === "month" ? year : 0, filterMode === "month" ? month : 0);
  const yearQuery = useIngresosForYear(filterMode === "year" ? year : 0);
  const ingresos = (filterMode === "year" ? yearQuery.data : monthQuery.data) ?? [];
  const isLoading = filterMode === "year" ? yearQuery.isLoading : monthQuery.isLoading;
  const error = filterMode === "month" ? monthQuery.error : null;
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: available } = useAvailable();
  const { data: dolarBlue } = useDolarBlue();
  const { data: usdcARS } = useUSDCARS();

  // Gastos total for the pill (cross-fetch, likely already cached)
  const gasMonthQ = useGastos(filterMode === "month" ? year : 0, filterMode === "month" ? month : 0);
  const gasYearQ = useGastosForYear(filterMode === "year" ? year : 0);
  const gastosData = (filterMode === "year" ? gasYearQ.data : gasMonthQ.data) ?? [];
  const gastosTotal = useMemo(() => gastosData.reduce((s, g) => s + g.amount, 0), [gastosData]);

  const conversionRate = conversionMode === "blue" ? dolarBlue?.compra : usdcARS?.compra;

  const categoryColorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of incomeCategories) {
      if (c.id != null && c.color) map.set(c.id, c.color);
    }
    return map;
  }, [incomeCategories]);

  // Group ingresos by category+currency → chart data
  // amount = original currency (for label display), arsAmount = ARS equivalent (for bar height)
  const { chartCategories, chartHeightAmounts } = useMemo(() => {
    const map = new Map<string, GastosByCategoryResponse & { _arsAmount: number }>();
    for (const i of ingresos) {
      const isUSD = i.currencySymbol === "USD" || i.currencySymbol === "U$S";
      const arsAmount = isUSD && conversionRate ? i.amount * conversionRate : i.amount;
      const key = `${i.categoryId ?? "null"}-${i.currencyId}`;
      const catLabel = (i.category || "Sin categoría") + (isUSD ? " (USD)" : " (ARS)");
      if (!map.has(key)) {
        map.set(key, {
          categoryId: i.categoryId ?? -1,
          categoryName: catLabel,
          categoryDescription: null,
          categoryIcon: i.categoryIcon,
          categoryColor: i.categoryColor ?? (i.categoryId != null ? categoryColorMap.get(i.categoryId) ?? null : null),
          amount: 0,
          currencyId: i.currencyId,
          currency: i.currency,
          currencySymbol: i.currencySymbol,
          _arsAmount: 0,
        });
      }
      const entry = map.get(key)!;
      entry.amount += i.amount;       // original currency total (for label)
      entry._arsAmount += arsAmount;  // ARS equivalent (for bar height)
    }
    const sorted = Array.from(map.values()).sort((a, b) => b._arsAmount - a._arsAmount);
    return {
      chartCategories: sorted,
      chartHeightAmounts: sorted.map(c => c._arsAmount),
    };
  }, [ingresos, categoryColorMap, conversionRate]);

  // Filter by selected chart category indices
  const filtered = useMemo(() => {
    let result = ingresos;
    if (activeIndices.length > 0) {
      // Match by categoryId+currencyId since chart is grouped that way
      const selectedKeys = new Set(
        activeIndices.map(i => {
          const cat = chartCategories[i];
          return cat ? `${cat.categoryId}-${cat.currencyId}` : null;
        }).filter(Boolean)
      );
      result = result.filter(i => selectedKeys.has(`${i.categoryId ?? -1}-${i.currencyId}`));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.description.toLowerCase().includes(q));
    }
    return result;
  }, [ingresos, search, activeIndices, chartCategories]);

  // Total in ARS (USD amounts converted using selected rate)
  const total = useMemo(() => {
    if (!ingresos.length) return null;
    let arsSum = 0;
    for (const i of ingresos) {
      const isUSD = i.currencySymbol === "USD" || i.currencySymbol === "U$S";
      arsSum += isUSD && conversionRate ? i.amount * conversionRate : i.amount;
    }
    return { total: arsSum };
  }, [ingresos, conversionRate]);


  const handleCategorySelect = (i: number) => {
    setActiveIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto lg:max-w-3xl animate-page-from-right">
      <div className="flex-shrink-0">
        <DateFilter
          mode={filterMode}
          year={year}
          month={month}
          onModeChange={onFilterModeChange}
          onChange={onDateChange}
          onMenu={onMenu}
          onSettings={onSettings}
        />
      </div>

      {/* Disponible + conversion toggle + segmented pill */}
      <div className="px-5 pb-2 flex-shrink-0 flex flex-col items-center text-center">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-20 bg-secondary rounded animate-pulse mx-auto" />
            <div className="h-10 w-48 bg-secondary rounded-lg animate-pulse mx-auto" />
            <div className="h-7 w-44 bg-secondary rounded-full animate-pulse mx-auto mt-1" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-0.5">Disponible</p>
            <div className="flex items-baseline gap-2 justify-center mb-2">
              <span className={`text-4xl font-bold tracking-tighter tabular ${available && available.disponible < 0 ? "text-red-500" : "text-foreground"}`}>
                {(available?.disponible ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">{available?.moneda ?? "ARS"}</span>
            </div>

            <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 overflow-hidden w-full max-w-xs">
              <button
                onClick={() => navigate("/")}
                style={{ flexGrow: pillReady ? 38 : 50, transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)" }}
                className="py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                — Gastos
              </button>
              <button
                style={{ flexGrow: pillReady ? 62 : 50, transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)" }}
                className="py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 bg-emerald-500 text-white shadow-sm"
              >
                {total ? `$${total.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })} ARS` : "+ Ingresos"}
              </button>
            </div>

            {/* Blue / USDC conversion toggle — below the main pill */}
            {(dolarBlue || usdcARS) && (
              <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 mt-2">
                {dolarBlue && (
                  <button
                    onClick={() => setConversionMode("blue")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      conversionMode === "blue"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Blue ${dolarBlue.compra.toLocaleString("es-AR")}
                  </button>
                )}
                {usdcARS && (
                  <button
                    onClick={() => setConversionMode("usdc")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      conversionMode === "usdc"
                        ? "bg-teal-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    USDC · ARQ ${usdcARS.compra.toLocaleString("es-AR")}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bar chart */}
      {chartCategories.length > 0 && (
        <div className="flex-shrink-0">
          <CategoryBarChart
            categories={chartCategories}
            activeIndices={activeIndices}
            onSelect={handleCategorySelect}
            heightAmounts={chartHeightAmounts}
          />
        </div>
      )}

      {/* Search */}
      <div className="px-5 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ingresos..."
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {error ? (
          <div className="mx-5 mt-2 p-4 rounded-2xl bg-red-50 text-red-500 text-sm">
            Error al cargar los ingresos.
          </div>
        ) : isLoading ? (
          <SkeletonList />
        ) : (
          <div className="animate-fade-in">
            {filtered.map(i => (
              <IngresoRow
                key={i.id}
                ingreso={i}
                categoryColor={i.categoryColor ?? (i.categoryId != null ? categoryColorMap.get(i.categoryId) ?? null : null)}
                onClick={() => onEditIngreso(i)}
                conversionRate={conversionRate}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                No hay ingresos registrados. Tocá '+' para agregar.
              </p>
            )}
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
}

function IngresoRow({ ingreso, categoryColor, onClick, conversionRate }: {
  ingreso: IngresoResponse;
  categoryColor: string | null;
  onClick: () => void;
  conversionRate?: number;
}) {
  const isUSD = ingreso.currencySymbol === "USD" || ingreso.currencySymbol === "U$S";
  const arsValue = isUSD && conversionRate ? ingreso.amount * conversionRate : undefined;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 px-4 active:bg-secondary/60 transition-colors duration-200 text-left border-b border-border/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: categoryColor ?? "var(--secondary)" }}
        >
          {ingreso.categoryIcon || "💰"}
        </div>
        <div className="min-w-0">
          {ingreso.category && (
            <span
              className="inline-block text-[9px] font-semibold px-1 py-px rounded-full mb-0.5"
              style={{ backgroundColor: categoryColor ?? "#e5e7eb", color: "#374151" }}
            >
              {ingreso.category}
            </span>
          )}
          <div className="text-sm font-medium text-foreground truncate">{ingreso.description}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(ingreso.dateTime), "dd/MM/yyyy")}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 ml-3">
        <div className="text-sm font-semibold tabular text-emerald-500">
          + {ingreso.currencySymbol} {ingreso.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
        </div>
        {arsValue !== undefined && (
          <div className="text-[10px] text-muted-foreground tabular">
            ≈ ${arsValue.toLocaleString("es-AR", { minimumFractionDigits: 0 })} ARS
          </div>
        )}
      </div>
    </button>
  );
}
