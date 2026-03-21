import { format } from "date-fns";
import type { GastoResponse } from "@/types/api";
import type { ForexRates } from "@/hooks/useForexRates";
import { isARS, isUSD, isExotic, toUSD, toARS } from "@/utils/currency";

interface Props {
  gasto: GastoResponse;
  onClick: () => void;
  forexRates?: ForexRates;
  dolarBlueRate?: number; // ARS per USD (compra)
  privacyMode?: boolean;
}

export default function ExpenseRow({ gasto, onClick, forexRates, dolarBlueRate, privacyMode }: Props) {
  const categoryColor = gasto.categoryColor ?? "#e5e7eb";
  const sym = gasto.currencySymbol;

  const arsValue = !isARS(sym)
    ? toARS(gasto.amount, sym, forexRates, dolarBlueRate, gasto.currency)
    : null;

  const usdValue = isExotic(sym)
    ? toUSD(gasto.amount, sym, forexRates, dolarBlueRate, gasto.currency)
    : null;

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

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
              style={{ backgroundColor: categoryColor, color: "#374151" }}
            >
              {gasto.category}
            </span>
          )}
          <div className="text-sm font-medium text-foreground truncate">{gasto.description}</div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            <span className="text-xs text-muted-foreground">
              {format(new Date(gasto.dateTime), "dd/MM/yyyy")}
            </span>
            {gasto.labels?.map(l => (
              <span key={l.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                #{l.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end flex-shrink-0 ml-3">
        <div className="text-sm font-semibold tabular text-expense">
          {privacyMode ? "***" : `- ${sym} ${fmt(gasto.amount)}`}
        </div>
        {/* USD equivalent for exotic currencies */}
        {usdValue !== null && (
          <div className="text-[10px] text-muted-foreground tabular">
            {privacyMode ? "—" : `≈ USD ${fmt(usdValue)}`}
          </div>
        )}
        {/* ARS equivalent for all non-ARS currencies */}
        {arsValue !== null && (
          <div className="text-[10px] text-muted-foreground tabular">
            {privacyMode ? "—" : `≈ $${fmt(arsValue, 0)} ARS`}
          </div>
        )}
      </div>
    </button>
  );
}
