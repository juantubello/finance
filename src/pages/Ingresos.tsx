import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import PrivacyToggle from "@/components/PrivacyToggle";
import { useNavigate } from "react-router-dom";
import { useIngresos, useIngresosForYear, useIncomeCategories, useAvailable, useGastos, useGastosForYear, useDolarBlue, useUSDCARS } from "@/hooks/useApi";
import DateFilter, { type FilterMode } from "@/components/DateFilter";
import SkeletonList from "@/components/SkeletonList";
import type { IngresoResponse } from "@/types/api";

interface Props {
  onEditIngreso: (i: IngresoResponse) => void;
  onMenu: () => void;
  onSettings: () => void;
  filterMode: FilterMode;
  year: number;
  month: number;
  onFilterModeChange: (mode: FilterMode) => void;
  onDateChange: (year: number, month: number) => void;
}

export default function Ingresos({ onEditIngreso, onMenu, onSettings, filterMode, year, month, onFilterModeChange, onDateChange }: Props) {
  const navigate = useNavigate();
  const { privacyMode, toggle: togglePrivacy, mask } = usePrivacyMode();
  const [pillReady, setPillReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setPillReady(true)); }, []);
  const [search, setSearch] = useState("");
  const [conversionMode, setConversionMode] = useState<"blue" | "usdc">("blue");

  const monthQuery = useIngresos(filterMode === "month" ? year : 0, filterMode === "month" ? month : 0);
  const yearQuery = useIngresosForYear(filterMode === "year" ? year : 0);

  // Sparkline — always fetch regardless of filter mode (react-query deduplicates)
  const sparkCurYear = useIngresosForYear(year);
  const sparkPrevYear = useIngresosForYear(month <= 6 ? year - 1 : 0);
  const ingresos = (filterMode === "year" ? yearQuery.data : monthQuery.data) ?? [];
  const isLoading = filterMode === "year" ? yearQuery.isLoading : monthQuery.isLoading;
  const error = filterMode === "month" ? monthQuery.error : null;
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: available } = useAvailable();
  const { data: dolarBlue } = useDolarBlue();
  const { data: usdcARS } = useUSDCARS();

  // Gastos total for the pill (cross-fetch, likely already cached)
  const gasMonthQ = useGastos(filterMode === "month" ? year : 0, filterMode === "month" ? month : 0);
  const gasYearQ = useGastosForYear(filterMode === "year" ? year : 0);
  const gastosData = (filterMode === "year" ? gasYearQ.data : gasMonthQ.data) ?? [];
  const gastosTotal = useMemo(() => gastosData.reduce((s, g) => s + g.amount, 0), [gastosData]);

  const conversionRate = conversionMode === "blue" ? dolarBlue?.compra : usdcARS?.compra;

  const categoryColorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of incomeCategories) {
      if (c.id != null && c.color) map.set(c.id, c.color);
    }
    return map;
  }, [incomeCategories]);

  // Sparkline: last 6 months of income totals in ARS
  const sparkData = useMemo(() => {
    const allData = [...(sparkPrevYear.data ?? []), ...(sparkCurYear.data ?? [])];
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i));
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const entries = allData.filter(ing => {
        const dt = new Date(ing.dateTime);
        return dt.getFullYear() === y && dt.getMonth() + 1 === m;
      });
      const total = entries.reduce((s, ing) => {
        const isUSD = ing.currencySymbol === "USD" || ing.currencySymbol === "U$S";
        return s + (isUSD && conversionRate ? ing.amount * conversionRate : ing.amount);
      }, 0);
      return { year: y, month: m, total };
    });
  }, [sparkCurYear.data, sparkPrevYear.data, year, month, conversionRate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ingresos;
    const q = search.toLowerCase();
    return ingresos.filter(i => i.description.toLowerCase().includes(q));
  }, [ingresos, search]);

  // Total in ARS (USD amounts converted using selected rate)
  const total = useMemo(() => {
    if (!ingresos.length) return null;
    let arsSum = 0;
    for (const i of ingresos) {
      const isUSD = i.currencySymbol === "USD" || i.currencySymbol === "U$S";
      arsSum += isUSD && conversionRate ? i.amount * conversionRate : i.amount;
    }
    return { total: arsSum };
  }, [ingresos, conversionRate]);

  const totalUSDIncome = useMemo(() =>
    ingresos.filter(i => i.currencySymbol === "USD" || i.currencySymbol === "U$S")
            .reduce((s, i) => s + i.amount, 0),
    [ingresos]
  );


  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto lg:max-w-3xl animate-page-from-right">
      <div className="flex-shrink-0">
        <DateFilter
          mode={filterMode}
          year={year}
          month={month}
          onModeChange={onFilterModeChange}
          onChange={onDateChange}
          onMenu={onMenu}
          onSettings={onSettings}
          extraAction={<PrivacyToggle privacyMode={privacyMode} onToggle={togglePrivacy} />}
        />
      </div>

      {/* Disponible + conversion toggle + segmented pill */}
      <div className="px-5 pb-2 flex-shrink-0 flex flex-col items-center text-center">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-20 bg-secondary rounded animate-pulse mx-auto" />
            <div className="h-10 w-48 bg-secondary rounded-lg animate-pulse mx-auto" />
            <div className="h-7 w-44 bg-secondary rounded-full animate-pulse mx-auto mt-1" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-0.5">Disponible</p>
            <div className="flex items-baseline gap-2 justify-center mb-2">
              <span className={`text-4xl font-bold tracking-tighter tabular ${available && available.disponible < 0 ? "text-red-500" : "text-foreground"}`}>
                ${mask((available?.disponible ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0 }))}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">{available?.moneda ?? "ARS"}</span>
            </div>

            <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 overflow-hidden w-full max-w-xs">
              <button
                onClick={() => navigate("/")}
                style={{ flexGrow: pillReady ? 38 : 50, transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)" }}
                className="py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                — Gastos
              </button>
              <button
                style={{ flexGrow: pillReady ? 62 : 50, transition: "flex-grow 0.45s cubic-bezier(0.16,1,0.3,1)" }}
                className="py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-shrink-0 min-w-0 bg-emerald-500 text-white shadow-sm"
              >
                {total ? `$${mask(total.total.toLocaleString("es-AR", { minimumFractionDigits: 0 }))} ARS` : "+ Ingresos"}
              </button>
            </div>

            {/* Blue / USDC conversion toggle — below the main pill */}
            {(dolarBlue || usdcARS) && (
              <div className="flex rounded-full border border-border/50 bg-secondary/60 p-0.5 mt-2">
                {dolarBlue && (
                  <button
                    onClick={() => setConversionMode("blue")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      conversionMode === "blue"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Blue ${dolarBlue.compra.toLocaleString("es-AR")}
                  </button>
                )}
                {usdcARS && (
                  <button
                    onClick={() => setConversionMode("usdc")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      conversionMode === "usdc"
                        ? "bg-teal-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    USDC · ARQ ${usdcARS.compra.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </button>
                )}
              </div>
            )}
            {dolarBlue && usdcARS && (() => {
              const diff = usdcARS.compra - dolarBlue.compra;
              if (diff <= 0) return null;
              const totalGain = totalUSDIncome * diff;
              return (
                <div className="mt-1 flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="text-[11px] text-teal-500 font-semibold">
                    +${diff.toLocaleString("es-AR", { maximumFractionDigits: 0 })} ARS/USD usando USDC vs Blue
                  </span>
                  {totalUSDIncome > 0 && (
                    <>
                      <span className="text-[11px] text-muted-foreground/50">·</span>
                      <span className="text-[11px] text-teal-500 font-bold">
                        +${mask(totalGain.toLocaleString("es-AR", { maximumFractionDigits: 0 }))} ARS en tus ingresos
                      </span>
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Sparkline */}
      <div className="flex-shrink-0 px-5 pb-2">
        <IncomeSparkline
          data={sparkData}
          currentMonth={month}
          currentYear={year}
          privacyMode={privacyMode}
          mask={mask}
        />
      </div>

      {/* Search */}
      <div className="px-5 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ingresos..."
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {error ? (
          <div className="mx-5 mt-2 p-4 rounded-2xl bg-red-50 text-red-500 text-sm">
            Error al cargar los ingresos.
          </div>
        ) : isLoading ? (
          <SkeletonList />
        ) : (
          <div className="animate-fade-in">
            {filtered.map(i => (
              <IngresoRow
                key={i.id}
                ingreso={i}
                categoryColor={i.categoryColor ?? (i.categoryId != null ? categoryColorMap.get(i.categoryId) ?? null : null)}
                onClick={() => onEditIngreso(i)}
                conversionRate={conversionRate}
                privacyMode={privacyMode}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                No hay ingresos registrados. Tocá '+' para agregar.
              </p>
            )}
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
}

const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function IncomeSparkline({ data, currentMonth, currentYear, privacyMode, mask }: {
  data: { year: number; month: number; total: number }[];
  currentMonth: number;
  currentYear: number;
  privacyMode: boolean;
  mask: (v: string) => string;
}) {
  if (!data.length || data.every(d => d.total === 0)) return null;

  const W = 320, H = 100, PAD_X = 16, PAD_TOP = 24, PAD_BOTTOM = 20;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const max = Math.max(...data.map(d => d.total), 1);
  const n = data.length;
  const step = (W - PAD_X * 2) / (n - 1);

  const pts = data.map((d, i) => ({
    x: PAD_X + i * step,
    y: PAD_TOP + chartH * (1 - d.total / max),
    ...d,
  }));

  // Smooth bezier path
  const linePath = pts.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${path} C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, "");

  const areaPath = `${linePath} L ${pts[n - 1].x},${H - PAD_BOTTOM} L ${pts[0].x},${H - PAD_BOTTOM} Z`;

  // % change vs previous month
  const cur = data[n - 1].total;
  const prev = data[n - 2]?.total ?? 0;
  const pct = prev > 0 ? ((cur - prev) / prev) * 100 : null;

  return (
    <div className="rounded-2xl bg-secondary/40 border border-border/40 p-3">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Últimos 6 meses</span>
        {pct !== null && (
          <span className={`text-[11px] font-bold ${pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {pct >= 0 ? "↑" : "↓"} {Math.abs(pct).toFixed(0)}% vs mes ant.
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#incomeGrad)" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => {
          const isCurrent = p.year === currentYear && p.month === currentMonth;
          const showYear = i === 0 || pts[i - 1].year !== p.year;
          return (
            <g key={i}>
              {isCurrent && <circle cx={p.x} cy={p.y} r={10} fill="#10b981" opacity={0.12} />}
              <circle cx={p.x} cy={p.y} r={isCurrent ? 4.5 : 2.5} fill="#10b981" opacity={isCurrent ? 1 : 0.55} />

              {/* Amount above current point */}
              {isCurrent && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={9} fill="#10b981" fontWeight="bold">
                  {privacyMode ? "***" : `$${p.total >= 1_000_000 ? `${(p.total / 1_000_000).toFixed(1)}M` : p.total >= 1000 ? `${Math.round(p.total / 1000)}K` : Math.round(p.total)}`}
                </text>
              )}

              {/* Month label */}
              <text
                x={p.x}
                y={H - 4}
                textAnchor="middle"
                fontSize={9}
                fill={isCurrent ? "#10b981" : "#9ca3af"}
                fontWeight={isCurrent ? "bold" : "normal"}
              >
                {showYear && p.year !== currentYear ? `${MONTH_SHORT[p.month - 1]} '${String(p.year).slice(2)}` : MONTH_SHORT[p.month - 1]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function IngresoRow({ ingreso, categoryColor, onClick, conversionRate, privacyMode }: {
  ingreso: IngresoResponse;
  categoryColor: string | null;
  onClick: () => void;
  conversionRate?: number;
  privacyMode?: boolean;
}) {
  const isUSD = ingreso.currencySymbol === "USD" || ingreso.currencySymbol === "U$S";
  const arsValue = isUSD && conversionRate ? ingreso.amount * conversionRate : undefined;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-1 px-4 active:bg-secondary/60 transition-colors duration-200 text-left border-b border-border/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: categoryColor ?? "var(--secondary)" }}
        >
          {ingreso.categoryIcon || "💰"}
        </div>
        <div className="min-w-0">
          {ingreso.category && (
            <span
              className="inline-block text-[9px] font-semibold px-1 py-px rounded-full mb-0.5"
              style={{ backgroundColor: categoryColor ?? "#e5e7eb", color: "#374151" }}
            >
              {ingreso.category}
            </span>
          )}
          <div className="text-sm font-medium text-foreground truncate">{ingreso.description}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(ingreso.dateTime), "dd/MM/yyyy")}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 ml-3">
        <div className="text-sm font-semibold tabular text-emerald-500">
          {privacyMode ? "***" : `+ ${ingreso.currencySymbol} ${ingreso.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
        </div>
        {arsValue !== undefined && (
          <div className="text-[10px] text-muted-foreground tabular">
            {privacyMode ? "—" : `≈ $${arsValue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`}
          </div>
        )}
      </div>
    </button>
  );
}
