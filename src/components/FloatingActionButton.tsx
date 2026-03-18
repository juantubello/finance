import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full bg-[#ff5c4d] shadow-lg flex items-center justify-center hover:bg-[#e54535] active:scale-95 transition-all"
      aria-label="Agregar"
    >
      <Plus size={24} className="text-white" strokeWidth={2.5} />
    </button>
  );
}
