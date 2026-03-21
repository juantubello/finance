import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X, Mic, Trash2, Loader2, Check, ChevronDown } from "lucide-react";
import type { GastoResponse } from "@/types/api";
import { useCategories, useCurrencies, useCreateGasto, useUpdateGasto, useDeleteGasto, useLabels, useCategoryRules, useCreateIngreso, useSavingAssets, useCreateSaving } from "@/hooks/useApi";
import { parseVoiceInput, parseMultipleItems } from "@/lib/voiceParser";
import VoiceOverlay from "@/components/VoiceOverlay";
import { detectCategoryFromDescription } from "@/lib/categoryRules";
import { api } from "@/services/api";

type EntryType = "gasto" | "ingreso" | "ahorro";

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
  gasto?: GastoResponse | null;
  initialData?: { description?: string; amount?: number } | null;
  initialEntryType?: EntryType;
}

export default function ExpenseModal({ open, onClose, gasto, initialData, initialEntryType }: Props) {
  if (!open) return null;
  return <ExpenseModalInner onClose={onClose} gasto={gasto} initialData={initialData} initialEntryType={initialEntryType} />;
}

function ExpenseModalInner({ onClose, gasto, initialData, initialEntryType }: Omit<Props, "open">) {
  const [entryType, setEntryType] = useState<EntryType>(initialEntryType ?? "gasto");
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies();
  const { data: allLabels = [] } = useLabels();
  const { data: categoryRules = [] } = useCategoryRules();
  const createMut = useCreateGasto();
  const updateMut = useUpdateGasto();
  const deleteMut = useDeleteGasto();
  const createIngresoMut = useCreateIngreso();
  const createSavingMut = useCreateSaving();
  const { data: savingAssets = [] } = useSavingAssets();
  const [savingActivoId, setSavingActivoId] = useState<number | null>(null);

  useEffect(() => {
    if (savingActivoId === null && savingAssets.length > 0) setSavingActivoId(savingAssets[0].id);
  }, [savingAssets, savingActivoId]);

  const [description, setDescription] = useState(gasto?.description ?? initialData?.description ?? "");
  const [amount, setAmount] = useState(gasto ? String(gasto.amount) : initialData?.amount ? String(initialData.amount) : "");
  const [categoryId, setCategoryId] = useState<number | null>(
    gasto?.categoryId ?? (initialEntryType === "ingreso" ? 11 : initialEntryType === "ahorro" ? 12 : null)
  );
  const [currencyId, setCurrencyId] = useState<number | null>(
    gasto?.currencyId != null ? Number(gasto.currencyId) : (currencies[0]?.id ?? null)
  );
  // Handles the case where currencies finish loading after mount
  useEffect(() => {
    if (currencyId === null && currencies.length > 0) setCurrencyId(currencies[0].id);
  }, [currencies, currencyId]);
  const [dateTime, setDateTime] = useState(gasto ? gasto.dateTime.slice(0, 10) : todayLocal());
  const [error, setError] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [autoCategoryKeyword, setAutoCategoryKeyword] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(gasto?.labels?.map(l => l.name) ?? []);
  const [savedLabels] = useState<{ id: number; name: string }[]>(gasto?.labels ?? []);
  const [tagInput, setTagInput] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const datePickerRef = useRef<HTMLDivElement>(null);
  const currencyBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (gasto) return;
    const match = detectCategoryFromDescription(description, categoryRules);
    if (match !== null) {
      setCategoryId(match.categoryId);
      setAutoCategoryKeyword(match.keyword);
    } else if (autoCategoryKeyword !== null && categoryRules.length > 0) {
      // Only clear the auto-category if rules are actually loaded.
      // If rules are empty (still fetching), don't undo a category that was
      // already set (e.g. by the direct detection in handleVoiceConfirm).
      setCategoryId(null);
      setAutoCategoryKeyword(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      setCurrencyDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openCurrencyDropdown = () => {
    if (currencyBtnRef.current) {
      const r = currencyBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left });
    }
    setCurrencyDropdownOpen(v => !v);
  };

  const selectedCurrency = currencies.find(c => Number(c.id) === Number(currencyId));

  const handleVoiceConfirm = (transcript: string) => {
    setVoiceOpen(false);
    const multi = parseMultipleItems(transcript);
    let newDesc = "";
    if (multi) {
      newDesc = multi.description;
      setDescription(multi.description);
      setAmount(String(multi.totalAmount));
    } else {
      const parsed = parseVoiceInput(transcript);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.description) {
        newDesc = parsed.description;
        setDescription(parsed.description);
      }
    }
    // Run category detection immediately with the resolved description.
    // The useEffect only fires when description state changes, but if categoryRules
    // loaded while the voice overlay was open the effect won't re-run after this
    // single setDescription call, so we detect here to guarantee the match.
    if (newDesc && !gasto) {
      const match = detectCategoryFromDescription(newDesc, categoryRules);
      if (match !== null) {
        setCategoryId(match.categoryId);
        setAutoCategoryKeyword(match.keyword);
      }
    }
  };

  const addTag = () => {
    const raw = tagInput.replace(/^#/, "").trim();
    if (raw && !tags.includes(raw)) setTags(prev => [...prev, raw]);
    setTagInput("");
  };
  const removeTag = (i: number) => setTags(prev => prev.filter((_, idx) => idx !== i));

  const [saving, setSaving] = useState(false);

  const withTimeout = <T,>(promise: Promise<T>, ms = 12000): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);

  const handleSave = async () => {
    if (saving) return;
    if (!description.trim() || !amount) {
      setError("Completá descripción y monto");
      return;
    }
    if (entryType === "gasto" && !categoryId) {
      setError("Seleccioná una categoría");
      return;
    }
    if (entryType !== "ahorro" && !currencyId) {
      setError("Seleccioná una moneda");
      return;
    }
    if (entryType === "ahorro" && !savingActivoId) {
      setError("Seleccioná un activo");
      return;
    }
    setError(null);
    setSaving(true);
    const payload = {
      dateTime: new Date(dateTime + "T12:00:00").toISOString(),
      description: description.trim(),
      amount: parseAmountInput(amount),
      categoryId,
      currencyId,
    };
    try {
      if (entryType === "ahorro") {
        await withTimeout(createSavingMut.mutateAsync({
          dateTime: payload.dateTime,
          activoId: savingActivoId!,
          cantidad: payload.amount,
          precioArs: null,
          description: payload.description,
        }));
        await queryClient.invalidateQueries({ queryKey: ["savings"] });
        await queryClient.invalidateQueries({ queryKey: ["savingBalance"] });
      } else if (entryType === "ingreso") {
        await withTimeout(createIngresoMut.mutateAsync({ ...payload, categoryId: 11 }));
        await queryClient.invalidateQueries({ queryKey: ["ingresos"] });
      } else if (gasto) {
        await withTimeout(updateMut.mutateAsync({ id: gasto.id, data: payload }));
        const removedLabels = savedLabels.filter(l => !tags.includes(l.name));
        await withTimeout(Promise.all(removedLabels.map(l => api.removeGastoLabel(gasto.id, l.id))));
        if (tags.length > 0) await withTimeout(api.addGastoLabels(gasto.id, tags));
        await queryClient.invalidateQueries({ queryKey: ["gastos"] });
      } else {
        const savedGasto = await withTimeout(createMut.mutateAsync(payload));
        if (tags.length > 0) await withTimeout(api.addGastoLabels(savedGasto.id, tags));
        await queryClient.invalidateQueries({ queryKey: ["gastos"] });
      }
      onClose();
    } catch (e: any) {
      setError(e?.message === "timeout" ? "La operación tardó demasiado. Intentá de nuevo." : "Error al guardar. Intentá de nuevo.");
      setSaving(false);
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

  const isLoading = saving || deleteMut.isPending;

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
                    onClick={() => { setEntryType("ingreso"); setCategoryId(11); setAutoCategoryKeyword(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${entryType === "ingreso" ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}
                  >+ Ingreso</button>
                  <button
                    onClick={() => { setEntryType("ahorro"); setCategoryId(12); setAutoCategoryKeyword(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${entryType === "ahorro" ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground"}`}
                  >🐷 Ahorro</button>
                </>
              )}

              {/* Currency dropdown — hidden for ahorro (asset has its own currency) */}
              {entryType !== "ahorro" && !loadingCurrencies && currencies.length > 0 && (
                <>
                  <button
                    ref={currencyBtnRef}
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); openCurrencyDropdown(); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
                  >
                    {selectedCurrency ? `${selectedCurrency.symbol} ${selectedCurrency.name}` : "Moneda"}
                    <ChevronDown size={10} className="text-muted-foreground" />
                  </button>
                  {currencyDropdownOpen && createPortal(
                    <div
                      style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
                      className="bg-card border border-border rounded-2xl shadow-lg py-1 min-w-[160px]"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {currencies.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCurrencyId(c.id); setCurrencyDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium hover:bg-secondary transition-colors text-left ${
                            Number(c.id) === Number(currencyId) ? "text-primary font-semibold" : "text-foreground"
                          }`}
                        >
                          {c.symbol} — {c.name}
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
                </>
              )}
            </div>

            {/* Description — large title */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                entryType === "ingreso" ? "¿Qué ingreso recibiste?" :
                entryType === "ahorro"  ? "¿Qué activo compraste?" :
                "¿En qué gastaste?"
              }
              rows={1}
              className="w-full text-[1.35rem] font-bold leading-snug text-foreground bg-transparent outline-none placeholder:text-muted-foreground/30 mb-4 resize-none overflow-hidden"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />

            {/* Amount row */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => {
                  if (gasto) return;
                  const next: EntryType = entryType === "gasto" ? "ingreso" : entryType === "ingreso" ? "ahorro" : "gasto";
                  setEntryType(next);
                  setCategoryId(next === "ingreso" ? 11 : next === "ahorro" ? 12 : null);
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

            {/* Category pills (gasto) / Asset selector (ahorro) / hidden (ingreso) */}
            {entryType === "gasto" && (
              <div className="mb-2">
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
            )}

            {entryType === "ahorro" && (
              <div className="mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2.5">Activo</span>
                <div className="flex flex-wrap gap-2">
                  {savingAssets.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSavingActivoId(a.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        savingActivoId === a.id
                          ? "bg-blue-500 text-white shadow-subtle"
                          : "bg-secondary text-secondary-foreground hover:bg-muted"
                      }`}
                    >
                      {a.ticker}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              {tagInput.length > 0 && (() => {
                const suggestions = allLabels.filter(l =>
                  l.name.includes(tagInput.toLowerCase()) && !tags.includes(l.name)
                );
                return suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {suggestions.map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!tags.includes(l.name)) setTags(prev => [...prev, l.name]);
                          setTagInput("");
                        }}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                      >
                        #{l.name}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2">
              {gasto && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={isLoading}
                  className="h-11 w-11 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {gasto && confirmDelete && (
                <div className="flex items-center gap-1.5 px-3 h-11 rounded-2xl bg-red-50 dark:bg-red-950/30 flex-shrink-0">
                  <span className="text-xs font-semibold text-red-500 whitespace-nowrap">¿Eliminar?</span>
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="h-7 px-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isLoading ? <Loader2 size={11} className="animate-spin" /> : null}
                    Sí
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={isLoading}
                    className="h-7 px-2.5 rounded-xl bg-transparent text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}

              <button
                onClick={() => setVoiceOpen(true)}
                className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <Mic size={17} />
              </button>

              <button
                onClick={handleSave}
                disabled={isLoading}
                className={`flex-1 h-11 rounded-2xl font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  entryType === "ingreso"
                    ? "bg-emerald-500 text-white"
                    : entryType === "ahorro"
                    ? "bg-blue-500 text-white"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {isLoading ? "Guardando..." : gasto ? "Guardar cambios" : "Guardar"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
