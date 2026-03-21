import { X, Home, PiggyBank, BarChart2, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

const items = [
  { label: "Inicio", icon: Home, to: "/" },
  { label: "Tarjetas", icon: CreditCard, to: "/tarjetas" },
  { label: "Ahorros", icon: PiggyBank, to: "/ahorros" },
  { label: "Estadísticas", icon: BarChart2, to: "/estadisticas" },
];

export default function SideMenu({ open, onClose }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-72 max-w-[80vw] h-full bg-card shadow-xl flex flex-col pt-6 pb-8 px-4 animate-slide-in-left">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <img src="/icons/icon.png" alt="Mis Finanzas" className="w-10 h-10 rounded-xl" />
            <span className="text-lg font-bold text-foreground">Mis Finanzas</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map(({ label, icon: Icon, to }) => (
            <button
              key={to}
              onClick={() => go(to)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
            >
              <Icon size={20} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
