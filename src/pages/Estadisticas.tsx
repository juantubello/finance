import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueries } from "@tanstack/react-query";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  BarChart2,
  Maximize2,
  X,
  Info,
} from "lucide-react";
import {
  useGastosForYear,
  useIngresosForYear,
  useDolarBlue,
  useSavings,
  useCryptoPrices,
  tickerToCoingeckoId,
  useUSDCARS,
  useCedearSPY,
} from "@/hooks/useApi";
import { useForexRates } from "@/hooks/useForexRates";
import { api } from "@/services/api";
import { toARS } from "@/utils/currency";
import type { CardStatement, CardExpense, GastoResponse, SavingMovement } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtARS(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function avgRate(compra?: number | null, venta?: number | null): number | null {
  if (typeof compra === "number" && typeof venta === "number") return (compra + venta) / 2;
  if (typeof venta === "number") return venta;
  if (typeof compra === "number") return compra;
  return null;
}

function savingMovementToARS(
  movement: SavingMovement,
  {
    blueRate,
    usdcRate,
    spyPrice,
    cryptoPrices,
  }: {
    blueRate: number | null;
    usdcRate: number | null;
    spyPrice: number | null;
    cryptoPrices?: Record<string, { usd: number }>;
  }
): number | null {
  const qty = Math.abs(movement.cantidad);
  if (qty === 0) return 0;

  if (typeof movement.precioArs === "number" && Number.isFinite(movement.precioArs) && movement.precioArs > 0) {
    return qty * movement.precioArs;
  }

  const ticker = movement.ticker.toUpperCase();
  if (ticker === "ARS") return qty;

  if (ticker === "USD") {
    return blueRate != null ? qty * blueRate : null;
  }

  if (ticker === "USDC" || ticker === "USDT") {
    const rate = usdcRate ?? blueRate;
    return rate != null ? qty * rate : null;
  }

  if (movement.tipo === "cedear" && ticker === "SPY") {
    return spyPrice != null ? qty * spyPrice : null;
  }

  if (movement.tipo === "crypto" && cryptoPrices && blueRate != null) {
    const cgId = tickerToCoingeckoId(ticker);
    const usdPrice = cgId ? cryptoPrices[cgId]?.usd : undefined;
    if (typeof usdPrice === "number") return qty * usdPrice * blueRate;
  }

  return null;
}

// ─── MonthlyFlowChart ─────────────────────────────────────────────────────────

interface MonthlyFlowChartProps {
  monthlyI: number[];
  monthlyG: number[];
}

const BAR_W = 17;
const GAP = 3;
const GROUP = 38;
const PAD_L = 32;
const H = 140;
const LABEL_H = 18;
const VB_W = 460;
const VB_H = 170;

function MonthlyFlowChart({ monthlyI, monthlyG }: MonthlyFlowChartProps) {
  const maxVal = Math.max(...monthlyI, ...monthlyG, 1);

  // Nice y-axis ticks
  const rawStep = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const ticks: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const v = niceStep * i;
    if (v <= maxVal * 1.25) ticks.push(v);
  }
  if (ticks.length === 0) ticks.push(maxVal);

  const chartH = VB_H - LABEL_H;
  const topVal = ticks[ticks.length - 1] || 1;
  const scale = (v: number) => (v / topVal) * (chartH - 12);

  // suppress unused-variable warnings for H (used conceptually via chartH)
  void H;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" aria-label="Flujo mensual">
      {/* Grid lines */}
      {ticks.map((tick) => {
        const y = chartH - scale(tick);
        return (
          <g key={tick}>
            <line
              x1={PAD_L}
              x2={VB_W - 8}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={PAD_L - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.45}
            >
              {fmtK(tick)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {MONTHS.map((label, i) => {
        const gx = PAD_L + i * GROUP;
        const ingrH = scale(monthlyI[i]);
        const gastH = scale(monthlyG[i]);
        const net = monthlyI[i] - monthlyG[i];
        const tallerH = Math.max(ingrH, gastH);
        const dotY = chartH - tallerH - 7;

        return (
          <g key={label}>
            {/* Ingreso bar */}
            <rect
              x={gx}
              y={chartH - ingrH}
              width={BAR_W}
              height={ingrH}
              rx={3}
              fill="#10b981"
              fillOpacity={0.85}
            />
            {/* Gasto bar */}
            <rect
              x={gx + BAR_W + GAP}
              y={chartH - gastH}
              width={BAR_W}
              height={gastH}
              rx={3}
              fill="#ff5c4d"
              fillOpacity={0.85}
            />
            {/* Net indicator dot */}
            {(monthlyI[i] > 0 || monthlyG[i] > 0) && (
              <circle
                cx={gx + BAR_W + GAP / 2}
                cy={dotY}
                r={3}
                fill={net >= 0 ? "#10b981" : "#f59e0b"}
              />
            )}
            {/* Month label */}
            <text
              x={gx + BAR_W + GAP / 2}
              y={VB_H - 3}
              textAnchor="middle"
              fontSize={8.5}
              fill="currentColor"
              fillOpacity={0.55}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── CardLineChart ────────────────────────────────────────────────────────────

const CARD_LINES = [
  { key: "total", color: "#7c3aed", label: "Total" },
  { key: "visa",  color: "#1565C0", label: "VISA"  },
  { key: "mc",    color: "#eb001b", label: "MC"    },
] as const;

type CardLineKey = typeof CARD_LINES[number]["key"];

interface CardLineChartProps {
  visaARS: number[];
  mcARS: number[];
  hidden: Set<CardLineKey>;
  zoomed?: boolean;
}

function CardLineChart({ visaARS, mcARS, hidden, zoomed = false }: CardLineChartProps) {
  const n = visaARS.length; // may be trimmed to last active month
  const totalARS = visaARS.map((v, i) => v + mcARS[i]);

  // Dimensions: compact vs zoomed
  const W       = zoomed ? 980 : 460;
  const H       = zoomed ? 300 : 160;
  const PAD_L   = zoomed ? 44 : 36;
  const PAD_R   = zoomed ? 16 : 12;
  const PAD_TOP = zoomed ? 44 : 28;
  const PAD_BOT = zoomed ? 28 : 22;

  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_TOP - PAD_BOT;
  const step   = chartW / (Math.max(n - 1, 1));

  const toX = (i: number) => PAD_L + i * step;
  const toY = (v: number) => PAD_TOP + chartH * (1 - v / maxVal);

  // Only consider visible series when computing scale
  const visibleSeries = [
    !hidden.has("total") ? totalARS : [],
    !hidden.has("visa")  ? visaARS  : [],
    !hidden.has("mc")    ? mcARS    : [],
  ];
  const maxVal = Math.max(...visibleSeries.flat(), 1);

  // Build path only through non-zero months (lifts pen at zeros to avoid flat baseline line)
  const makePath = (values: number[]) => {
    let path = "";
    let prevI = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= 0) { prevI = -1; continue; }
      const x = toX(i), y = toY(values[i]);
      if (prevI === -1) {
        path += ` M ${x},${y}`;
      } else {
        const cpx = (toX(prevI) + x) / 2;
        path += ` C ${cpx},${toY(values[prevI])} ${cpx},${y} ${x},${y}`;
      }
      prevI = i;
    }
    return path.trim();
  };

  const allPaths: Record<CardLineKey, string> = {
    total: makePath(totalARS),
    visa:  makePath(visaARS),
    mc:    makePath(mcARS),
  };

  const allValues: Record<CardLineKey, number[]> = {
    total: totalARS,
    visa:  visaARS,
    mc:    mcARS,
  };

  // Y-axis ticks
  const rawStep = maxVal / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const niceStep = Math.ceil(rawStep / mag) * mag;
  const ticks: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const v = niceStep * i;
    if (v <= maxVal * 1.3) ticks.push(v);
  }
  if (ticks.length === 0) ticks.push(maxVal);

  // Label offsets: Total above dot, VISA above dot, MC below dot (to reduce overlap)
  const labelDy: Record<CardLineKey, number> = { total: -13, visa: -13, mc: 13 };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={zoomed ? W : "100%"}
      style={zoomed ? { display: "block" } : undefined}
      aria-label="Evolución de tarjetas"
    >
      <defs>
        <linearGradient id="cardTotalGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {ticks.map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
              stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} strokeDasharray="3 3" />
            <text x={PAD_L - 4} y={y + 3.5} textAnchor="end"
              fontSize={zoomed ? 8.5 : 7.5} fill="currentColor" fillOpacity={0.45}>
              {fmtK(tick)}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={PAD_L} x2={W - PAD_R} y1={PAD_TOP + chartH} y2={PAD_TOP + chartH}
        stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />

      {/* Total area fill */}
      {!hidden.has("total") && totalARS.some(v => v > 0) && (
        <path
          d={`${allPaths.total} L ${toX(n - 1)},${PAD_TOP + chartH} L ${toX(0)},${PAD_TOP + chartH} Z`}
          fill="url(#cardTotalGrad2)"
        />
      )}

      {/* Lines */}
      {CARD_LINES.map(({ key, color }) =>
        !hidden.has(key) && allValues[key].some(v => v > 0) ? (
          <path key={key} d={allPaths[key]} fill="none"
            stroke={color} strokeWidth={zoomed ? 2.5 : 2}
            strokeLinecap="round" strokeLinejoin="round" />
        ) : null
      )}

      {/* Dots + labels + month labels */}
      {MONTHS.slice(0, n).map((label, i) => (
        <g key={label}>
          {CARD_LINES.map(({ key, color }) => {
            if (hidden.has(key) || allValues[key][i] <= 0) return null;
            const cx = toX(i), cy = toY(allValues[key][i]);
            return (
              <g key={key}>
                <circle cx={cx} cy={cy} r={zoomed ? 3.5 : 2.5} fill={color} opacity={0.9} />
                <text x={cx} y={cy + labelDy[key]} textAnchor="middle"
                  fontSize={zoomed ? 8.5 : 6.5} fontWeight="600" fill={color} opacity={0.9}>
                  {fmtK(allValues[key][i])}
                </text>
              </g>
            );
          })}
          {/* Month label */}
          <text x={toX(i)} y={H - (zoomed ? 7 : 5)} textAnchor="middle"
            fontSize={zoomed ? 9.5 : 8.5} fill="currentColor" fillOpacity={0.55}>
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onMenu: () => void;
  onSettings: () => void;
}

export default function Estadisticas({ onMenu, onSettings: _onSettings }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [cardZoomed, setCardZoomed] = useState(false);
  const [showFlowInfo, setShowFlowInfo] = useState(false);
  const [showAvgInfo, setShowAvgInfo] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<Set<CardLineKey>>(new Set());

  const toggleLine = (key: CardLineKey) =>
    setHiddenLines(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: gastosData, isLoading: loadingGastos } = useGastosForYear(year);
  const { data: ingresosData, isLoading: loadingIngresos } = useIngresosForYear(year);
  const { data: savingsData, isLoading: loadingSavings } = useSavings();
  const { data: dolarBlueData } = useDolarBlue();
  const { data: usdcARS } = useUSDCARS();
  const { data: spyCedear } = useCedearSPY();
  const { data: forexRates } = useForexRates();

  const dolarBlue = dolarBlueData?.compra;
  const blueRate = avgRate(dolarBlueData?.compra, dolarBlueData?.venta);
  const usdcRate = avgRate(usdcARS?.compra, usdcARS?.venta);

  const cryptoTickers = useMemo(
    () => [...new Set((savingsData ?? []).filter((m) => m.tipo === "crypto").map((m) => m.ticker.toUpperCase()))],
    [savingsData]
  );
  const { data: cryptoPrices } = useCryptoPrices(cryptoTickers);

  // ── Card statements: 24 queries (12 VISA + 12 MC) ──────────────────────────
  const stmtQueries = useQueries({
    queries: [
      ...Array.from({ length: 12 }, (_, i) => ({
        queryKey: ["cardStatement", "VISA", year, i + 1] as const,
        queryFn: () => api.getCardStatement("VISA", year, i + 1),
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        queryKey: ["cardStatement", "MASTERCARD", year, i + 1] as const,
        queryFn: () => api.getCardStatement("MASTERCARD", year, i + 1),
      })),
    ],
  });

  const loadingCards = stmtQueries.some((q) => q.isLoading);

  const allFoundStatements = useMemo<CardStatement[]>(() => {
    return stmtQueries
      .map((q) => q.data ?? null)
      .filter((s): s is CardStatement => s != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stmtQueries]);

  // ── Card expenses: one query per found statement ────────────────────────────
  const expQueries = useQueries({
    queries: allFoundStatements.map((s) => ({
      queryKey: ["cardExpenses", s.id] as const,
      queryFn: () => api.getCardExpenses(s.id),
    })),
  });

  // ── expenseMap: statementId → total ARS ────────────────────────────────────
  const expenseMap = useMemo<Map<number, number>>(() => {
    const map = new Map<number, number>();
    allFoundStatements.forEach((stmt, idx) => {
      const expenses: CardExpense[] | undefined = expQueries[idx]?.data;
      if (!expenses) return;
      const rate = stmt.exchangeRateUsd / 100; // ARS per USD
      let total = 0;
      for (const e of expenses) {
        if (e.amountArs != null) {
          total += e.amountArs / 100;
        } else if (e.amountUsd != null) {
          total += (e.amountUsd / 100) * rate;
        }
      }
      map.set(stmt.id, total);
    });
    return map;
  }, [allFoundStatements, expQueries]);

  // ── Monthly aggregates ─────────────────────────────────────────────────────
  const monthlyG = useMemo<number[]>(() => {
    const arr = Array(12).fill(0) as number[];
    if (!gastosData) return arr;
    for (const g of gastosData) {
      const mo = new Date(g.dateTime).getMonth();
      const ars = toARS(g.amount, g.currencySymbol, forexRates, dolarBlue, g.currency);
      if (ars != null) arr[mo] += ars;
    }
    return arr;
  }, [gastosData, forexRates, dolarBlue]);

  const monthlyI = useMemo<number[]>(() => {
    const arr = Array(12).fill(0) as number[];
    if (!ingresosData) return arr;
    for (const g of ingresosData) {
      const mo = new Date(g.dateTime).getMonth();
      const ars = toARS(g.amount, g.currencySymbol, forexRates, dolarBlue, g.currency);
      if (ars != null) arr[mo] += ars;
    }
    return arr;
  }, [ingresosData, forexRates, dolarBlue]);

  const monthlyS = useMemo<number[]>(() => {
    const arr = Array(12).fill(0) as number[];
    if (!savingsData) return arr;
    for (const movement of savingsData) {
      const date = new Date(movement.dateTime);
      if (date.getFullYear() !== year) continue;
      const ars = savingMovementToARS(movement, {
        blueRate,
        usdcRate,
        spyPrice: spyCedear?.lastPrice ?? null,
        cryptoPrices,
      });
      if (ars == null) continue;
      const monthIndex = date.getMonth();
      arr[monthIndex] += movement.cantidad >= 0 ? ars : -ars;
    }
    return arr;
  }, [savingsData, year, blueRate, usdcRate, spyCedear, cryptoPrices]);

  // ── Card totals per month ──────────────────────────────────────────────────
  const visaARS = useMemo<number[]>(() => {
    const arr = Array(12).fill(0) as number[];
    allFoundStatements.forEach((stmt) => {
      if (stmt.cardType !== "VISA") return;
      const total = expenseMap.get(stmt.id) ?? 0;
      arr[stmt.statementMonth - 1] += total;
    });
    return arr;
  }, [allFoundStatements, expenseMap]);

  const mcARS = useMemo<number[]>(() => {
    const arr = Array(12).fill(0) as number[];
    allFoundStatements.forEach((stmt) => {
      if (stmt.cardType !== "MASTERCARD") return;
      const total = expenseMap.get(stmt.id) ?? 0;
      arr[stmt.statementMonth - 1] += total;
    });
    return arr;
  }, [allFoundStatements, expenseMap]);

  // ── Trim card arrays to last month with any data ──────────────────────────
  const cardMonthCount = useMemo(() => {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      if (visaARS[i] > 0 || mcARS[i] > 0) last = i;
    }
    return last >= 0 ? last + 1 : 12;
  }, [visaARS, mcARS]);

  const visaARSTrimmed = useMemo(() => visaARS.slice(0, cardMonthCount), [visaARS, cardMonthCount]);
  const mcARSTrimmed   = useMemo(() => mcARS.slice(0, cardMonthCount),   [mcARS,   cardMonthCount]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalG = useMemo(() => monthlyG.reduce((a, b) => a + b, 0), [monthlyG]);
  const totalI = useMemo(() => monthlyI.reduce((a, b) => a + b, 0), [monthlyI]);
  const totalSavedNet = useMemo(() => monthlyS.reduce((a, b) => a + b, 0), [monthlyS]);
  const savingsRate = totalI > 0 ? (totalSavedNet / totalI) * 100 : 0;
  const activeMonths = monthlyG.filter((v) => v > 0).length;
  const avgG = activeMonths > 0 ? totalG / activeMonths : 0;
  const totalCards = useMemo(
    () => visaARS.reduce((a, b) => a + b, 0) + mcARS.reduce((a, b) => a + b, 0),
    [visaARS, mcARS]
  );
  const visaTotal = useMemo(() => visaARS.reduce((a, b) => a + b, 0), [visaARS]);
  const mcTotal = useMemo(() => mcARS.reduce((a, b) => a + b, 0), [mcARS]);
  const cardRatio = totalG > 0 ? (totalCards / totalG) * 100 : 0;

  // ── Category breakdown ─────────────────────────────────────────────────────
  const catBreakdown = useMemo(() => {
    if (!gastosData) return [];
    const map = new Map<
      string,
      { name: string; icon: string | null; color: string | null; total: number }
    >();
    for (const g of gastosData) {
      const ars = toARS(g.amount, g.currencySymbol, forexRates, dolarBlue, g.currency);
      if (ars == null) continue;
      const key = g.category || "Sin categoría";
      const existing = map.get(key);
      if (existing) {
        existing.total += ars;
      } else {
        map.set(key, {
          name: key,
          icon: g.categoryIcon,
          color: g.categoryColor,
          total: ars,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [gastosData, forexRates, dolarBlue]);

  // ── Top 10 gastos ──────────────────────────────────────────────────────────
  const topGastos = useMemo<(GastoResponse & { arsValue: number })[]>(() => {
    if (!gastosData) return [];
    const withARS = gastosData
      .map((g) => {
        const ars = toARS(g.amount, g.currencySymbol, forexRates, dolarBlue, g.currency);
        return { ...g, arsValue: ars ?? 0 };
      })
      .filter((g) => g.arsValue > 0);
    return withARS.sort((a, b) => b.arsValue - a.arsValue).slice(0, 10);
  }, [gastosData, forexRates, dolarBlue]);

  // ── Month table ────────────────────────────────────────────────────────────
  const monthTable = useMemo(() => {
    return MONTHS.map((label, i) => ({
      label,
      i,
      g: monthlyG[i],
      net: monthlyI[i] - monthlyG[i],
      rate: monthlyI[i] > 0 ? (monthlyS[i] / monthlyI[i]) * 100 : 0,
      ingr: monthlyI[i],
    })).filter((row) => row.g > 0 || row.ingr > 0 || monthlyS[row.i] !== 0);
  }, [monthlyG, monthlyI, monthlyS]);

  // ── Loading / empty ────────────────────────────────────────────────────────
  const isLoading = loadingGastos || loadingIngresos || loadingSavings;
  const hasData =
    (gastosData && gastosData.length > 0) ||
    (ingresosData && ingresosData.length > 0) ||
    (savingsData && savingsData.length > 0);

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] flex flex-col animate-page-from-left bg-background text-foreground">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Estadísticas</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Año anterior"
          >
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <span className="w-12 text-center text-sm font-bold text-foreground tabular-nums">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Año siguiente"
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {/* Loading state */}
        {isLoading && (
          <div className="px-4 py-6 space-y-3">
            <div className="h-28 rounded-2xl bg-secondary/60 animate-pulse" />
            <div className="h-44 rounded-2xl bg-secondary/60 animate-pulse" />
            <div className="h-36 rounded-2xl bg-secondary/60 animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasData && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <BarChart2 size={40} className="opacity-40" />
            <p className="text-sm">Sin datos para {year}</p>
          </div>
        )}

        {/* Data sections */}
        {!isLoading && hasData && (
          <>
            {/* ── SECTION 1: Resumen ──────────────────────────────────────── */}
            <section className="px-4 py-4 border-b border-border/30">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Resumen {year}
              </h2>

              <div className="grid grid-cols-2 gap-2.5 mb-3">
                {/* Ingresos */}
                <div className="bg-card border border-border/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
                      <TrendingUp size={12} className="text-emerald-500" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
                      Ingresos
                    </span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-emerald-500 leading-tight">
                    {fmtK(totalI)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    ${fmtARS(totalI)} ARS
                  </p>
                </div>

                {/* Gastos */}
                <div className="bg-card border border-border/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
                      <TrendingDown size={12} className="text-[#ff5c4d]" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
                      Gastos
                    </span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-[#ff5c4d] leading-tight">
                    {fmtK(totalG)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    ${fmtARS(totalG)} ARS
                  </p>
                </div>

                {/* Tasa de ahorro */}
                <div className="bg-card border border-border/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
                      <Wallet size={12} className="text-muted-foreground" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
                      Tasa ahorro
                    </span>
                  </div>
                  <p
                    className={`text-lg font-bold tabular-nums leading-tight ${
                      savingsRate >= 20
                        ? "text-emerald-500"
                        : savingsRate >= 0
                        ? "text-amber-500"
                        : "text-[#ff5c4d]"
                    }`}
                  >
                    {savingsRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">del ingreso total</p>
                </div>

                {/* Promedio mensual */}
                <div className="bg-card border border-border/40 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center">
                      <BarChart2 size={12} className="text-muted-foreground" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium flex-1">
                      Prom. mensual
                    </span>
                    <button
                      onClick={() => setShowAvgInfo(v => !v)}
                      className={`p-0.5 rounded-full transition-colors ${showAvgInfo ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
                      aria-label="¿Para qué sirve este dato?"
                    >
                      <Info size={11} />
                    </button>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                    {fmtK(avgG)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    en {activeMonths} {activeMonths === 1 ? "mes" : "meses"}
                  </p>
                  {showAvgInfo && (
                    <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        <span className="font-semibold text-foreground">Presupuestar:</span> sabés cuánto necesitás reservar cada mes para no pasarte.
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        <span className="font-semibold text-foreground">Comparar meses:</span> si este mes gastaste más o menos que tu ritmo habitual.
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        <span className="font-semibold text-foreground">Proyectar:</span> estimá cuánto gastarás en lo que queda del año.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card summary pill */}
              {totalCards > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 rounded-xl mb-2">
                  <CreditCard size={14} className="text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Tarjetas:{" "}
                    <span className="font-semibold text-foreground">{fmtK(totalCards)}</span>
                    {" · "}
                    <span className="text-[11px]">{cardRatio.toFixed(1)}% del gasto total</span>
                  </p>
                </div>
              )}

              {/* Balance del año */}
              {(() => {
                const balance = totalI - totalG;
                return (
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                      balance >= 0
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-[#ff5c4d]/10 border border-[#ff5c4d]/20"
                    }`}
                  >
                    <span className="text-xs text-muted-foreground">Balance del año</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        balance >= 0 ? "text-emerald-500" : "text-[#ff5c4d]"
                      }`}
                    >
                      {balance >= 0 ? "+" : ""}
                      {fmtK(balance)}
                    </span>
                  </div>
                );
              })()}
            </section>

            {/* ── SECTION 2: Flujo Mensual ─────────────────────────────────── */}
            <section className="px-4 py-4 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Flujo Mensual
                </h2>
                <button
                  onClick={() => setShowFlowInfo(v => !v)}
                  className={`p-1 rounded-full transition-colors ${showFlowInfo ? "bg-primary/15 text-primary" : "hover:bg-secondary text-muted-foreground"}`}
                  aria-label="Cómo leer este gráfico"
                >
                  <Info size={13} />
                </button>
              </div>

              {/* Info box */}
              {showFlowInfo && (
                <div className="mb-3 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 space-y-1.5">
                  <p className="text-[11px] font-semibold text-foreground">¿Cómo leer este gráfico?</p>
                  <div className="flex items-start gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      <span className="font-medium text-foreground">Barra verde</span> — ingresos totales del mes (sueldos, freelance, etc.)
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#ff5c4d] flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      <span className="font-medium text-foreground">Barra roja</span> — gastos totales del mes, todos convertidos a ARS.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      <span className="font-medium text-foreground">Punto verde</span> — el mes cerró en superávit: gastaste menos de lo que ingresó.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      <span className="font-medium text-foreground">Punto naranja</span> — el mes cerró en déficit: los gastos superaron los ingresos.
                    </p>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 opacity-85" />
                  <span className="text-[10px] text-muted-foreground">Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#ff5c4d] opacity-85" />
                  <span className="text-[10px] text-muted-foreground">Gastos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Superávit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-muted-foreground">Déficit</span>
                </div>
              </div>
              <MonthlyFlowChart monthlyI={monthlyI} monthlyG={monthlyG} />
            </section>

            {/* ── SECTION 3: Evolución Tarjetas ────────────────────────────── */}
            {(totalCards > 0 || loadingCards) && (
              <section className="px-4 py-4 border-b border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Evolución de Tarjetas
                  </h2>
                  {!loadingCards && totalCards > 0 && (
                    <button
                      onClick={() => setCardZoomed(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary hover:bg-muted transition-colors"
                    >
                      <Maximize2 size={12} className="text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">Zoom</span>
                    </button>
                  )}
                </div>
                {loadingCards ? (
                  <div className="h-36 rounded-2xl bg-secondary/60 animate-pulse" />
                ) : (
                  <>
                    {/* Legend (toggle buttons) */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {CARD_LINES.map(l => (
                        <button
                          key={l.key}
                          onClick={() => toggleLine(l.key)}
                          className={`flex items-center gap-1.5 transition-opacity ${hiddenLines.has(l.key) ? "opacity-30" : "opacity-100"}`}
                        >
                          <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-[10px] text-muted-foreground">{l.label}</span>
                        </button>
                      ))}
                    </div>
                    <CardLineChart visaARS={visaARSTrimmed} mcARS={mcARSTrimmed} hidden={hiddenLines} />
                    {/* Summary pills */}
                    <div className="flex gap-2 mt-3">
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 bg-secondary/60 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-[#1565C0] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">VISA</p>
                          <p className="text-xs font-bold tabular-nums text-foreground">{fmtK(visaTotal)}</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 bg-secondary/60 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-[#eb001b] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">MC</p>
                          <p className="text-xs font-bold tabular-nums text-foreground">{fmtK(mcTotal)}</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 bg-secondary/60 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-[#7c3aed] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</p>
                          <p className="text-xs font-bold tabular-nums text-foreground">{fmtK(totalCards)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ── SECTION 4: Gastos por Categoría ──────────────────────────── */}
            <section className="px-4 py-4 border-b border-border/30">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Gastos por Categoría
              </h2>
              <div className="space-y-3">
                {catBreakdown.map((cat) => {
                  const pct = totalG > 0 ? (cat.total / totalG) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                          style={{ backgroundColor: (cat.color ?? "#e5e7eb") + "33" }}
                        >
                          {cat.icon ?? "📦"}
                        </div>
                        <span className="flex-1 text-xs font-medium text-foreground truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-xs font-semibold text-foreground tabular-nums ml-1">
                          {fmtK(cat.total)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: cat.color ?? "#e5e7eb",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── SECTION 5: Comparativa por Mes ───────────────────────────── */}
            {monthTable.length > 1 && (
              <section className="px-4 py-4 border-b border-border/30">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Comparativa por Mes
                </h2>
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-5 bg-secondary/60 px-3 py-2">
                    {["Mes", "Ingr.", "Gasto", "Neto", "Ahorro"].map((h, hi) => (
                      <span
                        key={h}
                        className={`text-[9px] uppercase tracking-wide text-muted-foreground font-semibold ${
                          hi === 0 ? "text-left" : "text-right"
                        }`}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {/* Rows */}
                  {monthTable.map((row, idx) => (
                    <div
                      key={row.i}
                      className={`grid grid-cols-5 px-3 py-2 text-xs ${
                        idx % 2 === 0 ? "bg-card" : "bg-secondary/20"
                      }`}
                    >
                      <span className="font-semibold text-foreground">{row.label}</span>
                      <span className="text-right tabular-nums text-emerald-500">
                        {fmtK(row.ingr)}
                      </span>
                      <span className="text-right tabular-nums text-[#ff5c4d]">
                        {fmtK(row.g)}
                      </span>
                      <span
                        className={`text-right tabular-nums ${
                          row.net >= 0 ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {row.net >= 0 ? "+" : ""}
                        {fmtK(row.net)}
                      </span>
                      <span
                        className={`text-right tabular-nums ${
                          row.rate >= 20
                            ? "text-emerald-500"
                            : row.rate >= 0
                            ? "text-amber-500"
                            : "text-[#ff5c4d]"
                        }`}
                      >
                        {row.rate.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── SECTION 6: Top 10 Gastos ──────────────────────────────────── */}
            <section className="px-4 py-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Top 10 Gastos del Año
              </h2>
              <div className="space-y-2">
                {topGastos.map((g, idx) => {
                  const isNonARS = g.currencySymbol !== "$" && g.currency !== "ARS";
                  let dateStr = "";
                  try {
                    dateStr = format(new Date(g.dateTime), "d MMM", { locale: es });
                  } catch {
                    dateStr = "";
                  }
                  return (
                    <div key={g.id} className="flex items-center gap-2.5">
                      <span className="text-[10px] text-muted-foreground w-5 text-right flex-shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <div
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm flex-shrink-0"
                        style={
                          g.categoryColor
                            ? { backgroundColor: g.categoryColor + "33" }
                            : undefined
                        }
                      >
                        {g.categoryIcon ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate leading-tight">
                          {g.description}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate leading-tight">
                          {dateStr}
                          {g.category ? ` · ${g.category}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-[#ff5c4d] tabular-nums">
                          {fmtK(g.arsValue)}
                        </p>
                        {isNonARS && (
                          <p className="text-[9px] text-muted-foreground tabular-nums">
                            {g.currencySymbol}
                            {g.amount.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Spacer */}
            <div className="h-20" />
          </>
        )}
      </main>

      {/* ── Card chart fullscreen zoom ─────────────────────────────────────── */}
      {cardZoomed && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div>
              <h3 className="text-sm font-bold text-foreground">Evolución de Tarjetas</h3>
              <div className="flex items-center gap-3 mt-1">
                {CARD_LINES.map(l => (
                  <button
                    key={l.key}
                    onClick={() => toggleLine(l.key)}
                    className={`flex items-center gap-1.5 transition-opacity ${hiddenLines.has(l.key) ? "opacity-30" : "opacity-100"}`}
                  >
                    <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setCardZoomed(false)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Scrollable chart */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center px-2">
            <CardLineChart visaARS={visaARSTrimmed} mcARS={mcARSTrimmed} hidden={hiddenLines} zoomed />
          </div>

          {/* Summary pills */}
          <div className="flex-shrink-0 flex gap-2 px-4 pb-6 pt-2">
            {[
              { label: "VISA", value: visaTotal, color: "#1565C0" },
              { label: "MC", value: mcTotal, color: "#eb001b" },
              { label: "Total", value: totalCards, color: "#7c3aed" },
            ].map(c => (
              <div key={c.label} className="flex-1 flex items-center gap-1.5 px-3 py-2.5 bg-secondary/60 rounded-xl">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{c.label}</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">{fmtK(c.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
