import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { useCreateGasto } from "@/hooks/useApi";

export interface VoiceExpenseDraft {
  description: string;
  amount: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  currencyId: number;
  currencyCode: string;
  currencySymbol: string;
}

interface Props {
  draft: VoiceExpenseDraft | null;
  onEdit: (draft: VoiceExpenseDraft) => void;
  onDismiss: () => void;
  onSaved: () => void;
}

function todayLocalIsoAtNoon() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return new Date(`${yyyy}-${mm}-${dd}T12:00:00`).toISOString();
}

export default function VoiceExpenseQuickConfirm({ draft, onEdit, onDismiss, onSaved }: Props) {
  const createMut = useCreateGasto();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setSecondsLeft(10);
    setError(null);
    setSubmitting(false);
  }, [draft]);

  const handleAccept = async () => {
    if (!draft || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createMut.mutateAsync({
        dateTime: todayLocalIsoAtNoon(),
        description: draft.description.trim(),
        amount: draft.amount,
        categoryId: draft.categoryId,
        currencyId: draft.currencyId,
        senderDeviceId: localStorage.getItem("deviceId"),
      });
      onSaved();
    } catch {
      setError("No se pudo guardar.");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!draft || submitting) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          void handleAccept();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [draft, submitting]);

  const progress = useMemo(() => `${Math.max(0, (secondsLeft / 10) * 100)}%`, [secondsLeft]);

  if (!draft) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[65] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+84px)] pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto rounded-[28px] border border-border bg-white dark:bg-card p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            style={{ backgroundColor: draft.categoryColor ?? "#e5e7eb" }}
          >
            {draft.categoryIcon || "🛒"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted-foreground truncate">{draft.categoryName}</p>
            <p
              className="text-[0.98rem] leading-[1.2] font-semibold text-foreground"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {draft.description}
            </p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              Moneda: {draft.currencyCode}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center rounded-full px-3 py-1.5 text-[0.86rem] font-semibold tabular bg-white text-expense shadow-subtle dark:bg-secondary dark:text-expense">
              - {draft.currencySymbol} {draft.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onDismiss}
                disabled={submitting}
                className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center disabled:opacity-50"
                aria-label="Eliminar borrador"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => onEdit(draft)}
                disabled={submitting}
                className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center disabled:opacity-50"
                aria-label="Editar antes de guardar"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => void handleAccept()}
                disabled={submitting}
                className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center disabled:opacity-60"
                aria-label="Aceptar"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-linear" style={{ width: progress }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{error ?? `Se guarda automaticamente en ${secondsLeft}s`}</span>
            {error && (
              <button onClick={() => void handleAccept()} className="font-semibold text-emerald-600">
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
