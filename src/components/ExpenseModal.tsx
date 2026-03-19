import { useState, useEffect } from "react";
import { X, Mic, Trash2, Loader2 } from "lucide-react";
import type { GastoResponse } from "@/types/api";
import { useCategories, useCurrencies, useCreateGasto, useUpdateGasto, useDeleteGasto } from "@/hooks/useApi";
import { parseVoiceInput, parseAmountOnly } from "@/lib/voiceParser";
import VoiceOverlay from "@/components/VoiceOverlay";
import { detectCategoryFromDescription } from "@/lib/categoryRules";

type EntryType = "gasto" | "ingreso" | "ahorro";
type VoiceTarget = "description" | "amount" | null;

/** Parse an Argentine-formatted string ("1.500,50") or plain ("1500.5") to a number */
function parseAmountInput(s: string): number {
  // "1.500,50" → remove dots, replace comma → "1500.50"
  if (/\d\.\d{3}/.test(s) || s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(s);
}

/** Format a number in Argentine locale: 1500.5 → "1.500,50" */
function formatARS(n: number): string {
  if (isNaN(n) || n === 0) return "";
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  open: boolean;
  onClose: () => void;
  gasto?: GastoResponse | null;
  initialData?: { description?: string; amount?: number } | null;
}

export default function ExpenseModal({ open, onClose, gasto, initialData }: Props) {
  const [entryType, setEntryType] = useState<EntryType>("gasto");
  const { data: categories = [], isLoading: loadingCats, error: errorCats } = useCategories();
  const { data: currencies = [], isLoading: loadingCurrencies, error: errorCurrencies } = useCurrencies();
  const createMut = useCreateGasto();
  const updateMut = useUpdateGasto();
  const deleteMut = useDeleteGasto();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [currencyId, setCurrencyId] = useState<number | null>(null);
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget>(null);
  const [amountFocused, setAmountFocused] = useState(false);
  const [autoCategoryKeyword, setAutoCategoryKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (gasto) {
      setDescription(gasto.description);
      setAmount(String(gasto.amount));
      setCategoryId(gasto.categoryId);
      setCurrencyId(gasto.currencyId);
      setDateTime(gasto.dateTime.slice(0, 10));
    } else {
      setDescription(initialData?.description ?? "");
      setAmount(initialData?.amount ? String(initialData.amount) : "");
      setCategoryId(null);
      setCurrencyId(currencies.length > 0 ? currencies[0].id : null);
      setDateTime(new Date().toISOString().slice(0, 10));
    }
    setError(null);
    setAutoCategoryKeyword(null);
    if (!gasto) setEntryType("gasto");
  }, [gasto, open]);

  // Auto-detect category from description when creating a new gasto
  useEffect(() => {
    if (gasto) return;
    const match = detectCategoryFromDescription(description);
    if (match !== null) {
      setCategoryId(match.categoryId);
      setAutoCategoryKeyword(match.keyword);
    } else if (autoCategoryKeyword !== null) {
      setCategoryId(null);
      setAutoCategoryKeyword(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  useEffect(() => {
    if (!gasto && currencies.length > 0 && currencyId === null) {
      setCurrencyId(currencies[0].id);
    }
  }, [currencies, gasto, currencyId]);

  // Close voice overlay when modal closes
  useEffect(() => {
    if (!open) setVoiceTarget(null);
  }, [open]);

  const handleVoiceConfirm = (transcript: string) => {
    setVoiceTarget(null);
    if (voiceTarget === "description") {
      const parsed = parseVoiceInput(transcript);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.description) setDescription(parsed.description);
    } else if (voiceTarget === "amount") {
      const n = parseAmountOnly(transcript);
      if (n !== null) setAmount(String(n)); // stored raw, formatted on display
    }
  };

  const handleSave = async () => {
    if (!description.trim() || !amount) {
      setError("Completá descripción y monto");
      return;
    }
    if (!currencyId) {
      setError("Seleccioná una moneda");
      return;
    }
    setError(null);
    const payload = {
      dateTime: new Date(dateTime + "T12:00:00").toISOString(),
      description: description.trim(),
      amount: parseAmountInput(amount),
      categoryId,
      currencyId,
    };
    try {
      if (gasto) {
        await updateMut.mutateAsync({ id: gasto.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Error al guardar. Intentá de nuevo.");
    }
  };

  const handleDelete = async () => {
    if (!gasto) return;
    try {
      await deleteMut.mutateAsync(gasto.id);
      onClose();
    } catch {
      setError("Error al eliminar.");
    }
  };

  if (!open) return null;

  const isLoading = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <>
      <VoiceOverlay
        open={voiceTarget !== null}
        onCancel={() => setVoiceTarget(null)}
        onConfirm={handleVoiceConfirm}
      />

      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-card animate-slide-up p-6 pb-8 max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">
              {gasto ? "Editar" : "Nuevo"}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Type toggle */}
          {!gasto && (
            <div className="flex gap-1.5 mb-5">
              <button
                onClick={() => { setEntryType("gasto"); setCategoryId(null); setAutoCategoryKeyword(null); }}
                className={`flex-1 h-10 rounded-2xl text-sm font-semibold transition-all ${
                  entryType === "gasto"
                    ? "bg-[#ff5c4d] text-white shadow-sm"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                — Egreso
              </button>
              <button
                onClick={() => { setEntryType("ingreso"); setCategoryId(null); setAutoCategoryKeyword(null); }}
                className={`flex-1 h-10 rounded-2xl text-sm font-semibold transition-all ${
                  entryType === "ingreso"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                + Ingreso
              </button>
              <button
                onClick={() => { setEntryType("ahorro"); setCategoryId(null); setAutoCategoryKeyword(null); }}
                className={`flex-1 h-10 rounded-2xl text-sm font-semibold transition-all ${
                  entryType === "ahorro"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                🐷 Ahorro
              </button>
            </div>
          )}

          {/* Date */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
            <input
              type="date"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Café con amigos"
                className="w-full h-11 px-4 pr-12 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
              />
              <button
                onClick={() => setVoiceTarget("description")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <Mic size={16} />
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={
                  amountFocused
                    ? amount
                    : amount
                    ? formatARS(parseAmountInput(amount))
                    : ""
                }
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                onChange={(e) => {
                  // allow digits, dot, comma
                  setAmount(e.target.value.replace(/[^0-9.,]/g, ""));
                }}
                placeholder="0,00"
                className="w-full h-11 px-4 pr-12 rounded-xl bg-secondary text-foreground text-sm tabular outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
              />
              <button
                onClick={() => setVoiceTarget("amount")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <Mic size={16} />
              </button>
            </div>
          </div>

          {/* Currency */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Moneda</label>
            {loadingCurrencies ? (
              <div className="w-full h-11 rounded-xl bg-secondary flex items-center px-4 gap-2">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cargando monedas...</span>
              </div>
            ) : errorCurrencies ? (
              <div className="w-full h-11 rounded-xl bg-red-50 flex items-center px-4">
                <span className="text-sm text-red-500">Error al cargar monedas</span>
              </div>
            ) : currencies.length === 0 ? (
              <div className="w-full h-11 rounded-xl bg-secondary flex items-center px-4">
                <span className="text-sm text-muted-foreground">No hay monedas disponibles</span>
              </div>
            ) : (
              <select
                value={currencyId ?? ""}
                onChange={(e) => setCurrencyId(Number(e.target.value))}
                className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.symbol} — {c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Category — only for gastos */}
          <div className={`mb-6 transition-opacity duration-200 ${entryType !== "gasto" ? "opacity-30 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-medium text-muted-foreground">Categoría</label>
              {autoCategoryKeyword && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  ✨ auto: "{autoCategoryKeyword}"
                </span>
              )}
            </div>
            {loadingCats ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cargando categorías...</span>
              </div>
            ) : errorCats ? (
              <span className="text-sm text-red-500">Error al cargar categorías</span>
            ) : categories.length === 0 ? (
              <span className="text-sm text-muted-foreground">No hay categorías disponibles</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(c.id != null && categoryId === c.id ? null : c.id); setAutoCategoryKeyword(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      c.id != null && categoryId === c.id
                        ? "bg-primary text-primary-foreground shadow-subtle"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {c.icon && <span>{c.icon}</span>}
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {gasto && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="h-12 px-4 rounded-2xl bg-red-50 text-red-500 font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            )}
            {(entryType === "ingreso" || entryType === "ahorro") && !gasto ? (
              <button
                disabled
                className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed ${
                  entryType === "ahorro"
                    ? "bg-blue-500/30 text-blue-700"
                    : "bg-emerald-500/30 text-emerald-700"
                }`}
              >
                Próximamente
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? "Guardando..." : gasto ? "Guardar Cambios" : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
