import { BarChart2 } from "lucide-react";
import PageShell from "@/components/PageShell";

interface Props {
  onMenu: () => void;
  onSettings: () => void;
}

export default function Estadisticas({ onMenu, onSettings }: Props) {
  return (
    <PageShell onMenu={onMenu} onSettings={onSettings}>
      {() => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <BarChart2 size={56} className="text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">Estadísticas</h2>
          <p className="text-sm text-muted-foreground">Próximamente podrás ver estadísticas detalladas de tus finanzas aquí.</p>
        </div>
      )}
    </PageShell>
  );
}
