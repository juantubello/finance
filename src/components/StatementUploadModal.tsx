import { useState, useRef, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useSaveStatement, useCards } from "@/hooks/useApi";
import { useDolarBBVA } from "@/hooks/useDolarBBVA";
import type { CardStatementParsed } from "@/types/api";
import { format } from "date-fns";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "idle" | "parsing" | "preview" | "saving";

export default function StatementUploadModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [parsed, setParsed] = useState<CardStatementParsed | null>(null);
  const [exchangeRate, setExchangeRate] = useState("");
  const [cardId, setCardId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<File | null>(null);
  const savingRef = useRef(false);
  const saveMutation = useSaveStatement();
  const { data: cards = [] } = useCards();
  const { dolarBBVA, isLoading: loadingBBVA } = useDolarBBVA();

  // Auto-fill exchange rate with BBVA rate when preview step is reached
  useEffect(() => {
    if (step === "preview" && dolarBBVA && !exchangeRate) {
      setExchangeRate(String(Math.round(dolarBBVA)));
    }
  }, [step, dolarBBVA]);

  const handleFile = async (file: File) => {
    setError(null);
    pdfFileRef.current = file;
    setStep("parsing");
    try {
      const result = await api.parseStatement(file);
      setParsed(result);
      setStep("preview");
    } catch {
      setError("No se pudo procesar el PDF. Verificá que sea un resumen BBVA válido.");
      setStep("idle");
    }
  };

  const handleConfirm = async () => {
    if (!parsed || !exchangeRate.trim() || !cardId || !pdfFileRef.current) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setStep("saving");
    try {
      await saveMutation.mutateAsync({
        data: {
          cardId: Number(cardId),
          statementMonth: parsed.statementMonth,
          statementYear: parsed.statementYear,
          closeDate: parsed.closeDate,
          dueDate: parsed.dueDate,
          nextCloseDate: parsed.nextCloseDate,
          nextDueDate: parsed.nextDueDate,
          exchangeRateUsd: Math.round(parseFloat(exchangeRate) * 100),
          expenses: parsed.expenses,
        },
        pdfFile: pdfFileRef.current,
      });
      onSuccess();
    } catch (err: unknown) {
      const is409 = err instanceof Error && err.message.includes("409");
      setError(
        is409
          ? "Ya existe un resumen para esta tarjeta en ese mes/año."
          : "Error al guardar. Verificá que el backend esté disponible."
      );
      savingRef.current = false;
      setStep("preview");
    }
  };

  const canConfirm = !!exchangeRate.trim() && !!cardId && step !== "saving";

  const totals = parsed ? parsed.expenses.reduce(
    (acc, e) => ({
      ars: acc.ars + (e.amountArs ?? 0),
      usd: acc.usd + (e.amountUsd ?? 0),
    }),
    { ars: 0, usd: 0 }
  ) : { ars: 0, usd: 0 };

  const isPreview = (step === "preview" || step === "saving") && !!parsed;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[94dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border/40">
          <h2 className="text-base font-bold text-foreground">Subir resumen PDF</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Idle / Parsing */}
        {!isPreview && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4 space-y-4">
            {(step === "idle" || step === "parsing") && (
              <>
                <p className="text-sm text-muted-foreground">Seleccioná el resumen PDF de BBVA Visa o Mastercard para parsear sus gastos.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {step === "parsing" ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Procesando PDF...</p>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-3 p-10 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Upload size={28} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Seleccionar archivo .pdf</span>
                  </button>
                )}
              </>
            )}
            {error && (
              <p className="text-sm text-expense text-center rounded-xl bg-expense/10 px-4 py-3">{error}</p>
            )}
          </div>
        )}

        {/* Preview / Saving */}
        {isPreview && parsed && (
          <>
            {/* Top controls — fixed height */}
            <div className="flex-shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/40">
              <div className="rounded-2xl bg-secondary/40 border border-border/40 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{parsed.cardType}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{parsed.statementMonth}/{parsed.statementYear}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{parsed.expenses.length} gastos</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Cierre </span>
                    <span className="font-medium">{format(new Date(parsed.closeDate + "T12:00:00"), "dd/MM/yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vencimiento </span>
                    <span className="font-medium">{format(new Date(parsed.dueDate + "T12:00:00"), "dd/MM/yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Próx. cierre </span>
                    <span className="font-medium">{format(new Date(parsed.nextCloseDate + "T12:00:00"), "dd/MM/yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Próx. venc. </span>
                    <span className="font-medium">{format(new Date(parsed.nextDueDate + "T12:00:00"), "dd/MM/yyyy")}</span>
                  </div>
                </div>
                {(totals.ars > 0 || totals.usd > 0) && (
                  <div className="border-t border-border/40 pt-2 flex gap-4 text-xs">
                    {totals.ars > 0 && (
                      <div>
                        <span className="text-muted-foreground">Total ARS </span>
                        <span className="font-semibold text-sky-500">$ {(totals.ars / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {totals.usd > 0 && (
                      <div>
                        <span className="text-muted-foreground">Total USD </span>
                        <span className="font-semibold text-emerald-500">USD {(totals.usd / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Tarjeta <span className="text-expense">*</span>
                  </label>
                  <select
                    value={cardId}
                    onChange={e => setCardId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Seleccioná una tarjeta</option>
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Tipo de cambio USD <span className="text-expense">*</span>
                    </label>
                    {dolarBBVA && (
                      <button
                        type="button"
                        onClick={() => setExchangeRate(String(Math.round(dolarBBVA)))}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: "#004B99" }}
                        title="Usar cotización BBVA"
                      >
                        <BBVALogo />
                        <span className="text-[10px] font-bold text-white">
                          ${Math.round(dolarBBVA).toLocaleString("es-AR")}
                        </span>
                      </button>
                    )}
                    {loadingBBVA && !dolarBBVA && (
                      <Loader2 size={11} className="animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 h-10">
                    <span className="text-sm font-semibold text-muted-foreground">$</span>
                    <input
                      type="number"
                      value={exchangeRate}
                      onChange={e => setExchangeRate(e.target.value)}
                      placeholder="ej: 1470"
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
                    />
                    <span className="text-xs text-muted-foreground">ARS/USD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense list — fills remaining space */}
            <div className="flex-1 min-h-0 flex flex-col px-5 py-3">
              <div className="flex-1 min-h-0 rounded-2xl border border-border/40 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 px-3 py-1.5 bg-secondary/60 border-b border-border/40 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Descripción</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Importe</span>
                </div>
                {/* Scrollable rows */}
                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                  {parsed.expenses.map((e, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{e.description}</p>
                        <p className="text-muted-foreground">
                          {e.cardholderName} · {e.date.slice(0, 10)}
                          {e.installmentNumber && e.installmentTotal ? ` · ${e.installmentNumber}/${e.installmentTotal}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold text-expense flex-shrink-0 ml-2 tabular">
                        {e.amountArs != null
                          ? `$ ${(e.amountArs / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                          : e.amountUsd != null
                          ? `USD ${(e.amountUsd / 100).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="flex-shrink-0 mx-5 mb-2 text-sm text-expense text-center rounded-xl bg-expense/10 px-4 py-3">{error}</p>
            )}

            <div className="flex-shrink-0 px-5 py-4 border-t border-border/40 bg-card">
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {step === "saving" ? (
                  <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                ) : (
                  "Confirmar y guardar"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BBVALogo() {
  return (
    <svg viewBox="0 0 40 12" className="h-3 w-auto" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="11" fontFamily="Arial Black, Arial, sans-serif" fontSize="12" fontWeight="900" fill="white" letterSpacing="0.5">BBVA</text>
    </svg>
  );
}
