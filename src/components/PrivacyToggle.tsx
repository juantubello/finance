import { Eye, EyeOff } from "lucide-react";

interface Props {
  privacyMode: boolean;
  onToggle: () => void;
}

export default function PrivacyToggle({ privacyMode, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
        privacyMode
          ? "bg-foreground text-background"
          : "hover:bg-secondary text-muted-foreground"
      }`}
      title={privacyMode ? "Mostrar importes" : "Ocultar importes"}
    >
      {privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}
