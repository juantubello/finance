import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CreditCard, Tag, Zap, Image } from "lucide-react";

const items = [
  { label: "Tarjetas", description: "Gestionar tarjetas registradas", icon: CreditCard, to: "/cards/config/cards" },
  { label: "Categorías de tarjeta", description: "Categorías para gastos de tarjeta", icon: Tag, to: "/cards/config/categories" },
  { label: "Reglas de categorización", description: "Keyword → categoría automática", icon: Zap, to: "/cards/config/category-rules" },
  { label: "Reglas de logos", description: "Keyword → imagen del comercio", icon: Image, to: "/cards/config/logo-rules" },
];

export default function CardConfig() {
  const navigate = useNavigate();

  return (
    <div className="pb-28 max-w-lg mx-auto pt-6 px-5">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Configuración tarjetas</h1>
      </div>

      <div className="space-y-2">
        {items.map(({ label, description, icon: Icon, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card shadow-subtle hover:bg-secondary/60 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Icon size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
