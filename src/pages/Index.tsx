import { useState, useMemo, useEffect, useRef } from "react";
import {
  useGastos,
  useGastosForYear,
  useGastosByCategories,
  useGastosByCategoriesForYear,
} from "@/hooks/useApi";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import CategoryBarChart, { BAR_COLORS } from "@/components/CategoryBarChart";
import ExpenseRow from "@/components/ExpenseRow";
import SkeletonList from "@/components/SkeletonList";
import type { GastoResponse } from "@/types/api";
import { Search, BarChart2, List, ChevronDown } from "lucide-react";

const now = new Date();
type ViewMode = "gastos" | "ingresos";

interface Props {
  onEditGasto: (g: GastoResponse) => void;
  onMenu: () => void;
  onSettings: () => void;
}

export default function Index({ onEditGasto, onMenu, onSettings }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gastos");
  const [showChart, setShowChart] = useState(true);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(null);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  const monthQuery = useGastos(
    filterMode === "month" ? year : 0,
    filterMode === "month" ? month : 0,
  );
  const yearQuery = useGastosForYear(filterMode === "year" ? year : 0);
  const monthCatQuery = useGastosByCategories(
    filterMode === "month" ? year : 0,
    filterMode === "month" ? month : 0,
  );
  const yearCatQuery = useGastosByCategoriesForYear(filterMode === "year" ? year : 0);

  const allGastos = filterMode === "month" ? monthQuery.data : yearQuery.data;
  const loadingGastos = filterMode === "month" ? monthQuery.isLoading : yearQuery.isLoading;
  const errorGastos = filterMode === "month" ? monthQuery.error : null;
  const allCategories = filterMode === "month" ? monthCatQuery.data : yearCatQuery.data;
  const loadingCats = filterMode === "month" ? monthCatQuery.isLoading : yearCatQuery.isLoading;

  // Currencies present in the current period's expenses
  const availableCurrencies = useMemo(() => {
    if (!allGastos) return [];
    const map = new Map<number, { id: number; symbol: string; name: string }>();
    for (const g of allGastos) {
      if (!map.has(g.currencyId)) {
        map.set(g.currencyId, { id: g.currencyId, symbol: g.currencySymbol, name: g.currency });
      }
    }
    return Array.from(map.values());
  }, [allGastos]);

  // Auto-select first currency (ARS) when data loads or period changes
  useEffect(() => {
    if (availableCurrencies.length > 0) {
      const stillValid = selectedCurrencyId !== null &&
        availableCurrencies.some(c => c.id === selectedCurrencyId);
      if (!stillValid) setSelectedCurrencyId(availableCurrencies[0].id);
    }
  }, [availableCurrencies]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCurrency = availableCurrencies.find(c => c.id === selectedCurrencyId);

  // Filter gastos by selected currency
  const gastos = useMemo(() => {
    if (!allGastos) return undefined;
    if (selectedCurrencyId === null) return allGastos;
    return allGastos.filter(g => g.currencyId === selectedCurrencyId);
  }, [allGastos, selectedCurrencyId]);

  // Filter categories by selected currency
  const categories = useMemo(() => {
    if (!allCategories) return undefined;
    if (selectedCurrencyId === null) return allCategories;
    return allCategories.filter(c => c.currencyId === selectedCurrencyId);
  }, [allCategories, selectedCurrencyId]);

  const activeCategories = useMemo(() => {
    if (!categories || activeIndices.length === 0) return null;
    return activeIndices
      .map((i) => categories[i])
      .filter(Boolean)
      .map((c) => ({ id: c.categoryId, name: c.categoryName }));
  }, [categories, activeIndices]);

  const filtered = useMemo(() => {
    if (!gastos) return [];
    let list = gastos;
    if (activeCategories && activeCategories.length > 0) {
      list = list.filter((g) =>
        activeCategories.some(
          (ac) =>
            (ac.id != null && g.categoryId != null && ac.id === g.categoryId) ||
            (ac.name && g.category && ac.name === g.category)
        )
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.description.toLowerCase().includes(q));
    }
    return list;
  }, [gastos, activeCategories, search]);

  const total = useMemo(() => {
    if (!gastos || gastos.length === 0) return null;
    const total = gastos.reduce((s, g) => s + g.amount, 0);
    return { symbol: selectedCurrency?.symbol ?? "", total };
  }, [gastos, selectedCurrency]);

  const selectedSum = useMemo(() => {
    if (!activeCategories || activeCategories.length === 0 || !gastos) return null;
    return filtered.reduce((s, g) => s + g.amount, 0);
  }, [filtered, activeCategories, gastos]);

  // Map categoryId/name → bar color
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (categories) {
      categories.forEach((cat, i) => {
        const color = BAR_COLORS[i % BAR_COLORS.length];
        if (cat.categoryId != null) map.set(String(cat.categoryId), color);
        map.set(cat.categoryName, color);
      });
    }
    return map;
  }, [categories]);

  const handleDateChange = (y: number, m: number) => {
    setYear(y); setMonth(m); setActiveIndices([]);
  };
  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode); setActiveIndices([]);
  };
  const handleCategorySelect = (index: number) => {
    setActiveIndices((prev) =>
      prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index]
    );
  };

  const hasChart = viewMode === "gastos" && (loadingCats || (categories && categories.length > 0));

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto">

      {/* ── Static top section ── */}
      <div className="flex-shrink-0">
        <DateFilter
          mode={filterMode}
          year={year}
          month={month}
          onModeChange={handleModeChange}
          onChange={handleDateChange}
          onMenu={onMenu}
          onSettings={onSettings}
        />

        {/* Totals + pills */}
        <div className="px-5 pb-2 flex flex-col items-center text-center">
          {loadingGastos ? (
            <div className="space-y-2">
              <div className="h-4 w-12 bg-secondary rounded animate-pulse mx-auto" />
              <div className="h-10 w-48 bg-secondary rounded-lg animate-pulse mx-auto" />
              <div className="h-7 w-44 bg-secondary rounded-full animate-pulse mx-auto mt-1" />
            </div>
          ) : total ? (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total</p>
              <div className="flex items-baseline gap-1.5 justify-center">
                <span className="text-4xl font-bold tracking-tighter tabular text-foreground">
                  {total.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </span>
                {/* Currency selector button */}
                <div className="relative flex-shrink-0" ref={currencyDropdownRef}>
                  <button
                    onClick={() => setCurrencyDropdownOpen((v) => !v)}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-xl bg-secondary hover:bg-muted transition-colors"
                  >
                    <span className="text-sm font-bold text-foreground">{selectedCurrency?.name ?? selectedCurrency?.symbol ?? "—"}</span>
                    <ChevronDown size={11} className="text-muted-foreground" />
                  </button>
                  {currencyDropdownOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-card border border-border rounded-2xl shadow-lg z-50 py-1 min-w-[130px]">
                      {availableCurrencies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCurrencyId(c.id); setCurrencyDropdownOpen(false); setActiveIndices([]); }}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-secondary ${
                            c.id === selectedCurrencyId ? "text-primary font-semibold" : "text-foreground"
                          }`}
                        >
                          {c.symbol} — {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-2 justify-center">
                <button
                  onClick={() => setViewMode("gastos")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === "gastos"
                      ? "bg-[#ff5c4d] text-white shadow-sm"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  — {total.symbol}{total.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </button>
                <button
                  onClick={() => setViewMode("ingresos")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === "ingresos"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  + Ingresos
                </button>
              </div>
              {selectedSum !== null && viewMode === "gastos" && (
                <span className="inline-flex items-center mt-1.5 px-3 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold tabular">
                  Selec: {total.symbol}{selectedSum.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          ) : !loadingGastos ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">No hay datos este período</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setViewMode("gastos")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === "gastos" ? "bg-[#ff5c4d] text-white shadow-sm" : "bg-secondary text-muted-foreground"
                  }`}
                >— Gastos</button>
                <button
                  onClick={() => setViewMode("ingresos")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === "ingresos" ? "bg-emerald-500 text-white shadow-sm" : "bg-secondary text-muted-foreground"
                  }`}
                >+ Ingresos</button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Collapsible chart */}
        {viewMode === "gastos" && (
          <div className={`grid transition-[grid-template-rows] duration-400 ease-in-out ${showChart ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden min-h-0">
              {loadingCats ? (
                <div className="flex gap-4 px-5 pb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 w-[88px]">
                      <div className="w-16 rounded-2xl bg-secondary animate-pulse" style={{ height: 175 }} />
                      <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
                      <div className="h-2 w-7 bg-secondary rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : categories && categories.length > 0 ? (
                <CategoryBarChart categories={categories} activeIndices={activeIndices} onSelect={handleCategorySelect} />
              ) : null}
            </div>
          </div>
        )}

        {/* Search + currency selector + chart toggle */}
        {viewMode === "gastos" && (
          <div className="flex items-center gap-2 px-5 py-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar gastos..."
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Chart toggle */}
            {hasChart && (
              <button
                onClick={() => setShowChart((v) => !v)}
                className={`flex-shrink-0 flex items-center h-9 px-3 rounded-xl text-xs font-medium transition-all ${
                  showChart ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
                }`}
              >
                {showChart ? <List size={14} /> : <BarChart2 size={14} />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable list ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {viewMode === "ingresos" ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <span className="text-4xl mb-4">💰</span>
            <p className="text-sm font-medium text-foreground mb-1">No se registraron ingresos</p>
            <p className="text-xs text-muted-foreground">Tocá '+' para registrar un ingreso</p>
          </div>
        ) : errorGastos ? (
          <div className="mx-5 mt-2 p-4 rounded-2xl bg-expense/10 text-expense text-sm">
            Error al cargar los gastos. Verificá tu conexión.
          </div>
        ) : loadingGastos ? (
          <SkeletonList />
        ) : (
          <div className="animate-fade-in">
            {filtered.map((g) => (
              <ExpenseRow
                key={g.id}
                gasto={g}
                onClick={() => onEditGasto(g)}
                categoryColor={
                  g.categoryId != null
                    ? categoryColorMap.get(String(g.categoryId))
                    : categoryColorMap.get(g.category)
                }
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                {activeCategories
                  ? "No hay gastos en las categorías seleccionadas."
                  : "No hay gastos registrados. Tocá '+' para empezar."}
              </p>
            )}
          </div>
        )}
        <div className="h-24" />
      </div>
    </div>
  );
}
