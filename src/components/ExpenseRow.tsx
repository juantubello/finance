import { format } from "date-fns";
import type { GastoResponse } from "@/types/api";

interface Props {
  gasto: GastoResponse;
  onClick: () => void;
  categoryColor?: string;
}

export default function ExpenseRow({ gasto, onClick, categoryColor }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 px-4 active:bg-secondary/60 transition-colors duration-200 text-left border-b border-border/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg flex-shrink-0">
          {gasto.categoryIcon || "💰"}
        </div>
        <div className="min-w-0">
          {gasto.category && (
            <span
              className="inline-block text-[9px] font-semibold px-1 py-px rounded-full mb-0.5"
              style={{
                backgroundColor: categoryColor ?? "#e5e7eb",
                color: "#374151",
              }}
            >
              {gasto.category}
            </span>
          )}
          <div className="text-sm font-medium text-foreground truncate">{gasto.description}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(gasto.dateTime), "dd/MM/yyyy")}
          </div>
        </div>
      </div>
      <div className="text-sm font-semibold tabular text-expense flex-shrink-0 ml-3">
        - {gasto.currencySymbol} {gasto.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
      </div>
    </button>
  );
}
