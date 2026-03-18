import type { GastosByCategoryResponse } from "@/types/api";

interface Props {
  cat: GastosByCategoryResponse;
  total: number;
  isActive: boolean;
  onClick: () => void;
}

export default function CategoryCard({ cat, total, isActive, onClick }: Props) {
  const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-28 p-3 rounded-2xl shadow-subtle transition-all duration-200 text-left ${
        isActive ? "ring-2 ring-primary bg-card" : "bg-card hover:shadow-card"
      }`}
    >
      <div className="text-2xl mb-1.5">{cat.categoryIcon || "💰"}</div>
      <div className="text-xs font-medium text-muted-foreground truncate">{cat.categoryName}</div>
      <div className="text-sm font-bold tabular mt-0.5">
        {cat.currencySymbol}{cat.amount.toLocaleString("es-AR")}
      </div>
      <div className="text-[10px] text-muted-foreground tabular">{pct}%</div>
    </button>
  );
}
