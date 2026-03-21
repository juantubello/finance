import { useState, useEffect } from "react";
import { X, Trash2, Loader2, Check, ChevronDown } from "lucide-react";
import type { IngresoResponse } from "@/types/api";
import { useIncomeCategories, useCurrencies, useCreateIngreso, useUpdateIngreso, useDeleteIngreso } from "@/hooks/useApi";

const DEFAULT_INGRESO_CATEGORY_ID = 11; // Sueldo
const DEFAULT_AHORRO_CATEGORY_ID = 12;  // Ahorro

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAmountInput(s: string): number {
  if (/\d\.\d{3}/.test(s) || s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(s);
}

function formatARS(n: number): string {
  if (isNaN(n) || n === 0) return "";
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDatePill(d: string): string {
  const today = todayLocal();
  if (d === today) return "hoy";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

interface Props {
  open: boolean;
  onClose: () => void;
  ingreso?: IngresoResponse | null;
  defaultCategoryId?: number;
}

export default function IngresoModal({ open, onClose, ingreso, defaultCategoryId }: Props) {
  if (!open) return null;
  return <IngresoModalInner onClose={onClose} ingreso={ingreso} defaultCategoryId={defaultCategoryId} />;
}

function IngresoModalInner({ onClose, ingreso, defaultCategoryId }: Omit<Props, "open">) {
  const { data: categories = [] } = useIncomeCategories();
  const { data: currencies = [] } = useCurrencies();
  const createMut = useCreateIngreso();
  const updateMut = useUpdateIngreso();
  const deleteMut = useDeleteIngreso();

  const [description, setDescription] = useState(ingreso?.description ?? "");
  const [amount, setAmount] = useState(ingreso ? String(ingreso.amount) : "");
  const [categoryId, setCategoryId] = useState<number | null>(
    ingreso?.categoryId ?? defaultCategoryId ?? DEFAULT_INGRESO_CATEGORY_ID
  );
  const [currencyId, setCurrencyId] = useState<number | null>(
    ingreso?.currencyId != null ? Number(ingreso.currencyId) : (currencies[0]?.id ?? null)
  );
  const [dateTime, setDateTime] = useState(ingreso ? ingreso.dateTime.slice(0, 10) : todayLocal());
  const [amountFocused, setAmountFocused] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currencyId === null && currencies.length > 0) setCurrencyId(currencies[0].id);
  }, [currencies, currencyId]);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedCurrency = currencies.find(c => c.id === currencyId);
  const amountNum = parseAmountInput(amount);

  const handleSave = async () => {
    if (!description.trim()) { setError("Ingresá una descripción"); return; }
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setError("Ingresá un monto válido"); return; }
    if (!currencyId) { setError("Seleccioná una moneda"); return; }
    setError(null);
    setSaving(true);
    const data = {
      dateTime: new Date(dateTime + "T12:00:00").toISOString(),
      description: description.trim(),
      amount: amountNum,
      currencyId,
      categoryId: categoryId ?? null,
    };
    try {
      if (ingreso?.id != null) {
        await updateMut.mutateAsync({ id: ingreso.id, data });
      } else {
        await createMut.mutateAsync(data);
      }
      onClose();
    } catch {
      setError("Error al guardar. Intentá de nuevo.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ingreso?.id) return;
    setSaving(true);
    try {
      await deleteMut.mutateAsync(ingreso.id);
      onClose();
    } catch {
      setError("Error al eliminar.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-xl p-5 pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">
            {ingreso ? "Editar ingreso" : "Nuevo ingreso"}
          </h2>
          <div className="flex items-center gap-1">
            {ingreso && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <Trash2 size={17} className="text-muted-foreground" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="flex items-center gap-2 mb-3 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30">
            <span className="text-xs text-red-600 flex-1">¿Eliminar este ingreso?</span>
            <button onClick={handleDelete} disabled={saving} className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold">
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Sí"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold">No</button>
          </div>
        )}

        {/* Amount */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-bold text-emerald-500">{selectedCurrency?.symbol ?? "$"}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountFocused ? amount : (amount ? formatARS(amountNum) : "")}
            onChange={e => setAmount(e.target.value)}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            placeholder="0,00"
            className="flex-1 text-3xl font-bold text-emerald-500 bg-transparent outline-none placeholder:text-muted-foreground/30"
          />
        </div>

        {/* Description */}
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción"
          className="w-full h-11 px-4 rounded-2xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-emerald-400/30 mb-3"
        />

        {/* Row: date + currency + category */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Date */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(v => !v)}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-secondary text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {formatDatePill(dateTime)} <ChevronDown size={11} className="text-muted-foreground" />
            </button>
            {showDatePicker && (
              <div className="absolute top-full mt-1 left-0 z-10 bg-card border border-border rounded-2xl shadow-lg p-2">
                <input
                  type="date"
                  value={dateTime}
                  onChange={e => { setDateTime(e.target.value); setShowDatePicker(false); }}
                  className="h-9 px-3 rounded-xl bg-secondary text-foreground text-sm outline-none"
                />
              </div>
            )}
          </div>

          {/* Currency */}
          {currencies.length > 1 && (
            <select
              value={currencyId ?? ""}
              onChange={e => setCurrencyId(Number(e.target.value))}
              className="px-3 h-8 rounded-full bg-secondary text-xs font-medium text-foreground outline-none"
            >
              {currencies.map(c => (
                <option key={c.id} value={c.id}>{c.symbol} {c.name}</option>
              ))}
            </select>
          )}

          {/* Category */}
          <select
            value={categoryId ?? ""}
            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 h-8 rounded-full bg-secondary text-xs font-medium text-foreground outline-none flex-1 min-w-0"
          >
            <option value="">Sin categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "Guardando..." : ingreso ? "Guardar cambios" : "Registrar ingreso"}
        </button>
      </div>
    </div>
  );
}
