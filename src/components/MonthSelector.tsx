import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const next = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex items-center justify-between px-1">
      <button onClick={prev} className="p-2 rounded-full hover:bg-secondary transition-colors">
        <ChevronLeft size={20} className="text-muted-foreground" />
      </button>
      <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
        {MONTH_NAMES[month - 1]} {year}
      </h2>
      <button onClick={next} className="p-2 rounded-full hover:bg-secondary transition-colors">
        <ChevronRight size={20} className="text-muted-foreground" />
      </button>
    </div>
  );
}
