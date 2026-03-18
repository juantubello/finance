import { useState, useMemo } from "react";
import {
  useGastos,
  useGastosForYear,
  useGastosByCategories,
  useGastosByCategoriesForYear,
} from "@/hooks/useApi";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import CategoryBarChart from "@/components/CategoryBarChart";
import ExpenseRow from "@/components/ExpenseRow";
import ExpenseModal from "@/components/ExpenseModal";
import SkeletonList from "@/components/SkeletonList";
import type { GastoResponse } from "@/types/api";
import { Search } from "lucide-react";

const now = new Date();

export default function Index() {
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  // Use indices instead of categoryIds — works regardless of API field naming
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [editGasto, setEditGasto] = useState<GastoResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const gastos = filterMode === "month" ? monthQuery.data : yearQuery.data;
  const loadingGastos = filterMode === "month" ? monthQuery.isLoading : yearQuery.isLoading;
  const errorGastos = filterMode === "month" ? monthQuery.error : null;
  const categories = filterMode === "month" ? monthCatQuery.data : yearCatQuery.data;
  const loadingCats = filterMode === "month" ? monthCatQuery.isLoading : yearCatQuery.isLoading;

  // Build set of active category names/IDs from selected indices
  const activeCategories = useMemo(() => {
    if (!categories || activeIndices.length === 0) return null;
    return activeIndices
      .map((i) => categories[i])
      .filter(Boolean)
      .map((c) => ({
        // Match by categoryId if available, otherwise by name
        id: c.categoryId,
        name: c.categoryName,
      }));
  }, [categories, activeIndices]);

  const filtered = useMemo(() => {
    if (!gastos) return [];
    let list = gastos;
    if (activeCategories && activeCategories.length > 0) {
      list = list.filter((g) => {
        // Try matching by categoryId first, fall back to category name
        return activeCategories.some(
          (ac) =>
            (ac.id != null && g.categoryId != null && ac.id === g.categoryId) ||
            (ac.name && g.category && ac.name === g.category)
        );
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.description.toLowerCase().includes(q));
    }
    return list;
  }, [gastos, activeCategories, search]);

  const totalsByCurrency = useMemo(() => {
    if (!gastos) return [];
    const map = new Map<string, { symbol: string; total: number }>();
    for (const g of gastos) {
      const existing = map.get(g.currency) || { symbol: g.currencySymbol, total: 0 };
      existing.total += g.amount;
      map.set(g.currency, existing);
    }
    return Array.from(map.values());
  }, [gastos]);

  const selectedSum = useMemo(() => {
    if (!activeCategories || activeCategories.length === 0 || !gastos) return null;
    const map = new Map<string, { symbol: string; total: number }>();
    for (const g of filtered) {
      const existing = map.get(g.currency) || { symbol: g.currencySymbol, total: 0 };
      existing.total += g.amount;
      map.set(g.currency, existing);
    }
    return Array.from(map.values());
  }, [filtered, activeCategories, gastos]);

  const openEdit = (g: GastoResponse) => {
    setEditGasto(g);
    setModalOpen(true);
  };

  const handleDateChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setActiveIndices([]);
  };

  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setActiveIndices([]);
  };

  const handleCategorySelect = (index: number) => {
    setActiveIndices((prev) =>
      prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index]
    );
  };

  return (
    <div className="pb-24 max-w-lg mx-auto">
      <DateFilter
        mode={filterMode}
        year={year}
        month={month}
        onModeChange={handleModeChange}
        onChange={handleDateChange}
      />

      {/* Totals */}
      <div className="px-5 mb-4 flex flex-col items-center text-center">
        {loadingGastos ? (
          <div className="space-y-2">
            <div className="h-4 w-12 bg-secondary rounded animate-pulse mx-auto" />
            <div className="h-12 w-52 bg-secondary rounded-lg animate-pulse mx-auto" />
          </div>
        ) : totalsByCurrency.length > 0 ? (
          totalsByCurrency.map((t) => (
            <div key={t.symbol}>
              <p className="text-xs text-muted-foreground mb-0.5">Total</p>
              <div className="flex items-baseline gap-1.5 justify-center">
                <span className="text-4xl font-bold tracking-tighter tabular text-foreground">
                  {t.total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </span>
                <span className="text-xl font-semibold text-muted-foreground">{t.symbol}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-foreground text-background text-xs font-semibold tabular">
                  - {t.symbol}{t.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
                {selectedSum && selectedSum.map((s) => (
                  <span key={s.symbol} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold tabular">
                    Selec: {s.symbol}{s.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : !loadingGastos ? (
          <p className="text-sm text-muted-foreground">No hay gastos este período</p>
        ) : null}
      </div>

      {/* Category bar chart */}
      {loadingCats ? (
        <div className="flex gap-3 px-5 overflow-hidden mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 w-[72px]">
              <div className="w-14 rounded-2xl bg-secondary animate-pulse" style={{ height: 130 }} />
              <div className="h-3 w-10 bg-secondary rounded animate-pulse" />
              <div className="h-2 w-6 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <CategoryBarChart
          categories={categories}
          activeIndices={activeIndices}
          onSelect={handleCategorySelect}
        />
      ) : null}

      {/* Search */}
      <div className="px-5 mb-2 mt-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar gastos..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Expense list */}
      {errorGastos ? (
        <div className="mx-5 p-4 rounded-2xl bg-expense/10 text-expense text-sm">
          Error al cargar los gastos. Verificá tu conexión.
        </div>
      ) : loadingGastos ? (
        <SkeletonList />
      ) : (
        <div className="animate-fade-in">
          {filtered.map((g) => (
            <ExpenseRow key={g.id} gasto={g} onClick={() => openEdit(g)} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              {activeCategories ? "No hay gastos en las categorías seleccionadas." : "No hay gastos registrados. Tocá '+' para empezar."}
            </p>
          )}
        </div>
      )}

      <ExpenseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditGasto(null); }}
        gasto={editGasto}
      />
    </div>
  );
}
