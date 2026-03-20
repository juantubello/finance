import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useSavingBalance, useSavings, useCryptoPrices, tickerToCoingeckoId, useDolarBlue, useUSDCARS, useCedearSPY } from "@/hooks/useApi";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import SkeletonList from "@/components/SkeletonList";
import type { SavingBalance, SavingMovement } from "@/types/api";

const now = new Date();

interface Props {
  onMenu: () => void;
  onSettings: () => void;
  onEditMovimiento: (m: SavingMovement) => void;
}

const TIPO_ICON: Record<string, string> = {
  fiat: "💵",
  crypto: "₿",
  cedear: "📈",
};

const BAR_COLORS_DARK = ["#6ee7b7", "#93c5fd", "#fcd34d", "#c4b5fd", "#5eead4", "#fdba74", "#fca5a5", "#94a3b8"];
const BAR_COLORS_LIGHT = ["#c8f0b0", "#b8d8ff", "#ffe8a0", "#e0c0ff", "#b0f0e0", "#ffd4a0", "#ffc8c8", "#d0d0d0"];

const TICKER_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  USD: "#22c55e",
  USDT: "#26a17b",
  USDC: "#2775ca",
  ETH: "#627eea",
};

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AssetWithUSD extends SavingBalance {
  usdValue?: number;
  arsValue?: number;
}

const BAR_MAX_H = 210;

