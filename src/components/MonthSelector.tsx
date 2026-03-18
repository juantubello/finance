import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export default function MonthSelector({ year, month, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const next = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };
  const select = (m: number) => {
    onChange(pickerYear, m);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-1" ref={ref}>
      <button onClick={prev} className="p-2 rounded-full hover:bg-secondary transition-colors">
        <ChevronLeft size={20} className="text-muted-foreground" />
      </button>

      <div className="relative">
        <button
          onClick={() => { setPickerYear(year); setOpen(!open); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-secondary transition-colors"
        >
          <span className="text-sm font-semibold text-muted-foreground tracking-wide">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-card border border-border rounded-2xl shadow-lg z-50 p-3 w-64">
            {/* Year nav */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button onClick={() => setPickerYear(y => y - 1)} className="p-1 rounded-full hover:bg-secondary">
                <ChevronLeft size={16} className="text-muted-foreground" />
              </button>
              <span className="text-sm font-bold text-foreground">{pickerYear}</span>
              <button onClick={() => setPickerYear(y => y + 1)} className="p-1 rounded-full hover:bg-secondary">
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </div>
            {/* Month grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_NAMES.map((name, i) => {
                const isActive = pickerYear === year && i + 1 === month;
                return (
                  <button
                    key={i}
                    onClick={() => select(i + 1)}
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

      <button onClick={next} className="p-2 rounded-full hover:bg-secondary transition-colors">
        <ChevronRight size={20} className="text-muted-foreground" />
      </button>
    </div>
  );
}
