import { NavLink } from "react-router-dom";
import { LayoutGrid, Tag, PlusCircle } from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutGrid, label: "Gastos" },
  { to: "/add", icon: PlusCircle, label: "Agregar", isAction: true },
  { to: "/categories", icon: Tag, label: "Categorías" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label, isAction }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs transition-colors duration-200 ${
                isAction
                  ? "text-primary"
                  : isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`
            }
          >
            <Icon size={isAction ? 32 : 22} strokeWidth={isAction ? 1.5 : 2} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
