import { Menu, Settings } from "lucide-react";

interface Props {
  onMenuClick: () => void;
  onSettingsClick: () => void;
}

export default function TopBar({ onMenuClick, onSettingsClick }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-2 h-14 max-w-lg mx-auto">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Menú"
        >
          <Menu size={22} className="text-foreground" />
        </button>
        <span className="text-base font-semibold text-foreground">Mis Finanzas</span>
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Configuración"
        >
          <Settings size={22} className="text-foreground" />
        </button>
      </div>
    </header>
  );
}
