import { useState } from "react";
import DateFilter, { type FilterMode } from "@/components/DateFilter";

interface Props {
  onMenu: () => void;
  onSettings: () => void;
  children: (year: number, month: number, filterMode: FilterMode) => React.ReactNode;
}

const now = new Date();

export default function PageShell({ onMenu, onSettings, children }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto">
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
        {children(year, month, filterMode)}
      </div>
    </div>
  );
}
