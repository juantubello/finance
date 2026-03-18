import { useState, useMemo } from "react";
import { useGastos, useGastosByCategories } from "@/hooks/useApi";
import MonthSelector from "@/components/MonthSelector";
import CategoryCard from "@/components/CategoryCard";
import ExpenseRow from "@/components/ExpenseRow";
import ExpenseModal from "@/components/ExpenseModal";
import SkeletonList from "@/components/SkeletonList";
import type { GastoResponse } from "@/types/api";
import { Search } from "lucide-react";

const now = new Date();

export default function Index() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [editGasto, setEditGasto] = useState<GastoResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: gastos, isLoading: loadingGastos, error: errorGastos } = useGastos(year, month);
  const { data: categories, isLoading: loadingCats } = useGastosByCategories(year, month);

  const filtered = useMemo(() => {
    if (!gastos) return [];
    let list = gastos;
    if (activeCategoryId !== null) {
      list = list.filter((g) => g.categoryId === activeCategoryId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.description.toLowerCase().includes(q));
    }
    return list;
  }, [gastos, activeCategoryId, search]);

  // Group totals by currency
  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, { symbol: string; total: number }>();
    for (const g of filtered) {
      const existing = map.get(g.currency) || { symbol: g.currencySymbol, total: 0 };
      existing.total += g.amount;
      map.set(g.currency, existing);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Category totals for percentage calc (per currency — use first currency for simplicity)
  const catTotal = useMemo(() => {
    if (!categories) return 0;
    return categories.reduce((s, c) => s + c.amount, 0);
  }, [categories]);

  const openEdit = (g: GastoResponse) => {
    setEditGasto(g);
    setModalOpen(true);
  };

  return (
    <div className="pb-24 max-w-lg mx-auto">
      {/* Month selector */}
      <div className="pt-6 pb-4 px-5">
        <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setActiveCategoryId(null); }} />
      </div>

      {/* Totals */}
      <div className="px-5 mb-4">
        {loadingGastos ? (
          <div className="h-10 w-40 bg-secondary rounded-lg animate-pulse" />
        ) : totalsByCurrency.length > 0 ? (
          <div className="space-y-1">
            {totalsByCurrency.map((t) => (
              <div key={t.symbol} className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-3xl font-bold tracking-tighter tabular text-foreground">
                  {t.symbol} {t.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay gastos este mes</p>
        )}
      </div>

      {/* Category cards */}
      {loadingCats ? (
        <div className="flex gap-3 px-5 overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="w-28 h-24 bg-secondary rounded-2xl animate-pulse flex-shrink-0" />)}
        </div>
      ) : categories && categories.length > 0 && (
        <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar pb-4">
          {categories.map((c) => (
            <CategoryCard
              key={`${c.categoryId}-${c.currencyId}`}
              cat={c}
              total={catTotal}
              isActive={activeCategoryId === c.categoryId}
              onClick={() => setActiveCategoryId(activeCategoryId === c.categoryId ? null : c.categoryId)}
            />
          ))}
        </div>
      )}

      {/* Search filter */}
      <div className="px-5 mb-2 mt-2">
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
              No hay gastos registrados. Tocá '+' para empezar.
            </p>
          )}
        </div>
      )}

      <ExpenseModal open={modalOpen} onClose={() => { setModalOpen(false); setEditGasto(null); }} gasto={editGasto} />
    </div>
  );
}
