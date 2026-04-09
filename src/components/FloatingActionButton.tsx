import { Plus, Mic, Search } from "lucide-react";
import { triggerSelectionHaptic } from "@/lib/haptics";

interface Props {
  onAdd: () => void;
  onVoice: () => void;
  showSearch?: boolean;
  searchActive?: boolean;
  onSearchToggle?: () => void;
}

export default function FloatingActionButton({ onAdd, onVoice, showSearch = false, searchActive = false, onSearchToggle }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div className="max-w-5xl mx-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] flex items-end justify-between">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/70 bg-card/80 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-card/85">
          <button
            onClick={() => {
              triggerSelectionHaptic();
              onAdd();
            }}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white/70 text-foreground hover:bg-white dark:bg-secondary/90 dark:hover:bg-secondary active:scale-95 transition-all"
            aria-label="Agregar manualmente"
          >
            <Plus size={18} className="text-foreground" strokeWidth={2.5} />
          </button>
          {showSearch && (
            <button
              onClick={() => {
                triggerSelectionHaptic();
                onSearchToggle?.();
              }}
              className={`flex lg:hidden items-center justify-center w-11 h-11 rounded-full active:scale-95 transition-all ${
                searchActive
                  ? "bg-foreground text-background shadow-subtle"
                  : "bg-white/70 text-foreground hover:bg-white dark:bg-secondary/90 dark:hover:bg-secondary"
              }`}
              aria-label="Buscar gastos"
            >
              <Search size={18} strokeWidth={2.2} />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            triggerSelectionHaptic();
            onVoice();
          }}
          className="pointer-events-auto w-14 h-14 rounded-full border border-[#ff5c4d] bg-[#ff5c4d] shadow-[0_4px_10px_rgba(15,23,42,0.10)] flex items-center justify-center hover:bg-[#f45142] active:scale-95 transition-all"
          aria-label="Agregar por voz"
        >
          <Mic size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
}