function BalanceBarChart({ assets, colors }: { assets: AssetWithUSD[]; colors: string[] }) {
  const values = assets.map(a => a.usdValue ?? a.balance);
  const max = Math.max(...values, 0.000001);

  return (
    <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar pb-2 pt-1 justify-center">
      {assets.map((a, i) => {
        const val = a.usdValue ?? a.balance;
        const barH = Math.max(24, Math.round((val / max) * BAR_MAX_H));
        const color = TICKER_COLORS[a.ticker.toUpperCase()] ?? colors[i % colors.length];
        return (
          <div key={a.activoId} className="flex flex-col items-center flex-shrink-0 w-[88px]">
            <div
              className="w-[68px] rounded-2xl border-2 border-dashed border-border flex items-end justify-center relative overflow-hidden"
              style={{ height: BAR_MAX_H }}
            >
              <div
                className="w-full rounded-2xl flex items-center justify-center transition-all duration-500"
                style={{ height: barH, backgroundColor: color }}
              >
                <span className="text-lg leading-none">{TIPO_ICON[a.tipo] ?? "💰"}</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground mt-1 w-full text-center truncate px-1">
              {a.ticker}
            </span>
            <span className="text-[11px] font-bold text-foreground tabular">
              {a.balance.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: a.decimales })}
            </span>
            {a.arsValue !== undefined ? (
              <span className="text-[10px] text-muted-foreground tabular">
                ${a.arsValue.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
              </span>
            ) : a.usdValue !== undefined ? (
              <span className="text-[10px] text-muted-foreground tabular">{formatUSD(a.usdValue)}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function Ahorros({ onMenu, onSettings, onEditMovimiento }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const isDark = useIsDark();
  const colors = isDark ? BAR_COLORS_DARK : BAR_COLORS_LIGHT;

  const { data: balances = [], isLoading: loadingBalance } = useSavingBalance();
  const { data: allMovements = [], isLoading: loadingMovements } = useSavings();

  // Filter movements client-side since /savings has no year/month params
  const movements = useMemo(() => {
    if (filterMode === "month") {
      return allMovements.filter(m => {
        const d = new Date(m.dateTime);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
    }
    // year mode: filter by year
    return allMovements.filter(m => new Date(m.dateTime).getFullYear() === year);
  }, [allMovements, filterMode, year, month]);
  const { data: dolarBlue } = useDolarBlue();
  const { data: usdcARS } = useUSDCARS();
  const { data: spyCedear } = useCedearSPY();

  // Fetch crypto prices for crypto assets
  const cryptoTickers = balances.filter(b => b.tipo === "crypto").map(b => b.ticker);
  const { data: cryptoPrices } = useCryptoPrices(cryptoTickers);

  const assetsWithUSD: AssetWithUSD[] = balances.map(b => {
    if (b.tipo === "crypto" && cryptoPrices) {
      const cgId = tickerToCoingeckoId(b.ticker);
      const price = cgId ? cryptoPrices[cgId]?.usd : undefined;
      return { ...b, usdValue: price !== undefined ? b.balance * price : undefined };
    }
    if (b.ticker === "USD") return { ...b, usdValue: b.balance };
    if (b.tipo === "cedear" && b.ticker.toUpperCase() === "SPY" && spyCedear) {
      const arsValue = b.balance * spyCedear.lastPrice;
      const usdValue = dolarBlue ? arsValue / dolarBlue.venta : undefined;
      return { ...b, arsValue, usdValue };
    }
    return { ...b };
  });

  const totalUSD = assetsWithUSD.reduce((sum, a) => sum + (a.usdValue ?? 0), 0);

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto lg:max-w-3xl">
      <div className="flex-shrink-0">
        <DateFilter
          mode={filterMode}
          year={year}
          month={month}
          onModeChange={setFilterMode}
          onChange={(y, m) => { setYear(y); setMonth(m); }}
          onMenu={onMenu}
          onSettings={onSettings}
        />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Total estimado */}
        {!loadingBalance && totalUSD > 0 && (
          <div className="pt-8 pb-2 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total estimado</p>
            <div className="flex items-baseline gap-2 justify-center">
              <span className="text-4xl font-bold tracking-tighter tabular text-foreground">{formatUSD(totalUSD)}</span>
              <span className="text-sm font-semibold text-muted-foreground">USD</span>
            </div>
          </div>
        )}

        {/* Exchange rate pills */}
        {(dolarBlue || usdcARS || spyCedear) && (
          <div className="flex gap-1.5 px-5 pt-2 pb-1 flex-wrap">
            {dolarBlue && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-[10px] font-medium">
                <span className="font-bold text-foreground">🔵 Blue</span>
                <span className="text-emerald-500 font-semibold">C ${dolarBlue.compra.toLocaleString("es-AR")}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-red-500 font-semibold">V ${dolarBlue.venta.toLocaleString("es-AR")}</span>
              </div>
            )}
            {usdcARS && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-[10px] font-medium">
                <span className="font-bold text-foreground">💵 USDC · ARQ</span>
                <span className="text-emerald-500 font-semibold">C ${usdcARS.compra.toLocaleString("es-AR")}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-red-500 font-semibold">V ${usdcARS.venta.toLocaleString("es-AR")}</span>
              </div>
            )}
            {spyCedear && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-[10px] font-medium">
                <span className="font-bold text-foreground">📈 SPY</span>
                <span className="text-foreground font-semibold">${spyCedear.lastPrice.toLocaleString("es-AR")}</span>
                <span className={`font-semibold ${spyCedear.variation >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {spyCedear.variation >= 0 ? "+" : ""}{spyCedear.variation.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Balance section */}
        {loadingBalance ? (
          <div className="px-5 flex gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-20 rounded-2xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <PiggyBank size={40} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin saldo registrado</p>
          </div>
        ) : (
          <BalanceBarChart assets={assetsWithUSD} colors={colors} />
        )}

        {/* Movements list */}
        <div className="px-5 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Movimientos</p>
        </div>
        {loadingMovements ? (
          <SkeletonList />
        ) : movements.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay movimientos. Tocá '+' para agregar.
          </p>
        ) : (
          <div className="animate-fade-in">
            {movements.map(m => (
              <MovimientoRow key={m.id} movimiento={m} onClick={() => onEditMovimiento(m)} cryptoPrices={cryptoPrices} spyCedear={spyCedear} />
            ))}
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
}

function MovimientoRow({ movimiento: m, onClick, cryptoPrices, spyCedear }: {
  movimiento: SavingMovement;
  onClick: () => void;
  cryptoPrices?: Record<string, { usd: number }>;
  spyCedear?: { lastPrice: number } | null;
}) {
  const isDeposit = m.cantidad >= 0;

  let approxLabel: string | undefined;
  if (m.tipo === "crypto" && cryptoPrices) {
    const cgId = tickerToCoingeckoId(m.ticker);
    const price = cgId ? cryptoPrices[cgId]?.usd : undefined;
    if (price !== undefined) {
      approxLabel = `≈ ${formatUSD(Math.abs(m.cantidad) * price)} USD`;
    }
  } else if (m.tipo === "cedear" && m.ticker.toUpperCase() === "SPY" && spyCedear) {
    const ars = Math.abs(m.cantidad) * spyCedear.lastPrice;
    approxLabel = `≈ $${ars.toLocaleString("es-AR", { minimumFractionDigits: 0 })} ARS`;
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 px-4 active:bg-secondary/60 transition-colors border-b border-border/40 text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDeposit ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-red-100 dark:bg-red-950/40"}`}>
          {isDeposit
            ? <TrendingUp size={18} className="text-emerald-500" />
            : <TrendingDown size={18} className="text-red-500" />
          }
        </div>
        <div className="min-w-0">
          <span className="inline-block text-[9px] font-semibold px-1 py-px rounded-full mb-0.5 bg-secondary text-muted-foreground">
            {TIPO_ICON[m.tipo] ?? ""} {m.ticker}
          </span>
          <div className="text-sm font-medium text-foreground truncate">
            {m.description || (isDeposit ? "Depósito" : "Retiro")}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(m.dateTime), "dd/MM/yyyy")}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 ml-3">
        <div className={`text-sm font-semibold tabular ${isDeposit ? "text-emerald-500" : "text-red-500"}`}>
          {isDeposit ? "+" : ""}{m.cantidad.toLocaleString("es-AR", { minimumFractionDigits: m.decimales, maximumFractionDigits: m.decimales })} {m.ticker}
        </div>
        {approxLabel && (
          <div className="text-[10px] text-muted-foreground tabular">{approxLabel}</div>
        )}
      </div>
    </button>
  );
}
