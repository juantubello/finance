import { Plus, Mic } from "lucide-react";

interface Props {
  onAdd: () => void;
  onVoice: () => void;
}

export default function FloatingActionButton({ onAdd, onVoice }: Props) {
  return (
    <div className="fixed bottom-5 inset-x-0 pointer-events-none z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-5">
        {/* Left: manual add */}
        <button
          onClick={onAdd}
          className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-card hover:bg-secondary active:scale-95 transition-all"
          aria-label="Agregar manualmente"
        >
          <Plus size={17} className="text-foreground" strokeWidth={2.5} />
        </button>

        {/* Right: voice */}
        <button
          onClick={onVoice}
          className="pointer-events-auto w-13 h-13 rounded-full bg-[#ff5c4d] shadow-lg flex items-center justify-center hover:bg-[#e54535] active:scale-95 transition-all"
          aria-label="Agregar por voz"
          style={{ width: 52, height: 52 }}
        >
          <Mic size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}
