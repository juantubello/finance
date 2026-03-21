import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Upload, CreditCard, FileText, ChevronDown, ChevronUp, SlidersHorizontal, X, Search, Trash2, Check, Loader2 } from "lucide-react";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import PrivacyToggle from "@/components/PrivacyToggle";
import CategoryBarChart from "@/components/CategoryBarChart";
import SkeletonList from "@/components/SkeletonList";
import StatementUploadModal from "@/components/StatementUploadModal";
import PdfViewerModal from "@/components/PdfViewerModal";
import { useCardStatement, useCardExpenses, useDeleteStatement, useCardCategoryRules, useCardCategories, useLogoRules } from "@/hooks/useApi";
import { api } from "@/services/api";
import type { CardExpense, CardStatement, GastosByCategoryResponse, CardCategoryRuleDto, CardCategoryDto } from "@/types/api";

type CardType = "VISA" | "MASTERCARD";
type CardholderFilter = "Todos" | "Juan" | "Camila";
type CurrencyFilter = "Todos" | "ARS" | "USD";
type InstallmentMode = "todos" | "cuotas" | "unicos" | "liberar";

interface Props {
  onMenu: () => void;
  onSettings: () => void;
  filterMode: FilterMode;
  year: number;
  month: number;
  onFilterModeChange: (mode: FilterMode) => void;
  onDateChange: (year: number, month: number) => void;
}

// ─── Expense detail sheet ─────────────────────────────────────────────────────

