import { useState, useEffect, useRef } from "react";
import { X, Mic, Trash2, Loader2, Check, ChevronDown } from "lucide-react";
import type { GastoResponse } from "@/types/api";
import { useCategories, useCurrencies, useCreateGasto, useUpdateGasto, useDeleteGasto } from "@/hooks/useApi";
import { parseVoiceInput, parseMultipleItems } from "@/lib/voiceParser";
import VoiceOverlay from "@/components/VoiceOverlay";
import { detectCategoryFromDescription } from "@/lib/categoryRules";

type EntryType = "gasto" | "ingreso" | "ahorro";

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
  const today = new Date().toISOString().slice(0, 10);
  if (d === today) return "hoy";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

interface Props {
  open: boolean;
  onClose: () => void;
  gasto?: GastoResponse | null;
  initialData?: { description?: string; amount?: number } | null;
}

export default function ExpenseModal({ open, onClose, gasto, initialData }: Props) {
  const [entryType, setEntryType] = useState<EntryType>("gasto");
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const createMut = useCreateGasto();
  const updateMut = useUpdateGasto();
  const deleteMut = useDeleteGasto();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [currencyId, setCurrencyId] = useState<number | null>(null);
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [autoCategoryKeyword, setAutoCategoryKeyword] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

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
    setTags([]);
    setTagInput("");
    setShowDatePicker(false);
    setCurrencyDropdownOpen(false);
    if (!gasto) setEntryType("gasto");
  }, [gasto, open]);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCurrency = currencies.find(c => c.id === currencyId);

  const handleVoiceConfirm = (transcript: string) => {
    setVoiceOpen(false);
    // Try multi-item first ("2800 en arnaldo y 6500 en carrefour" → sums amounts)
    const multi = parseMultipleItems(transcript);
    if (multi) {
      setDescription(multi.description);
      setAmount(String(multi.totalAmount));
    } else {
      const parsed = parseVoiceInput(transcript);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.description) setDescription(parsed.description);
    }
  };

  const addTag = () => {
    const raw = tagInput.replace(/^#/, "").trim();
    if (raw && !tags.includes(raw)) setTags(prev => [...prev, raw]);
    setTagInput("");
  };
  const removeTag = (i: number) => setTags(prev => prev.filter((_, idx) => idx !== i));

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

  const typeColor = entryType === "gasto"
    ? "bg-[#ff5c4d] text-white"
    : entryType === "ingreso"
    ? "bg-emerald-500 text-white"
    : "bg-blue-500 text-white";

  const typeLabel = entryType === "gasto" ? "−" : entryType === "ingreso" ? "+" : "🐷";

  return (
    <>
      <VoiceOverlay
        open={voiceOpen}
        onCancel={() => setVoiceOpen(false)}
        onConfirm={handleVoiceConfirm}
      />

      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-card animate-slide-up max-h-[92vh] min-h-[78vh] flex flex-col">

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors z-10"
          >
            <X size={18} className="text-muted-foreground" />
          </button>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-2">

            {/* Top pill row: date | type | currency */}
            <div className="flex items-center gap-2 flex-wrap mb-5 pr-8">

              {/* Date pill */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(v => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
                >
                  {formatDatePill(dateTime)}
                  <ChevronDown size={10} className="text-muted-foreground" />
                </button>
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-1.5 z-20 bg-card border border-border rounded-2xl shadow-lg p-3">
                    <input
                      type="date"
                      value={dateTime}
                      onChange={(e) => { setDateTime(e.target.value); setShowDatePicker(false); }}
                      className="h-9 px-3 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}
              </div>

              {/* Entry type pills */}
              {!gasto && (
                <>
                  <button
                    onClick={() => { setEntryType("gasto"); setCategoryId(null); setAutoCategoryKeyword(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${entryType === "gasto" ? "bg-[#ff5c4d] text-white" : "bg-secondary text-muted-foreground"}`}
                  >— Egreso</button>
                  <button
                    onClick={() => { setEntryType("ingreso"); setCategoryId(null); setAutoCategoryKeyword(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${entryType === "ingreso" ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}
                  >+ Ingreso</button>
                  <button
                    onClick={() => { setEntryType("ahorro"); setCategoryId(null); setAutoCategoryKeyword(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${entryType === "ahorro" ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground"}`}
                  >🐷 Ahorro</button>
                </>
              )}

              {/* Currency pill */}
              {!loadingCurrencies && currencies.length > 0 && (
                <div className="relative" ref={currencyRef}>
                  <button
                    onClick={() => currencies.length > 1 && setCurrencyDropdownOpen(v => !v)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
                  >
                    {selectedCurrency?.symbol ?? "—"}
                    {currencies.length > 1 && <ChevronDown size={10} className="text-muted-foreground" />}
                  </button>
                  {currencyDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 z-20 bg-card border border-border rounded-2xl shadow-lg py-1 min-w-[140px]">
                      {currencies.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setCurrencyId(c.id); setCurrencyDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-secondary transition-colors ${c.id === currencyId ? "text-primary font-semibold" : "text-foreground"}`}
                        >
                          {c.symbol} — {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description — large title */}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿En qué gastaste?"
              className="w-full text-[1.65rem] font-bold leading-tight text-foreground bg-transparent outline-none placeholder:text-muted-foreground/30 mb-4"
            />

            {/* Amount row */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => {
                  if (gasto) return;
                  const next: EntryType = entryType === "gasto" ? "ingreso" : entryType === "ingreso" ? "ahorro" : "gasto";
                  setEntryType(next);
                  setCategoryId(null);
                  setAutoCategoryKeyword(null);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 transition-all active:scale-90 ${typeColor}`}
              >
                {typeLabel}
              </button>

              <input
                type="text"
                inputMode="decimal"
                value={amountFocused ? amount : amount ? formatARS(parseAmountInput(amount)) : ""}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
                className="flex-1 text-4xl font-bold text-foreground bg-transparent outline-none tabular placeholder:text-muted-foreground/25"
              />

              <span className="text-base font-semibold text-muted-foreground flex-shrink-0">
                {selectedCurrency?.symbol ?? ""}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 mb-4 -mx-6" />

            {/* Category pills */}
            <div className={`mb-2 transition-opacity duration-200 ${entryType !== "gasto" ? "opacity-30 pointer-events-none select-none" : ""}`}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Categoría</span>
                {autoCategoryKeyword && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">✨ auto</span>
                )}
              </div>
              {loadingCats ? (
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 w-24 bg-secondary rounded-full animate-pulse" />)}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
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
              <div className="mt-3 text-xs text-red-500 font-medium bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-2">
                {error}
              </div>
            )}
          </div>

          {/* ── Sticky bottom bar ── */}
          <div className="flex-shrink-0 bg-card border-t border-border/40 px-6 pt-3 pb-5 rounded-b-3xl space-y-3">

            {/* Tags row — always visible */}
            <div>
              {/* Existing tag pills */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 pl-2 pr-1.5 py-0.5 bg-primary/12 rounded-full text-xs font-semibold text-primary">
                      #{tag}
                      <button
                        onClick={() => removeTag(i)}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tag input — always visible */}
              <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-secondary focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <span className="text-xs font-bold text-muted-foreground select-none">#</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.replace(/\s/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { addTag(); e.preventDefault(); }
                  }}
                  onBlur={addTag}
                  placeholder="etiqueta"
                  className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2">
              {/* Delete (edit mode) */}
              {gasto && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="h-11 w-11 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* Single voice button */}
              <button
                onClick={() => setVoiceOpen(true)}
                className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <Mic size={17} />
              </button>

              {/* Save */}
              {(entryType === "ingreso" || entryType === "ahorro") && !gasto ? (
                <button
                  disabled
                  className={`flex-1 h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed ${
                    entryType === "ahorro" ? "bg-blue-500/30 text-blue-700" : "bg-emerald-500/30 text-emerald-700"
                  }`}
                >Próximamente</button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {isLoading ? "Guardando..." : gasto ? "Guardar cambios" : "Guardar"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
