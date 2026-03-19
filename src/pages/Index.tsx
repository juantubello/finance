import { useState, useMemo, useEffect, useRef } from "react";
import {
  useGastos,
  useGastosForYear,
  useGastosByCategories,
  useGastosByCategoriesForYear,
  useLabels,
  useCategories,
} from "@/hooks/useApi";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import CategoryBarChart from "@/components/CategoryBarChart";
import ExpenseRow from "@/components/ExpenseRow";
import SkeletonList from "@/components/SkeletonList";
import type { GastoResponse } from "@/types/api";
import { Search, BarChart2, List, ChevronDown, X, Plus, SlidersHorizontal } from "lucide-react";
import type { Label } from "@/types/api";

const now = new Date();
type ViewMode = "gastos" | "ingresos";

function LabelInput({ allLabels, labelFilters, onToggle }: {
  allLabels: Label[];
  labelFilters: string[];
  onToggle: (name: string) => void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = allLabels.filter(
    l => !labelFilters.includes(l.name) && l.name.toLowerCase().includes(input.toLowerCase())
  );

  const commit = (name: string) => {
    const clean = name.replace(/^#+/, "").trim();
    if (clean) onToggle(clean);
    setInput("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <div className="relative flex-1 flex items-center bg-background rounded-xl">
          <span className="pl-3 text-xs font-semibold text-muted-foreground select-none">#</span>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(input);
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            placeholder="Agregar etiqueta..."
            className="flex-1 h-8 pr-3 bg-transparent text-foreground text-xs outline-none placeholder:text-muted-foreground/40"
          />
        </div>
        <button
          onClick={() => commit(input)}
          disabled={!input.trim()}
          className="h-8 w-8 flex items-center justify-center rounded-xl bg-background text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-lg z-50 py-1 max-h-40 overflow-y-auto">
          {suggestions.map(l => (
            <button
              key={l.id}
              onMouseDown={() => commit(l.name)}
              className="w-full text-left px-4 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
            >
              #{l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  const [descFilters, setDescFilters] = useState<string[]>([]);
  const [descInput, setDescInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("gastos");
  const [showChart, setShowChart] = useState(true);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(null);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  const { data: allLabels = [] } = useLabels();
  const { data: categoryDefs = [] } = useCategories();

  // categoryId → hex color from the canonical categories list
  const categoryColorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of categoryDefs) {
      if (c.id != null && c.color) map.set(c.id, c.color);
    }
    return map;
  }, [categoryDefs]);

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

  // Filter gastos by selected currency and enrich with color from categoryDefs
  const gastos = useMemo(() => {
    if (!allGastos) return undefined;
    const filtered = selectedCurrencyId === null
      ? allGastos
      : allGastos.filter(g => g.currencyId === selectedCurrencyId);
    return filtered.map(g => ({
      ...g,
      categoryColor: g.categoryColor ?? (g.categoryId != null ? categoryColorMap.get(g.categoryId) ?? null : null),
    }));
  }, [allGastos, selectedCurrencyId, categoryColorMap]);

  // Filter categories by selected currency and enrich with color from categoryDefs
  const categories = useMemo(() => {
    if (!allCategories) return undefined;
    const filtered = selectedCurrencyId === null
      ? allCategories
      : allCategories.filter(c => c.currencyId === selectedCurrencyId);
    return filtered.map(c => ({
      ...c,
      categoryColor: c.categoryColor ?? categoryColorMap.get(c.categoryId) ?? null,
    }));
  }, [allCategories, selectedCurrencyId, categoryColorMap]);

  const activeCategories = useMemo(() => {
    if (!categories || activeIndices.length === 0) return null;
    return activeIndices
      .map((i) => categories[i])
      .filter(Boolean)
      .map((c) => ({ id: c.categoryId, name: c.categoryName }));
  }, [categories, activeIndices]);

  const hasAdvancedFilter = labelFilters.length > 0 ||
    descFilters.some(d => d.trim()) ||
    !!dateFrom || !!dateTo;

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
    if (labelFilters.length > 0) {
      list = list.filter((g) => g.labels?.some(l => labelFilters.includes(l.name)));
    }
    if (descFilters.some(d => d.trim())) {
      const terms = descFilters.map(d => d.trim().toLowerCase()).filter(Boolean);
      list = list.filter((g) => terms.some(t => g.description.toLowerCase().includes(t)));
    }
    if (dateFrom) {
      list = list.filter((g) => g.dateTime.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((g) => g.dateTime.slice(0, 10) <= dateTo);
    }
    return list;
  }, [gastos, activeCategories, search, labelFilters, descFilters, dateFrom, dateTo]);

  const total = useMemo(() => {
    if (!gastos || gastos.length === 0) return null;
    const source = (hasAdvancedFilter || search.trim() || (activeCategories && activeCategories.length > 0))
      ? filtered
      : gastos;
    const sum = source.reduce((s, g) => s + g.amount, 0);
    return { symbol: selectedCurrency?.symbol ?? "", total: sum };
  }, [gastos, filtered, selectedCurrency, hasAdvancedFilter, search, activeCategories]);

  const selectedSum = useMemo(() => {
    if (!activeCategories || activeCategories.length === 0 || !gastos) return null;
    return filtered.reduce((s, g) => s + g.amount, 0);
  }, [filtered, activeCategories, gastos]);

  // Map categoryId/name → bar color

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

  const toggleLabel = (name: string) => {
    setLabelFilters(prev =>
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    );
  };

  const addDescFilter = () => {
    const val = descInput.trim();
    if (val && !descFilters.includes(val)) {
      setDescFilters(prev => [...prev, val]);
    }
    setDescInput("");
  };

  const removeDescFilter = (term: string) => {
    setDescFilters(prev => prev.filter(d => d !== term));
  };

  const clearAllFilters = () => {
    setLabelFilters([]);
    setDescFilters([]);
    setDescInput("");
    setDateFrom("");
    setDateTo("");
  };


  const hasChart = viewMode === "gastos" && (loadingCats || (categories && categories.length > 0));

  // Filtered total for the filter panel badge
  const filteredTotal = useMemo(() => {
    if (!hasAdvancedFilter) return null;
    const sum = filtered.reduce((s, g) => s + g.amount, 0);
    return { symbol: selectedCurrency?.symbol ?? "", total: sum, count: filtered.length };
  }, [filtered, hasAdvancedFilter, selectedCurrency]);

  return (
    <div className="flex flex-col h-[100dvh] lg:flex-row lg:max-w-5xl lg:mx-auto">

      {/* ── Left panel (top on mobile, sidebar on desktop) ── */}
      <div className="flex-shrink-0 lg:w-[400px] lg:h-full lg:flex lg:flex-col lg:border-r lg:border-border lg:overflow-y-auto">
        <DateFilter
          mode={filterMode}
          year={year}
          month={month}
          onModeChange={handleModeChange}
          onChange={handleDateChange}
          onMenu={onMenu}
          onSettings={onSettings}
        />

        {/* Disponible */}
        <div className="px-5 pb-2 flex flex-col items-center text-center">
          {loadingGastos ? (
            <div className="space-y-2">
              <div className="h-4 w-20 bg-secondary rounded animate-pulse mx-auto" />
              <div className="h-10 w-48 bg-secondary rounded-lg animate-pulse mx-auto" />
              <div className="h-7 w-44 bg-secondary rounded-full animate-pulse mx-auto mt-1" />
            </div>
          ) : total ? (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Disponible</p>
              <div className="flex items-baseline gap-2 justify-center">
                <span className="text-4xl font-bold tracking-tighter tabular text-foreground">
                  {total.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {selectedCurrency?.name ?? selectedCurrency?.symbol ?? "ARS"}
                </span>
              </div>
              {/* Segmented control */}
              <div className="mt-2 flex rounded-full border border-border/50 bg-secondary/60 p-0.5 overflow-hidden" style={{ width: 300 }}>
                <button
                  onClick={() => setViewMode("gastos")}
                  style={{ flexGrow: viewMode === "gastos" ? 62 : 38, transition: "flex-grow 0.35s ease, background-color 0.25s ease" }}
                  className={`py-2 px-3 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 ${
                    viewMode === "gastos"
                      ? "bg-[#ff5c4d] text-white shadow-sm"
                      : "text-muted-foreground/70"
                  }`}
                >
                  — {total.symbol}{total.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </button>
                <button
                  onClick={() => setViewMode("ingresos")}
                  style={{ flexGrow: viewMode === "ingresos" ? 62 : 38, transition: "flex-grow 0.35s ease, background-color 0.25s ease" }}
                  className={`py-2 px-3 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 ${
                    viewMode === "ingresos"
                      ? "bg-emerald-400 text-white shadow-sm"
                      : "text-muted-foreground/70"
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
              {/* Segmented control — no data */}
              <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 overflow-hidden" style={{ width: 240 }}>
                <button
                  onClick={() => setViewMode("gastos")}
                  style={{ flexGrow: viewMode === "gastos" ? 62 : 38, transition: "flex-grow 0.35s ease, background-color 0.25s ease" }}
                  className={`py-2 px-3 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 ${
                    viewMode === "gastos" ? "bg-[#ff5c4d] text-white shadow-sm" : "text-muted-foreground/70"
                  }`}
                >— Gastos</button>
                <button
                  onClick={() => setViewMode("ingresos")}
                  style={{ flexGrow: viewMode === "ingresos" ? 62 : 38, transition: "flex-grow 0.35s ease, background-color 0.25s ease" }}
                  className={`py-2 px-3 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 ${
                    viewMode === "ingresos" ? "bg-emerald-400 text-white shadow-sm" : "text-muted-foreground/70"
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
      </div>

      {/* ── Right panel (bottom on mobile, main content on desktop) ── */}
      <div className="flex-1 flex flex-col min-h-0 lg:h-full">

        {/* Search + currency filter + chart toggle */}
        {viewMode === "gastos" && (
          <div className="flex items-center gap-2 px-5 py-2 flex-shrink-0">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex-shrink-0 relative flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium transition-all ${
                showFilters || hasAdvancedFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal size={14} />
              {hasAdvancedFilter && (
                <span className="text-[10px] font-bold">
                  {(labelFilters.length > 0 ? 1 : 0) + (descFilters.length > 0 ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)}
                </span>
              )}
            </button>

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

            {/* Currency selector — only shown when multiple currencies exist */}
            {availableCurrencies.length > 1 && (
              <div className="relative flex-shrink-0" ref={currencyDropdownRef}>
                <button
                  onClick={() => setCurrencyDropdownOpen((v) => !v)}
                  className="flex items-center gap-0.5 h-9 px-3 rounded-xl bg-secondary hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-bold text-foreground">{selectedCurrency?.symbol ?? "ARS"}</span>
                  <ChevronDown size={11} className="text-muted-foreground" />
                </button>
                {currencyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-lg z-50 py-1 min-w-[130px]">
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
            )}

            {/* Chart toggle */}
            {hasChart && (
              <button
                onClick={() => setShowChart((v) => !v)}
                className={`flex-shrink-0 flex items-center h-9 px-3 rounded-xl text-xs font-medium transition-all ${
                  !showChart ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"
                }`}
              >
                {showChart ? <List size={14} /> : <BarChart2 size={14} />}
              </button>
            )}

          </div>
        )}

        {/* ── Filter panel ── */}
        {viewMode === "gastos" && (
          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out flex-shrink-0 ${showFilters ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden min-h-0">
              <div className="mx-5 mb-3 rounded-2xl bg-secondary/60 border border-border/40 overflow-hidden divide-y divide-border/40">

                {/* Labels */}
                <div className="px-4 py-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Etiquetas</p>
                  {labelFilters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {labelFilters.map(name => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground"
                        >
                          #{name}
                          <button onClick={() => toggleLabel(name)} className="opacity-70 hover:opacity-100">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <LabelInput allLabels={allLabels} labelFilters={labelFilters} onToggle={toggleLabel} />
                </div>

                {/* Description */}
                <div className="px-4 py-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Descripción</p>
                  {descFilters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {descFilters.map(term => (
                        <span
                          key={term}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground"
                        >
                          {term}
                          <button onClick={() => removeDescFilter(term)} className="opacity-70 hover:opacity-100">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={descInput}
                      onChange={(e) => setDescInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addDescFilter(); }}
                      placeholder="Agregar palabra clave..."
                      className="flex-1 h-8 px-3 rounded-xl bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/40"
                    />
                    <button
                      onClick={addDescFilter}
                      disabled={!descInput.trim()}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-background text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Date range */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fechas</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground/70 mb-0.5 block">Desde</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full h-8 px-2 rounded-xl bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground/70 mb-0.5 block">Hasta</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full h-8 px-2 rounded-xl bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtered total + clear */}
                {hasAdvancedFilter && filteredTotal && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {filteredTotal.count} resultado{filteredTotal.count !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground tabular">
                        {filteredTotal.symbol}{filteredTotal.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={clearAllFilters}
                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-full hover:bg-muted"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

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
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
}
