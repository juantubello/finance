import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type FilterMode = "month" | "year";

interface Props {
  mode: FilterMode;
  year: number;
  month: number;
  onModeChange: (mode: FilterMode) => void;
  onChange: (year: number, month: number) => void;
}

export default function DateFilter({ mode, year, month, onModeChange, onChange }: Props) {
  const [openPicker, setOpenPicker] = useState<"month" | "year" | null>(null);
  const [pickerYear, setPickerYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  // Sync pickerYear when year changes externally
  useEffect(() => {
    setPickerYear(year);
  }, [year]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenPicker(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Month quick navigation (applies immediately)
  const prevMonth = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  // Year: only navigate picker, don't change data
  const pickerPrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerYear((y) => y - 1);
    setOpenPicker("year");
  };
  const pickerNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerYear((y) => y + 1);
    setOpenPicker("year");
  };

  const selectYear = (y: number) => {
    onChange(y, month);
    onModeChange("year");
    setOpenPicker(null);
  };

  const selectMonth = (m: number) => {
    onChange(pickerYear, m);
    onModeChange("month");
    setOpenPicker(null);
  };

  const toggleYearPicker = () => {
    setPickerYear(year);
    setOpenPicker(openPicker === "year" ? null : "year");
  };

  const toggleMonthPicker = () => {
    setPickerYear(year);
    setOpenPicker(openPicker === "month" ? null : "month");
  };

  return (
    <div className="flex items-center gap-2 pt-5 pb-3 px-5" ref={ref}>

      {/* ── Year pill ── */}
      <div className="relative flex items-center gap-0.5">
        {/* These arrows only navigate the picker year, they don't change data */}
        <button
          onClick={pickerPrevYear}
          className="p-1 rounded-full hover:bg-secondary transition-colors"
          title="Año anterior (solo navegación)"
        >
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>

        <button
          onClick={() => { onModeChange("year"); toggleYearPicker(); }}
          className={`flex items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            mode === "year"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {year}
          <ChevronDown size={11} />
        </button>

        <button
          onClick={pickerNextYear}
          className="p-1 rounded-full hover:bg-secondary transition-colors"
          title="Año siguiente (solo navegación)"
        >
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>

        {/* Year dropdown */}
        {openPicker === "year" && (
          <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 p-3 w-52">
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                onClick={() => setPickerYear((y) => y - 1)}
                className="p-1 rounded-full hover:bg-secondary"
              >
                <ChevronLeft size={14} className="text-muted-foreground" />
              </button>
              <span className="text-xs font-bold text-muted-foreground">Seleccionar año</span>
              <button
                onClick={() => setPickerYear((y) => y + 1)}
                className="p-1 rounded-full hover:bg-secondary"
              >
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }, (_, i) => pickerYear - 2 + i).map((y) => (
                <button
                  key={y}
                  onClick={() => selectYear(y)}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    y === year ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Month pill ── */}
      <div className="relative flex items-center gap-0.5">
        <button
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-secondary transition-colors"
        >
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>

        <button
          onClick={() => { onModeChange("month"); toggleMonthPicker(); }}
          className={`flex items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            mode === "month"
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {MONTH_NAMES[month - 1].slice(0, 3)}
          <ChevronDown size={11} />
        </button>

        <button
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-secondary transition-colors"
        >
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>

        {/* Month dropdown */}
        {openPicker === "month" && (
          <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 p-3 w-64">
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                onClick={() => setPickerYear((y) => y - 1)}
                className="p-1 rounded-full hover:bg-secondary"
              >
                <ChevronLeft size={14} className="text-muted-foreground" />
              </button>
              <span className="text-sm font-bold text-foreground">{pickerYear}</span>
              <button
                onClick={() => setPickerYear((y) => y + 1)}
                className="p-1 rounded-full hover:bg-secondary"
              >
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_NAMES.map((name, i) => {
                const isActive = pickerYear === year && i + 1 === month;
                return (
                  <button
                    key={i}
                    onClick={() => selectMonth(i + 1)}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
