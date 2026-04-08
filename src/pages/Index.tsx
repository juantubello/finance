import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGastos,
  useGastosForYear,
  useGastosByCategories,
  useGastosByCategoriesForYear,
  useCategories,
  useAvailable,
  useDolarBlue,
} from "@/hooks/useApi";
import { api } from "@/services/api";
import { useForexRates } from "@/hooks/useForexRates";
import { toARS } from "@/utils/currency";
import type { GastosByCategoryResponse } from "@/types/api";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import CategoryBarChart from "@/components/CategoryBarChart";
import ExpenseRow from "@/components/ExpenseRow";
import SkeletonList from "@/components/SkeletonList";
import type { GastoResponse } from "@/types/api";
import { Search, BarChart2, List, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import PrivacyToggle from "@/components/PrivacyToggle";

const SORT_LABELS = {
  none: "Predeterminado",
  desc: "Mayor importe",
  asc: "Menor importe",
  date_desc: "Fecha ↓",
  date_asc: "Fecha ↑",
} as const;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildSearchTokens(search: string) {
  return search
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
    .map((raw) => ({
      raw,
      type: raw.startsWith("#") ? "label" as const : "text" as const,
      value: normalizeSearchValue(raw.replace(/^#+/, "")),
    }))
    .filter(token => token.value.length > 0);
}

function matchesSmartSearch(gasto: GastoResponse, tokens: ReturnType<typeof buildSearchTokens>) {
  if (tokens.length === 0) return true;

  const description = normalizeSearchValue(gasto.description);
  const category = normalizeSearchValue(gasto.category ?? "");
  const labels = gasto.labels?.map(label => normalizeSearchValue(label.name)) ?? [];

  return tokens.every((token) => {
    if (token.type === "label") {
      return labels.some(label => label.includes(token.value));
    }
    return description.includes(token.value) || category.includes(token.value);
  });
}

function formatLocalYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface Props {
  onEditGasto: (g: GastoResponse) => void;
  onMenu: () => void;
  onSettings: () => void;
  filterMode: FilterMode;
  year: number;
  month: number;
  onFilterModeChange: (mode: FilterMode) => void;
  onDateChange: (year: number, month: number) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
}

export default function Index({ onEditGasto, onMenu, onSettings, filterMode, year, month, onFilterModeChange, onDateChange, searchOpen, onSearchOpenChange }: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const mobileChartShellRef = useRef<HTMLDivElement | null>(null);
  const mobileChartFrameRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef(0);
  const lastChartMotionRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc" | "date_asc" | "date_desc">("none");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(["dates", "sort"]));
  const toggleSection = (s: string) => setCollapsedSections(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const isSectionCollapsed = (s: string, active: boolean) => !active && collapsedSections.has(s);
  const { privacyMode, toggle: togglePrivacy, mask } = usePrivacyMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pillReady, setPillReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setPillReady(true)); }, []);
  // Prefetch ingresos in the background so navigation is instant
  useEffect(() => {
    if (filterMode === "month" && year > 0 && month > 0) {
      queryClient.prefetchQuery({
        queryKey: ["ingresos", year, month],
        queryFn: () => api.getIngresos(year, month),
        staleTime: 60_000,
      });
    }
  }, [year, month, filterMode]);
  const [showChart, setShowChart] = useState(true);

  const { data: categoryDefs = [] } = useCategories();
  const { data: available } = useAvailable();
  const { data: dolarBlue } = useDolarBlue();
  const { data: forexRates } = useForexRates();

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
  const loadingCats = filterMode === "month" ? monthCatQuery.isLoading : yearCatQuery.isLoading;

  // Enrich gastos with color from categoryDefs
  const gastos = useMemo(() => {
    if (!allGastos) return undefined;
    return allGastos.map(g => ({
      ...g,
      categoryColor: g.categoryColor ?? (g.categoryId != null ? categoryColorMap.get(g.categoryId) ?? null : null),
    }));
  }, [allGastos, categoryColorMap]);


  // Build chart categories from allGastos with ARS-equivalent heights (all currencies combined)
  const { chartCategories, chartHeightAmounts } = useMemo(() => {
    if (!allGastos?.length) return { chartCategories: [] as GastosByCategoryResponse[], chartHeightAmounts: [] as number[] };
    const dolarBlueRate = dolarBlue?.compra;
    const map = new Map<string, { cat: GastosByCategoryResponse; arsTotal: number }>();
    for (const g of allGastos) {
      const arsAmount = toARS(g.amount, g.currencySymbol, forexRates, dolarBlueRate, g.currency);
      if (arsAmount === null) continue;
      const key = g.categoryId != null ? `id-${g.categoryId}` : `name-${g.category ?? "sin"}`;
      if (!map.has(key)) {
        map.set(key, {
          cat: {
            categoryId: g.categoryId ?? -1,
            categoryName: g.category ?? "Sin categoría",
            categoryDescription: null,
            categoryIcon: g.categoryIcon,
            categoryColor: g.categoryColor ?? (g.categoryId != null ? categoryColorMap.get(g.categoryId) ?? null : null),
            amount: 0,
            currencyId: 0,
            currency: "ARS",
            currencySymbol: "$",
          },
          arsTotal: 0,
        });
      }
      const entry = map.get(key)!;
      entry.arsTotal += arsAmount;
      entry.cat.amount = Math.round(entry.arsTotal);
    }
    const sorted = Array.from(map.values()).sort((a, b) => b.arsTotal - a.arsTotal);
    return {
      chartCategories: sorted.map(e => e.cat),
      chartHeightAmounts: sorted.map(e => e.arsTotal),
    };
  }, [allGastos, categoryColorMap, forexRates, dolarBlue]);

  const activeCategories = useMemo(() => {
    if (activeIndices.length === 0) return null;
    return activeIndices
      .map((i) => chartCategories[i])
      .filter(Boolean)
      .map((c) => ({ id: c.categoryId, name: c.categoryName }));
  }, [chartCategories, activeIndices]);

  const searchTokens = useMemo(() => buildSearchTokens(search), [search]);
  const hasSearchQuery = searchTokens.length > 0;

  const hasAdvancedFilter = !!dateFrom || !!dateTo;

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
    if (hasSearchQuery) {
      list = list.filter((g) => matchesSmartSearch(g, searchTokens));
    }
    if (dateFrom) {
      list = list.filter((g) => g.dateTime.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((g) => g.dateTime.slice(0, 10) <= dateTo);
    }
    if (sortOrder === "asc") list = [...list].sort((a, b) => a.amount - b.amount);
    else if (sortOrder === "desc") list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortOrder === "date_asc") list = [...list].sort((a, b) => a.dateTime.localeCompare(b.dateTime) || a.id - b.id);
    else if (sortOrder === "date_desc") list = [...list].sort((a, b) => b.dateTime.localeCompare(a.dateTime) || b.id - a.id);
    else list = [...list].sort((a, b) => b.dateTime.localeCompare(a.dateTime) || b.id - a.id);
    return list;
  }, [gastos, activeCategories, hasSearchQuery, searchTokens, dateFrom, dateTo, sortOrder]);

  const dolarBlueRate = dolarBlue?.compra;

  // Total ARS (all currencies converted) — used in the pill
  const total = useMemo(() => {
    if (!allGastos || allGastos.length === 0) return null;
    const source = (hasAdvancedFilter || hasSearchQuery || (activeCategories && activeCategories.length > 0) || sortOrder !== "none")
      ? filtered
      : allGastos;
    let arsSum = 0;
    let hasAll = true;
    for (const g of source) {
      const ars = toARS(g.amount, g.currencySymbol, forexRates, dolarBlueRate, g.currency);
      if (ars === null) { hasAll = false; continue; }
      arsSum += ars;
    }
    return { total: arsSum, approximate: !hasAll };
  }, [allGastos, filtered, hasAdvancedFilter, hasSearchQuery, activeCategories, sortOrder, forexRates, dolarBlueRate]);

  const selectedSum = useMemo(() => {
    if (!activeCategories || activeCategories.length === 0) return null;
    let sum = 0;
    for (const g of filtered) {
      const ars = toARS(g.amount, g.currencySymbol, forexRates, dolarBlueRate, g.currency);
      sum += ars ?? g.amount;
    }
    return sum;
  }, [filtered, activeCategories, forexRates, dolarBlueRate]);

  // Map categoryId/name → bar color

  const handleDateChange = (y: number, m: number) => {
    onDateChange(y, m); setActiveIndices([]);
  };
  const handleModeChange = (mode: FilterMode) => {
    onFilterModeChange(mode); setActiveIndices([]);
  };
  const handleCategorySelect = (index: number) => {
    setActiveIndices((prev) =>
      prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index]
    );
  };

  const clearAllFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setSortOrder("none");
    setActiveIndices([]);
    onSearchOpenChange(false);
  };


  const hasChart = loadingCats || chartCategories.length > 0;
  const hasActiveViewState = hasSearchQuery || hasAdvancedFilter || activeIndices.length > 0 || sortOrder !== "none";

  // Filtered total for the filter panel badge (ARS-equivalent)
  const filteredTotal = useMemo(() => {
    if (!hasActiveViewState) return null;
    let arsSum = 0;
    for (const g of filtered) {
      arsSum += toARS(g.amount, g.currencySymbol, forexRates, dolarBlueRate, g.currency) ?? g.amount;
    }
    return { total: arsSum, count: filtered.length };
  }, [filtered, hasActiveViewState, forexRates, dolarBlueRate]);

  const activeFeedback = useMemo(() => {
    const chips: string[] = [];
    for (const token of searchTokens) chips.push(token.raw);
    if (activeCategories?.length) {
      chips.push(activeCategories.length === 1 ? activeCategories[0].name : `${activeCategories.length} categorias`);
    }
    if (dateFrom || dateTo) chips.push(`${dateFrom || "inicio"} - ${dateTo || "hoy"}`);
    if (sortOrder !== "none") chips.push(`Orden: ${SORT_LABELS[sortOrder]}`);
    return chips;
  }, [searchTokens, activeCategories, dateFrom, dateTo, sortOrder]);

  // Group filtered expenses by date
  const groupedFiltered = useMemo(() => {
    const today = new Date();
    const todayKey = formatLocalYMD(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatLocalYMD(yesterday);
    const map = new Map<string, typeof filtered>();
    for (const g of filtered) {
      const key = g.dateTime.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const d = new Date(key + "T12:00:00");
      const label =
        key === todayKey ? "hoy" :
        key === yesterdayKey ? "ayer" :
        format(d, "d 'de' MMMM", { locale: es });
      let dayTotal = 0;
      for (const g of items) {
        dayTotal += toARS(g.amount, g.currencySymbol, forexRates, dolarBlueRate, g.currency) ?? g.amount;
      }
      return { label, items, dayTotal };
    });
  }, [filtered, forexRates, dolarBlueRate]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [filterMode, year, month, search, dateFrom, dateTo, sortOrder, showChart]);

  useEffect(() => {
    if (!searchOpen) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    const node = listRef.current;
    const shell = mobileChartShellRef.current;
    if (!node || !shell) return;

    const applyMotion = (scrollTop: number) => {
      const progress = Math.min(Math.max((scrollTop - 2) / 150, 0), 1);
      if (lastChartMotionRef.current === progress) return;
      lastChartMotionRef.current = progress;

      shell.style.setProperty("--chart-drain-progress", progress.toFixed(4));
      shell.style.opacity = String(1 - progress * 0.24);
      shell.style.transform = `translate3d(0, ${progress * 8}px, 0) scale(${1 - progress * 0.03})`;
    };

    const flushScroll = () => {
      applyMotion(pendingScrollTopRef.current);
      mobileChartFrameRef.current = null;
    };

    const onScroll = () => {
      pendingScrollTopRef.current = node.scrollTop;
      if (mobileChartFrameRef.current !== null) return;
      mobileChartFrameRef.current = requestAnimationFrame(flushScroll);
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    applyMotion(node.scrollTop);

    return () => {
      node.removeEventListener("scroll", onScroll);
      if (mobileChartFrameRef.current !== null) {
        cancelAnimationFrame(mobileChartFrameRef.current);
        mobileChartFrameRef.current = null;
      }
    };
  }, [showChart, filterMode, year, month, search, dateFrom, dateTo, sortOrder, activeIndices.length]);

  return (
    <div className="flex flex-col h-[100dvh] lg:flex-row lg:bg-muted/30 animate-page-from-left">

      {/* ── Left panel (top on mobile, sidebar on desktop) ── */}
      <div className="flex-shrink-0 lg:w-1/2 lg:h-full lg:flex lg:flex-col lg:border-r lg:border-border lg:overflow-y-auto lg:bg-background">
        <DateFilter
          mode={filterMode}
          year={year}
          month={month}
          onModeChange={handleModeChange}
          onChange={handleDateChange}
          onMenu={onMenu}
          onSettings={onSettings}
          extraAction={<PrivacyToggle privacyMode={privacyMode} onToggle={togglePrivacy} />}
        />

        {/* Disponible */}
        <div className="px-5 pb-2 flex flex-col items-center text-center">
          {loadingGastos ? (
            <div className="space-y-2">
              <div className="h-4 w-20 bg-secondary rounded animate-pulse mx-auto" />
              <div className="h-10 w-48 bg-secondary rounded-lg animate-pulse mx-auto" />
              <div className="h-7 w-44 bg-secondary rounded-full animate-pulse mx-auto mt-1" />
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <p className="text-xs text-muted-foreground mb-0.5">Disponible</p>
              <div className="flex items-baseline gap-2 justify-center mb-2">
                <span className={`text-5xl font-bold tracking-tighter tabular ${available && available.disponible < 0 ? "text-red-500" : "text-foreground"}`}>
                  ${mask((available?.disponible ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0 }))}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {available?.moneda ?? "ARS"}
                </span>
              </div>
              {/* Segmented control — always rendered so pillReady animation always fires */}
              <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 overflow-hidden w-full max-w-xs">
                <button
                  style={{ flexGrow: pillReady ? 62 : 50, transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)" }}
                  className="py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 bg-[#ff5c4d] text-white shadow-sm"
                >
                  {total
                    ? `${total.approximate ? "≈ " : ""}$${mask(total.total.toLocaleString("es-AR", { minimumFractionDigits: 0 }))} ARS`
                    : "— Gastos"}
                </button>
                <button
                  onClick={() => navigate("/ingresos")}
                  style={{ flexGrow: pillReady ? 38 : 50, transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)" }}
                  className="py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  + Ingresos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chart — desktop sidebar only; on mobile it lives inside the scroll container */}
        <div className={`hidden lg:grid transition-[grid-template-rows] duration-400 ease-in-out ${showChart ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden min-h-0">
            <div className="origin-top">
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
              ) : chartCategories.length > 0 ? (
                <CategoryBarChart categories={chartCategories} activeIndices={activeIndices} onSelect={handleCategorySelect} privacyMode={privacyMode} heightAmounts={chartHeightAmounts} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel (bottom on mobile, main content on desktop) ── */}
      <div className="flex-1 flex flex-col min-h-0 lg:h-full lg:bg-background relative">

        {/* Desktop controls */}
        {(
          <div className="hidden lg:flex items-center gap-2 px-5 py-2 flex-shrink-0">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar gasto, categoria o #label"
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

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
                  {(dateFrom || dateTo ? 1 : 0) + (sortOrder !== "none" ? 1 : 0)}
                </span>
              )}
            </button>

          </div>
        )}

        {/* ── Filter panel — absolute overlay ── */}
        {showFilters && (
          <div className="absolute left-5 right-5 top-4 lg:top-[52px] z-30 shadow-xl rounded-2xl bg-secondary border border-border/60 overflow-hidden divide-y divide-border/60">

                {/* Date range */}
                <div className="px-4 py-2 border-t border-border/60">
                  <button onClick={() => toggleSection("dates")} className="w-full flex items-center justify-between py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Fechas {(dateFrom || dateTo) && <span className="text-primary">•</span>}</span>
                    <ChevronDown size={13} className={`transition-transform ${isSectionCollapsed("dates", !!(dateFrom || dateTo)) ? "" : "rotate-180"}`} />
                  </button>
                  {!isSectionCollapsed("dates", !!(dateFrom || dateTo)) && (
                    <div className="grid grid-cols-2 gap-4 pb-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground/70 mb-0.5 block">Desde</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-8 px-0 rounded-xl bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground/70 mb-0.5 block">Hasta</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-8 px-0 rounded-xl bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort order */}
                <div className="px-4 py-2 border-t border-border/60">
                  <button onClick={() => toggleSection("sort")} className="w-full flex items-center justify-between py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Ordenar {sortOrder !== "none" && <span className="text-primary">•</span>}</span>
                    <ChevronDown size={13} className={`transition-transform ${isSectionCollapsed("sort", sortOrder !== "none") ? "" : "rotate-180"}`} />
                  </button>
                  {!isSectionCollapsed("sort", sortOrder !== "none") && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                      {(["none", "desc", "asc", "date_desc", "date_asc"] as const).map((opt) => {
                        return (
                          <button key={opt} onClick={() => setSortOrder(opt)} className={`h-7 px-3 rounded-full text-[11px] font-semibold transition-all ${sortOrder === opt ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                            {SORT_LABELS[opt]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Filtered total + clear */}
                {hasActiveViewState && filteredTotal && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {filteredTotal.count} resultado{filteredTotal.count !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground tabular">
                        ${filteredTotal.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })} ARS
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
        )}

        <div className="px-5 pb-2 flex flex-wrap items-center gap-2">
          {hasChart && (
            <button
              onClick={() => setShowChart((v) => !v)}
              className={`inline-flex items-center h-8 px-3 rounded-full text-[11px] font-semibold transition-all ${
                showChart ? "bg-secondary text-muted-foreground hover:bg-muted" : "bg-primary text-primary-foreground"
              }`}
            >
              {showChart ? "Ocultar grafico" : "Ver grafico"}
            </button>
          )}
          {filteredTotal && (
            <span className={`inline-flex items-center h-8 px-3 rounded-full text-[11px] font-semibold shadow-subtle ${
              selectedSum !== null
                ? "bg-primary/12 text-primary ring-1 ring-primary/20"
                : "bg-white/90 text-foreground dark:bg-secondary/90"
            }`}>
              {filteredTotal.count} gasto{filteredTotal.count !== 1 ? "s" : ""} · ${filteredTotal.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })} ARS
            </span>
          )}
          {activeFeedback.slice(0, 4).map((chip) => (
            <span key={chip} className="inline-flex items-center h-8 px-3 rounded-full bg-card/90 text-[11px] font-medium text-muted-foreground shadow-subtle">
              {chip}
            </span>
          ))}
          {hasActiveViewState && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center h-8 px-3 rounded-full text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* ── Scrollable list ── */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Mobile: chart inside scroll so it disappears naturally when scrolling down */}
          {showChart && (
            <div
              ref={mobileChartShellRef}
              className="lg:hidden origin-top will-change-[transform,opacity] transition-transform duration-150 ease-out"
              style={{
                opacity: 1,
                transform: "translate3d(0, 0, 0) scale(1)",
                ["--chart-drain-progress" as string]: "0",
              }}
            >
              <div className="pb-1">
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
                ) : chartCategories.length > 0 ? (
                  <CategoryBarChart categories={chartCategories} activeIndices={activeIndices} onSelect={handleCategorySelect} privacyMode={privacyMode} heightAmounts={chartHeightAmounts} />
                ) : null}
              </div>
            </div>
          )}
          {errorGastos ? (
            <div className="mx-5 mt-2 p-4 rounded-2xl bg-expense/10 text-expense text-sm">
              Error al cargar los gastos. Verificá tu conexión.
            </div>
          ) : loadingGastos ? (
            <SkeletonList />
          ) : (
            <div className="animate-fade-in space-y-1">
              {groupedFiltered.map(({ label, items, dayTotal }) => (
                <div key={label}>
                  <div className="sticky top-0 z-10 px-5 py-2 flex items-center justify-between bg-transparent">
                    <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-card/90 text-[10px] font-medium lowercase text-muted-foreground shadow-subtle dark:bg-secondary/90">
                      {label}
                    </span>
                    <span className="inline-flex items-center h-7 px-3 rounded-full bg-card/90 text-[10px] font-semibold text-muted-foreground tabular shadow-subtle dark:bg-secondary/90">
                      {privacyMode ? "—" : `-$ ${dayTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  {items.map((g) => (
                    <ExpenseRow key={g.id} gasto={g} onClick={() => onEditGasto(g)} forexRates={forexRates} dolarBlueRate={dolarBlueRate} privacyMode={privacyMode} />
                  ))}
                </div>
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
          <div className={`transition-all ${searchOpen ? "h-36" : "h-28"}`} />
        </div>

        {searchOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+84px)] lg:hidden pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 rounded-[28px] border border-white/70 bg-card/82 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-card/88">
              <Search size={18} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar gasto, categoria o #label"
                className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/45"
              />
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                  showFilters || hasAdvancedFilter || sortOrder !== "none"
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground"
                }`}
                aria-label="Configurar busqueda"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                onClick={() => {
                  if (search.trim()) setSearch("");
                  else onSearchOpenChange(false);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-muted-foreground"
                aria-label={search.trim() ? "Limpiar busqueda" : "Cerrar busqueda"}
              >
                <X size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
