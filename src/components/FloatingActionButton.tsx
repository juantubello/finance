import { Plus, Mic } from "lucide-react";

interface Props {
  onAdd: () => void;
  onVoice: () => void;
}

export default function FloatingActionButton({ onAdd, onVoice }: Props) {
  return (
    <div className="fixed bottom-6 inset-x-0 flex items-center justify-between px-5 pointer-events-none z-50">
      {/* Left: manual add */}
      <button
        onClick={onAdd}
        className="pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-card hover:bg-secondary active:scale-95 transition-all"
        aria-label="Agregar manualmente"
      >
        <Plus size={20} className="text-foreground" strokeWidth={2.5} />
      </button>

      {/* Right: voice */}
      <button
        onClick={onVoice}
        className="pointer-events-auto w-16 h-16 rounded-full bg-[#ff5c4d] shadow-lg flex items-center justify-center hover:bg-[#e54535] active:scale-95 transition-all"
        aria-label="Agregar por voz"
      >
        <Mic size={26} className="text-white" />
      </button>
    </div>
  );
}
