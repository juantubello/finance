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

  const amountPillClass = isUSD(sym)
    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
    : "bg-white text-expense shadow-subtle dark:bg-secondary dark:text-expense";
  const descriptionClampStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left active:bg-secondary/35 transition-colors duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
          style={{ backgroundColor: categoryColor }}
        >
          {gasto.categoryIcon || "💰"}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="text-[12px] text-muted-foreground truncate">
            {gasto.category || "Sin categoría"}
          </div>
          <div className="text-[0.98rem] leading-[1.2] font-semibold text-foreground" style={descriptionClampStyle}>{gasto.description}</div>
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {gasto.labels?.map(l => (
              <span key={l.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/12 text-primary">
                #{l.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end flex-shrink-0 gap-1">
        <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-[0.86rem] font-semibold tabular ${amountPillClass}`}>
          {privacyMode ? "***" : `- ${sym} ${fmt(gasto.amount)}`}
        </div>
        {/* USD equivalent for exotic currencies */}
        {usdValue !== null && (
          <div className="text-[10px] text-muted-foreground tabular pr-1">
            {privacyMode ? "—" : `≈ USD ${fmt(usdValue)}`}
          </div>
        )}
        {/* ARS equivalent for all non-ARS currencies */}
        {arsValue !== null && (
          <div className="text-[10px] text-muted-foreground tabular pr-1">
            {privacyMode ? "—" : `≈ $${fmt(arsValue, 0)} ARS`}
          </div>
        )}
      </div>
    </button>
  );
}
