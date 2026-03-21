import { useState, useEffect } from "react";
import { X, Trash2, Loader2, Check, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import type { SavingMovement } from "@/types/api";
import { useSavingAssets, useCreateSaving, useUpdateSaving, useDeleteSaving } from "@/hooks/useApi";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCantidad(s: string): number {
  // Handle both decimal comma (0,005197) and decimal point (0.005197)
  // If both present (e.g. "1.234,56"): dots are thousands separators
  const hasBoth = s.includes(",") && s.includes(".");
  if (hasBoth) return parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (s.includes(",")) return parseFloat(s.replace(",", "."));
  return parseFloat(s);
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
  movimiento?: SavingMovement | null;
}

export default function AhorroModal({ open, onClose, movimiento }: Props) {
  if (!open) return null;
  return <AhorroModalInner onClose={onClose} movimiento={movimiento} />;
}

function AhorroModalInner({ onClose, movimiento }: Omit<Props, "open">) {
  const { data: assets = [] } = useSavingAssets();
  const createMut = useCreateSaving();
  const updateMut = useUpdateSaving();
  const deleteMut = useDeleteSaving();

  const [activoId, setActivoId] = useState<number | null>(movimiento?.activoId ?? null);
  const [isDeposit, setIsDeposit] = useState(movimiento ? movimiento.cantidad >= 0 : true);
  const [cantidad, setCantidad] = useState(movimiento ? String(Math.abs(movimiento.cantidad)) : "");
  const [precioArs, setPrecioArs] = useState(movimiento?.precioArs ? String(movimiento.precioArs) : "");
  const [description, setDescription] = useState(movimiento?.description ?? "");
  const [dateTime, setDateTime] = useState(movimiento ? movimiento.dateTime.slice(0, 10) : todayLocal());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activoId === null && assets.length > 0) setActivoId(assets[0].id);
  }, [assets, activoId]);

  const selectedAsset = assets.find(a => a.id === activoId);
  const step = selectedAsset ? (1 / Math.pow(10, selectedAsset.decimales)).toString() : "0.01";

  const tipoIcon = (tipo: string) => {
    if (tipo === "crypto") return "₿";
    if (tipo === "cedear") return "📈";
    return "$";
  };

  const handleSave = async () => {
    if (!activoId) { setError("Seleccioná un activo"); return; }
    const cantidadNum = parseCantidad(cantidad);
    if (!cantidad || isNaN(cantidadNum) || cantidadNum <= 0) { setError("Ingresá una cantidad válida"); return; }
    setError(null);
    setSaving(true);
    const data = {
      dateTime: new Date(dateTime + "T12:00:00").toISOString(),
      activoId,
      cantidad: isDeposit ? cantidadNum : -cantidadNum,
      precioArs: precioArs ? parseFloat(precioArs) : null,
      description: description.trim(),
    };
    try {
      if (movimiento?.id != null) {
        await updateMut.mutateAsync({ id: movimiento.id, data });
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
    if (!movimiento?.id) return;
    setSaving(true);
    try {
      await deleteMut.mutateAsync(movimiento.id);
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
            {movimiento ? "Editar movimiento" : "Nuevo ahorro"}
          </h2>
          <div className="flex items-center gap-1">
            {movimiento && !confirmDelete && (
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
            <span className="text-xs text-red-600 flex-1">¿Eliminar este movimiento?</span>
            <button onClick={handleDelete} disabled={saving} className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold">
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Sí"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold">No</button>
          </div>
        )}

        {/* Deposit / Withdrawal toggle */}
        <div className="flex rounded-2xl bg-secondary p-1 mb-4">
          <button
            onClick={() => setIsDeposit(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${isDeposit ? "bg-card shadow-sm text-emerald-500" : "text-muted-foreground"}`}
          >
            <TrendingUp size={15} /> Depósito
          </button>
          <button
            onClick={() => setIsDeposit(false)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isDeposit ? "bg-card shadow-sm text-red-500" : "text-muted-foreground"}`}
          >
            <TrendingDown size={15} /> Retiro
          </button>
        </div>

        {/* Asset selector */}
        <div className="mb-3">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Activo</label>
          <select
            value={activoId ?? ""}
            onChange={e => setActivoId(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-2xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Seleccioná un activo</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>{tipoIcon(a.tipo)} {a.nombre} ({a.ticker})</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="mb-3">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
            Cantidad {selectedAsset ? `(${selectedAsset.ticker})` : ""}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={cantidad}
            onChange={e => setCantidad(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder={selectedAsset ? (0).toFixed(selectedAsset.decimales) : "0.00"}
            className={`w-full h-11 px-4 rounded-2xl bg-secondary text-foreground text-sm outline-none focus:ring-2 transition-all ${isDeposit ? "focus:ring-emerald-400/30" : "focus:ring-red-400/30"}`}
          />
        </div>

        {/* Precio ARS (optional) */}
        <div className="mb-3">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
            Precio en ARS al momento <span className="text-muted-foreground/50 font-normal normal-case">(opcional)</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={precioArs}
            onChange={e => setPrecioArs(e.target.value)}
            placeholder="ej: 1050"
            min="0"
            className="w-full h-11 px-4 rounded-2xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Description */}
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          className="w-full h-11 px-4 rounded-2xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-3"
        />

        {/* Date */}
        <div className="mb-4 relative inline-block">
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

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full h-12 rounded-2xl text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${isDeposit ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "Guardando..." : movimiento ? "Guardar cambios" : isDeposit ? "Registrar depósito" : "Registrar retiro"}
        </button>
      </div>
    </div>
  );
}