function ExpenseDetailSheet({ expense, statement, onClose }: {
  expense: CardExpense;
  statement: CardStatement;
  onClose: () => void;
}) {
  const categoryColor = expense.categoryColor ?? "#e5e7eb";
  const isUsd = expense.amountUsd != null;
  const arsEquiv = isUsd && expense.amountUsd != null
    ? Math.round(expense.amountUsd * statement.exchangeRateUsd / 100)
    : null;

  const amountDisplay = expense.amountArs != null
    ? { primary: `$ ${(expense.amountArs / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, label: "ARS" }
    : expense.amountUsd != null
    ? { primary: `USD ${(expense.amountUsd / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, label: "USD" }
    : { primary: "—", label: "" };

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-xl px-6 pt-5 pb-10 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: expense.logoUrl ? "transparent" : categoryColor + "33" }}
            >
              {expense.logoUrl
                ? <img src={expense.logoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                : expense.categoryIcon || "💳"
              }
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground leading-tight">{expense.description}</p>
              {expense.categoryName && (
                <span
                  className="inline-block text-[10px] font-semibold px-1.5 py-px rounded-full mt-0.5"
                  style={{ backgroundColor: categoryColor, color: "#374151" }}
                >
                  {expense.categoryName}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors flex-shrink-0 ml-2">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Amount */}
        <div className="rounded-2xl bg-expense/5 border border-expense/20 px-4 py-3 mb-4 text-center">
          <p className="text-2xl font-bold text-expense tabular">- {amountDisplay.primary}</p>
          {arsEquiv != null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ≈ $ {(arsEquiv / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS
              <span className="ml-1 opacity-60">(TC {(statement.exchangeRateUsd / 100).toLocaleString("es-AR")})</span>
            </p>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <DetailItem label="Fecha" value={format(new Date(expense.date + "T12:00:00"), "dd/MM/yyyy")} />
          <DetailItem label="Titular" value={expense.cardholderName} />
          <DetailItem label="Tarjeta" value={statement.cardType} />
          {expense.installmentNumber != null && expense.installmentTotal != null && (
            <DetailItem label="Cuota" value={`${expense.installmentNumber} de ${expense.installmentTotal}`} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

// ─── Expense row ──────────────────────────────────────────────────────────────

function CardExpenseRow({ expense, exchangeRateUsd, onClick }: { expense: CardExpense; exchangeRateUsd?: number; onClick: () => void }) {
  const categoryColor = expense.categoryColor ?? "#e5e7eb";
  const isUsd = expense.amountUsd != null;
  const amountDisplay = expense.amountArs != null
    ? `$ ${(expense.amountArs / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
    : isUsd
    ? `USD ${(expense.amountUsd! / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
    : "—";
  const arsEquiv = isUsd && expense.amountUsd != null && exchangeRateUsd
    ? Math.round(expense.amountUsd * exchangeRateUsd / 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 px-4 border-b border-border/40 active:bg-secondary/60 transition-colors text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
          {expense.logoUrl
            ? <img src={expense.logoUrl} alt="" className="w-full h-full object-cover" />
            : expense.categoryIcon
            ? <span>{expense.categoryIcon}</span>
            : <span>💳</span>
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 flex-wrap mb-0.5">
            <span
              className={`inline-block text-[9px] font-semibold px-1.5 py-px rounded-full ${
                expense.categoryName ? "" : "bg-secondary text-muted-foreground"
              }`}
              style={expense.categoryName ? { backgroundColor: categoryColor, color: "#374151" } : undefined}
            >
              {expense.categoryName ?? "Sin categoría"}
            </span>
            <span className={`text-[9px] font-semibold px-1.5 py-px rounded-full ${
              expense.cardholderName === "Juan"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                : expense.cardholderName === "Camila"
                ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                : "bg-secondary text-muted-foreground"
            }`}>
              {expense.cardholderName}
            </span>
            {expense.installmentNumber != null && expense.installmentTotal != null && (
              <span className="text-[9px] font-semibold px-1.5 py-px rounded-full bg-primary/10 text-primary">
                {expense.installmentNumber}/{expense.installmentTotal}
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-foreground truncate">{expense.description}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(expense.date + "T12:00:00"), "dd/MM/yyyy")}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 ml-3">
        <span className="text-sm font-semibold tabular text-expense">- {amountDisplay}</span>
        {arsEquiv != null && (
          <span className="text-[10px] text-muted-foreground tabular">
            ≈ $ {(arsEquiv / 100).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
          </span>
        )}
      </div>
    </button>
  );
}

function groupByDate(expenses: CardExpense[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const map = new Map<string, CardExpense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const d = new Date(key + "T12:00:00");
    const label =
      d.getTime() === today.getTime() ? "Hoy" :
      d.getTime() === yesterday.getTime() ? "Ayer" :
      format(d, "d 'de' MMMM", { locale: es });
    return { label, items };
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tarjetas({ onMenu, onSettings, filterMode, year, month, onFilterModeChange, onDateChange }: Props) {
  const [cardType, setCardType] = useState<CardType>("VISA");
  const [cardholderFilter, setCardholderFilter] = useState<CardholderFilter>("Todos");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("Todos");
  const [installmentMode, setInstallmentMode] = useState<InstallmentMode>("todos");
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc" | "date_asc" | "date_desc">("none");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(["dates", "installment", "sort"]));
  const toggleSection = (s: string) => setCollapsedSections(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const isSectionCollapsed = (s: string, active: boolean) => !active && collapsedSections.has(s);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [headerCollapsed, setHeaderCollapsed] = useState(true);
  const [chartCollapsed, setChartCollapsed] = useState(true);
  const [pillReady, setPillReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setPillReady(true)); }, []);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<CardExpense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: statement, isLoading: loadingStatement } = useCardStatement(cardType, year, month);
  const deleteMut = useDeleteStatement();
  const { data: cardCategoryRules = [] } = useCardCategoryRules();
  const { data: cardCategories = [] } = useCardCategories();
  const { data: logoRules = [] } = useLogoRules();

  useEffect(() => { setConfirmDelete(false); }, [statement?.id]);

  const handleDeleteStatement = () => {
    if (!statement) return;
    deleteMut.mutate(statement.id, {
      onSuccess: () => setConfirmDelete(false),
      onError: (err) => console.error("Error eliminando resumen:", err),
    });
  };
  const { data: allExpenses = [], isLoading: loadingExpenses } = useCardExpenses(statement?.id);
  const isLoading = loadingStatement || (!!statement && loadingExpenses);

  // ── Client-side rule application ─────────────────────────────────────────
  // Rules are applied by the backend at parse time. Expenses uploaded before a rule
  // was created have categoryId=null. We resolve those client-side so the chart
  // and rows always reflect the latest rules without re-uploading the statement.
  const catMap = useMemo(() => {
    const m = new Map<number, CardCategoryDto>();
    cardCategories.forEach(c => m.set(c.id, c));
    return m;
  }, [cardCategories]);

  const sortedRules = useMemo(
    () => [...cardCategoryRules].sort((a, b) => a.priority - b.priority),
    [cardCategoryRules]
  );

  // Logo rules sorted by priority descending (higher priority wins)
  const sortedLogoRules = useMemo(
    () => [...logoRules].sort((a, b) => b.priority - a.priority),
    [logoRules]
  );

  const resolvedExpenses = useMemo((): CardExpense[] => {
    return allExpenses.map(e => {
      const desc = e.description.toLowerCase();

      // Apply category rules for uncategorised expenses
      let resolved = e;
      if (e.categoryId === null) {
        for (const rule of sortedRules) {
          if (desc.includes(rule.keyword.toLowerCase())) {
            const cat = catMap.get(rule.categoryId);
            resolved = {
              ...e,
              categoryId: rule.categoryId,
              categoryName: rule.categoryName,
              categoryColor: cat?.color ?? null,
              categoryIcon: null,
            };
            break;
          }
        }
      }

      // Apply logo rules if no categoryIcon already set
      if (!resolved.categoryIcon) {
        for (const rule of sortedLogoRules) {
          if (desc.includes(rule.keyword.toLowerCase())) {
            resolved = { ...resolved, logoUrl: rule.logoUrl };
            break;
          }
        }
      }

      return resolved;
    });
  }, [allExpenses, sortedRules, sortedLogoRules, catMap]);

  const filteredExpenses = useMemo(() => {
    let list = resolvedExpenses;
    if (cardholderFilter !== "Todos") list = list.filter(e => e.cardholderName === cardholderFilter);
    if (currencyFilter === "ARS") list = list.filter(e => e.amountArs != null);
    if (currencyFilter === "USD") list = list.filter(e => e.amountUsd != null);
    if (search.trim()) {
      const terms = search.toLowerCase().split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
      list = list.filter(e => terms.some(t => e.description.toLowerCase().includes(t)));
    }
    if (dateFrom) list = list.filter(e => e.date.slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter(e => e.date.slice(0, 10) <= dateTo);
    if (installmentMode === "cuotas") list = list.filter(e => e.installmentNumber != null && e.installmentTotal != null);
    if (installmentMode === "unicos") list = list.filter(e => e.installmentNumber == null || e.installmentTotal == null);
    if (installmentMode === "liberar") list = list.filter(e => e.installmentNumber != null && e.installmentTotal != null && e.installmentNumber === e.installmentTotal);
    if (sortOrder === "asc") list = [...list].sort((a, b) => (a.amountArs ?? a.amountUsd ?? 0) - (b.amountArs ?? b.amountUsd ?? 0));
    else if (sortOrder === "desc") list = [...list].sort((a, b) => (b.amountArs ?? b.amountUsd ?? 0) - (a.amountArs ?? a.amountUsd ?? 0));
    else if (sortOrder === "date_asc") list = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    else if (sortOrder === "date_desc") list = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    else list = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return list;
  }, [resolvedExpenses, cardholderFilter, currencyFilter, search, dateFrom, dateTo, installmentMode, sortOrder]);

  const chartCategories = useMemo((): GastosByCategoryResponse[] => {
    if (!statement) return [];
    const map = new Map<string, { cat: GastosByCategoryResponse; totalCentavos: number }>();
    for (const e of filteredExpenses) {
      const arsAmount = e.amountArs != null ? e.amountArs
        : e.amountUsd != null ? Math.round(e.amountUsd * statement.exchangeRateUsd / 100) : 0;
      const key = String(e.categoryId ?? "_null");
      const existing = map.get(key);
      if (existing) {
        existing.totalCentavos += arsAmount;
        existing.cat.amount = existing.totalCentavos / 100;
      } else {
        map.set(key, {
          totalCentavos: arsAmount,
          cat: {
            categoryId: e.categoryId ?? 0,
            categoryName: e.categoryName ?? "Sin categoría",
            categoryDescription: null,
            categoryIcon: e.categoryIcon,
            categoryColor: e.categoryColor,
            amount: arsAmount / 100,
            currencyId: 1,
            currency: "ARS",
            currencySymbol: "$",
          },
        });
      }
    }
    return Array.from(map.values())
      .filter(({ cat }) => cat.amount > 0)
      .sort((a, b) => b.cat.amount - a.cat.amount)
      .map(({ cat }) => cat);
  }, [filteredExpenses, statement]);

  const chartLogoUrls = useMemo(
    () => chartCategories.map(cat => catMap.get(cat.categoryId)?.logoUrl ?? null),
    [chartCategories, catMap]
  );

  const activeCategories = useMemo(() => {
    if (activeIndices.length === 0) return null;
    return activeIndices.map(i => chartCategories[i]).filter(Boolean);
  }, [chartCategories, activeIndices]);

  const filtered = useMemo(() => {
    if (!activeCategories || activeCategories.length === 0) return filteredExpenses;
    return filteredExpenses.filter(e =>
      activeCategories.some(ac =>
        (ac.categoryId !== 0 && e.categoryId != null && ac.categoryId === e.categoryId) ||
        (ac.categoryName && e.categoryName && ac.categoryName === e.categoryName)
      )
    );
  }, [filteredExpenses, activeCategories]);

  const filteredTotals = useMemo(() => ({
    ars: filtered.reduce((s, e) => s + (e.amountArs ?? 0), 0) / 100,
    usd: filtered.reduce((s, e) => s + (e.amountUsd ?? 0), 0) / 100,
    count: filtered.length,
  }), [filtered]);

  const totals = useMemo(() => ({
    ars: allExpenses.reduce((s, e) => s + (e.amountArs ?? 0), 0) / 100,
    usd: allExpenses.reduce((s, e) => s + (e.amountUsd ?? 0), 0) / 100,
  }), [allExpenses]);

  const hasActiveFilters = cardholderFilter !== "Todos" || currencyFilter !== "Todos" ||
    search.trim() !== "" || dateFrom !== "" || dateTo !== "" ||
    installmentMode !== "todos" || activeIndices.length > 0 || sortOrder !== "none";

  const activeFilterCount = [
    cardholderFilter !== "Todos",
    currencyFilter !== "Todos",
    search.trim() !== "",
    dateFrom !== "",
    dateTo !== "",
    installmentMode !== "todos",
    activeIndices.length > 0,
    sortOrder !== "none",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCardholderFilter("Todos");
    setCurrencyFilter("Todos");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setInstallmentMode("todos");
    setActiveIndices([]);
    setSortOrder("none");
  };

  const handleCategorySelect = (index: number) => {
    setActiveIndices(prev => prev.includes(index) ? prev.filter(x => x !== index) : [...prev, index]);
  };

  const { privacyMode, toggle: togglePrivacy, mask } = usePrivacyMode();

  const chip = (active: boolean) =>
    `px-3 py-1 text-xs font-semibold rounded-full transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-muted"}`;

  return (
    <>
      <div className="flex flex-col h-[100dvh] lg:flex-row lg:bg-muted/30 animate-page-from-left">

        {/* ── Left panel ── */}
        <div className="flex-shrink-0 lg:w-1/2 lg:h-full lg:flex lg:flex-col lg:border-r lg:border-border lg:overflow-y-auto lg:bg-background">
          <DateFilter
            mode={filterMode} year={year} month={month}
            onModeChange={onFilterModeChange} onChange={onDateChange}
            onMenu={onMenu} onSettings={onSettings}
            extraAction={<PrivacyToggle privacyMode={privacyMode} onToggle={togglePrivacy} />}
          />

          {/* VISA / MC tabs */}
          <div className="px-5 pb-2">
            <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 gap-0.5">
              <button
                onClick={() => { setCardType("VISA"); setActiveIndices([]); }}
                className={`py-2.5 rounded-full flex items-center justify-center flex-shrink-0 min-w-0 ${
                  cardType === "VISA" ? "shadow-sm" : "opacity-40 hover:opacity-70"
                }`}
                style={{
                  flexGrow: pillReady ? (cardType === "VISA" ? 62 : 38) : 50,
                  transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)",
                  background: cardType === "VISA" ? "linear-gradient(135deg, #1A1F71 0%, #1565C0 100%)" : "transparent",
                }}
              >
                <svg viewBox="0 0 80 26" className="h-4 w-auto" fill="none">
                  <path d="M31.7 0.8L20.6 25.2H13.4L7.9 6.3C7.6 5.2 7.3 4.8 6.4 4.3C4.9 3.5 2.4 2.7 0.2 2.2L0.4 0.8H12C13.6 0.8 15 1.9 15.4 3.7L18.3 18.6L25.4 0.8H31.7ZM57.1 17.1C57.1 11 48.9 10.7 49 8C49 7.2 49.8 6.3 51.5 6.1C52.3 6 54.7 5.9 57.4 7.2L58.5 1.9C57 1.3 55.1 0.7 52.7 0.7C46.8 0.7 42.6 3.8 42.6 8.4C42.5 11.8 45.6 13.7 47.9 14.8C50.3 16 51.1 16.7 51.1 17.8C51.1 19.4 49.2 20.1 47.4 20.1C44.4 20.1 42.7 19.3 41.3 18.6L40.2 24.1C41.7 24.8 44.5 25.4 47.4 25.4C53.7 25.4 57.8 22.3 57.8 17.4L57.1 17.1ZM73.5 25.2H79.1L74.2 0.8H69C67.6 0.8 66.4 1.6 65.9 2.9L57.1 25.2H63.4L64.7 21.6H72.4L73.5 25.2ZM66.4 16.5L69.5 7.8L71.3 16.5H66.4ZM40.2 0.8L35.1 25.2H29.1L34.2 0.8H40.2Z" fill={cardType === "VISA" ? "white" : "currentColor"} className={cardType === "VISA" ? "" : "text-foreground"} />
                </svg>
              </button>

              <button
                onClick={() => { setCardType("MASTERCARD"); setActiveIndices([]); }}
                className={`py-2.5 rounded-full flex items-center justify-center flex-shrink-0 min-w-0 ${
                  cardType === "MASTERCARD" ? "shadow-sm" : "opacity-40 hover:opacity-70"
                }`}
                style={{
                  flexGrow: pillReady ? (cardType === "MASTERCARD" ? 62 : 38) : 50,
                  transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)",
                  background: cardType === "MASTERCARD" ? "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" : "transparent",
                }}
              >
                <svg viewBox="0 0 50 30" className="h-5 w-auto">
                  <circle cx="18" cy="15" r="13" fill="#EB001B" />
                  <circle cx="32" cy="15" r="13" fill="#F79E1B" />
                  <path d="M25 4.8a13 13 0 0 1 0 20.4A13 13 0 0 1 25 4.8z" fill="#FF5F00" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collapsed summary card — shown when both header and chart are hidden */}
          {headerCollapsed && chartCollapsed && statement && (
            <div className="mx-5 mb-3 rounded-2xl bg-secondary/60 border border-border/40 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex gap-5 text-sm">
                {totals.ars > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">ARS</p>
                    <p className="font-bold text-sky-500 whitespace-nowrap">${mask(totals.ars.toLocaleString("es-AR", { minimumFractionDigits: 2 }))}</p>
                  </div>
                )}
                {totals.usd > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">USD</p>
                    <p className="font-bold text-emerald-500">${mask(totals.usd.toLocaleString("es-AR", { minimumFractionDigits: 2 }))}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => setHeaderCollapsed(false)} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown size={12} /> Ver cabecera
                </button>
                <button onClick={() => setChartCollapsed(false)} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown size={12} /> Ver gráfico
                </button>
              </div>
            </div>
          )}

          {/* Toggle buttons row — always visible when statement exists and not both collapsed */}
          {(statement || loadingStatement) && !(headerCollapsed && chartCollapsed) && (
            <div className="px-5 pb-1 flex justify-end gap-3">
              <button
                onClick={() => setHeaderCollapsed(v => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {headerCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                {headerCollapsed ? "Ver cabecera" : "Ocultar cabecera"}
              </button>
              {chartCategories.length > 0 && (
                <button
                  onClick={() => setChartCollapsed(v => !v)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {chartCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  {chartCollapsed ? "Ver gráfico" : "Ocultar gráfico"}
                </button>
              )}
            </div>
          )}
          {!headerCollapsed && (
            <>
              {loadingStatement ? (
                <div className="mx-5 mb-3 h-24 rounded-2xl bg-secondary/60 animate-pulse" />
              ) : statement ? (
                <div className="mx-5 mb-3 rounded-2xl bg-secondary/40 border border-border/40 px-4 py-3 space-y-2">
                  <div className="flex gap-6 text-xs">
                    {totals.ars > 0 && (
                      <div>
                        <p className="text-muted-foreground">Total ARS</p>
                        <p className="font-bold text-sky-500 text-base">$ {mask(totals.ars.toLocaleString("es-AR", { minimumFractionDigits: 2 }))}</p>
                      </div>
                    )}
                    {totals.usd > 0 && (
                      <div>
                        <p className="text-muted-foreground">Total USD</p>
                        <p className="font-bold text-emerald-500 text-base">USD {mask(totals.usd.toLocaleString("es-AR", { minimumFractionDigits: 2 }))}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border/40 pt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div>
                      <p className="text-muted-foreground">Cierre</p>
                      <p className="font-semibold">{format(new Date(statement.closeDate + "T12:00:00"), "dd/MM/yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vencimiento</p>
                      <p className="font-semibold">{format(new Date(statement.dueDate + "T12:00:00"), "dd/MM/yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Próx. cierre</p>
                      <p className="font-medium">{format(new Date(statement.nextCloseDate + "T12:00:00"), "dd/MM/yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Próx. vencimiento</p>
                      <p className="font-medium">{format(new Date(statement.nextDueDate + "T12:00:00"), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                  <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2">
                    {statement.pdfPath && (
                      <button
                        onClick={() => setPdfOpen(true)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <FileText size={13} />
                        <span className="truncate">Resumen_{statement.cardType}_{statement.statementYear}_{String(statement.statementMonth).padStart(2, "0")}.pdf</span>
                      </button>
                    )}
                    <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                      {confirmDelete ? (
                        <>
                          <button
                            onClick={handleDeleteStatement}
                            disabled={deleteMut.isPending}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deleteMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-2 py-1 rounded-lg bg-secondary text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                          Eliminar resumen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : !loadingStatement && (
                <div className="mx-5 mb-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 flex flex-col items-center gap-2 text-center">
                  <CreditCard size={28} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No hay resumen para este período</p>
                </div>
              )}
            </>
          )}

          {chartCategories.length > 0 && !chartCollapsed && (
            <CategoryBarChart
              categories={chartCategories}
              activeIndices={activeIndices}
              privacyMode={privacyMode}
              onSelect={handleCategorySelect}
              logoUrls={chartLogoUrls}
            />
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col min-h-0 lg:h-full lg:bg-background">

          {/* Filter bar */}
          <div className="flex-shrink-0 px-4 py-2 relative z-20">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Cardholder */}
              <div className="flex gap-1">
                {(["Todos", "Juan", "Camila"] as CardholderFilter[]).map(f => (
                  <button key={f} onClick={() => setCardholderFilter(f)} className={chip(cardholderFilter === f)}>{f}</button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              {/* Currency */}
              <div className="flex gap-1">
                {(["Todos", "ARS", "USD"] as CurrencyFilter[]).map(f => (
                  <button key={f} onClick={() => setCurrencyFilter(f)} className={chip(currencyFilter === f)}>{f}</button>
                ))}
              </div>
              {/* Filter toggle */}
              <button
                onClick={() => setFilterOpen(v => !v)}
                className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filterOpen || activeFilterCount > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-muted"
                }`}
              >
                <SlidersHorizontal size={13} />
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
            </div>

            {/* Expanded filter panel — absolute overlay, doesn't push list down */}
            {filterOpen && (
              <div className="absolute left-4 right-4 top-full z-30 shadow-xl rounded-2xl bg-secondary border border-border/60 overflow-hidden divide-y divide-border/60">
                {/* Search — always visible */}
                <div className="p-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="uber, cabify, netflix..."
                      className="w-full h-9 pl-9 pr-3 rounded-xl bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                {/* Date range */}
                <div className="px-3 py-2">
                  <button onClick={() => toggleSection("dates")} className="w-full flex items-center justify-between py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Fechas {(dateFrom || dateTo) && <span className="text-primary">•</span>}</span>
                    <ChevronDown size={13} className={`transition-transform ${isSectionCollapsed("dates", !!(dateFrom || dateTo)) ? "" : "rotate-180"}`} />
                  </button>
                  {!isSectionCollapsed("dates", !!(dateFrom || dateTo)) && (
                    <div className="grid grid-cols-2 gap-4 pb-1">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Desde</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full h-9 px-0 rounded-xl bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Hasta</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full h-9 px-0 rounded-xl bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  )}
                </div>
                {/* Installment mode */}
                <div className="px-3 py-2">
                  <button onClick={() => toggleSection("installment")} className="w-full flex items-center justify-between py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Tipo de consumo {installmentMode !== "todos" && <span className="text-primary">•</span>}</span>
                    <ChevronDown size={13} className={`transition-transform ${isSectionCollapsed("installment", installmentMode !== "todos") ? "" : "rotate-180"}`} />
                  </button>
                  {!isSectionCollapsed("installment", installmentMode !== "todos") && (
                    <div className="flex flex-wrap gap-1 pb-1">
                      {([["todos", "Todos"], ["cuotas", "Solo cuotas"], ["unicos", "Solo únicos"], ["liberar", "Cuotas a liberar"]] as [InstallmentMode, string][]).map(([mode, label]) => (
                        <button key={mode} onClick={() => setInstallmentMode(mode)} className={chip(installmentMode === mode)}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Sort order */}
                <div className="px-3 py-2">
                  <button onClick={() => toggleSection("sort")} className="w-full flex items-center justify-between py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Ordenar {sortOrder !== "none" && <span className="text-primary">•</span>}</span>
                    <ChevronDown size={13} className={`transition-transform ${isSectionCollapsed("sort", sortOrder !== "none") ? "" : "rotate-180"}`} />
                  </button>
                  {!isSectionCollapsed("sort", sortOrder !== "none") && (
                    <div className="flex flex-wrap gap-1 pb-1">
                      {(["none", "desc", "asc", "date_desc", "date_asc"] as const).map((opt) => {
                        const labels: Record<typeof opt, string> = { none: "Predeterminado", desc: "Mayor importe", asc: "Menor importe", date_desc: "Fecha ↓", date_asc: "Fecha ↑" };
                        return (
                          <button key={opt} onClick={() => setSortOrder(opt)} className={chip(sortOrder === opt)}>{labels[opt]}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Clear */}
                {hasActiveFilters && (
                  <div className="px-3 py-2">
                    <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <X size={12} /> Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Filtered sum — always visible when filters change results */}
            {hasActiveFilters && allExpenses.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/60 text-xs">
                <span className="text-muted-foreground font-medium">{filteredTotals.count} gastos</span>
                {filteredTotals.ars > 0 && (
                  <span className="text-muted-foreground">ARS <span className="font-bold text-sky-500">$ {filteredTotals.ars.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></span>
                )}
                {filteredTotals.usd > 0 && (
                  <span className="text-muted-foreground">USD <span className="font-bold text-emerald-500">{filteredTotals.usd.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></span>
                )}
              </div>
            )}
          </div>

          {/* Expense list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <SkeletonList />
            ) : !statement ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                <CreditCard size={48} className="text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Subí el PDF del resumen para ver los gastos de este período.</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Upload size={16} />
                  Subir resumen
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No hay gastos con los filtros aplicados.</p>
            ) : (
              <div className="animate-fade-in">
                {/* Mobile */}
                <div className="lg:hidden">
                  {filtered.map(e => (
                    <CardExpenseRow key={e.id} expense={e} exchangeRateUsd={statement?.exchangeRateUsd} onClick={() => setSelectedExpense(e)} />
                  ))}
                </div>
                {/* Desktop — grouped by date */}
                <div className="hidden lg:block">
                  {groupByDate(filtered).map(({ label, items }) => (
                    <div key={label}>
                      <div className="px-5 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                      </div>
                      {items.map(e => (
                        <CardExpenseRow key={e.id} expense={e} exchangeRateUsd={statement?.exchangeRateUsd} onClick={() => setSelectedExpense(e)} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="h-20" />
          </div>
        </div>
      </div>

      {showUpload && (
        <StatementUploadModal onClose={() => setShowUpload(false)} onSuccess={() => setShowUpload(false)} />
      )}
      {pdfOpen && statement?.pdfPath && (
        <PdfViewerModal
          url={api.getStatementPdfUrl(statement.id)}
          fileName={`Resumen_${statement.cardType}_${statement.statementYear}_${String(statement.statementMonth).padStart(2, "0")}.pdf`}
          onClose={() => setPdfOpen(false)}
        />
      )}
      {selectedExpense && statement && (
        <ExpenseDetailSheet
          expense={selectedExpense}
          statement={statement}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </>
  );
}
