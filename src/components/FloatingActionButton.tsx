import { Plus, Mic } from "lucide-react";

interface Props {
  onAdd: () => void;
  onVoice: () => void;
}

export default function FloatingActionButton({ onAdd, onVoice }: Props) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div className="max-w-5xl mx-auto">
        <div className="bg-card/90 backdrop-blur-md border-t border-border/40 px-8 pt-2 pb-3 flex items-center justify-between">
          {/* Left: manual add */}
          <button
            onClick={onAdd}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-secondary hover:bg-muted border border-border active:scale-95 transition-all"
            aria-label="Agregar manualmente"
          >
            <Plus size={18} className="text-foreground" strokeWidth={2.5} />
          </button>

          {/* Right: voice */}
          <button
            onClick={onVoice}
            className="w-11 h-11 rounded-full bg-[#ff5c4d] shadow-md flex items-center justify-center hover:bg-[#e54535] active:scale-95 transition-all"
            aria-label="Agregar por voz"
          >
            <Mic size={19} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
