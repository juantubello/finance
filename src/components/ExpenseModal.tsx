import { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, Trash2, Loader2 } from "lucide-react";
import type { GastoResponse } from "@/types/api";
import { useCategories, useCurrencies, useCreateGasto, useUpdateGasto, useDeleteGasto } from "@/hooks/useApi";
import { parseVoiceInput, parseAmountOnly } from "@/lib/voiceParser";

interface Props {
  open: boolean;
  onClose: () => void;
  gasto?: GastoResponse | null;
}

export default function ExpenseModal({ open, onClose, gasto }: Props) {
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
  const [isListening, setIsListening] = useState(false);
  const [isListeningAmount, setIsListeningAmount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  // Refs to hold active recognition instances so we can stop them
  const recognitionDescRef = useRef<any>(null);
  const recognitionAmountRef = useRef<any>(null);

  // Stop any active recognition when modal closes
  useEffect(() => {
    if (!open) {
      [recognitionDescRef, recognitionAmountRef].forEach((ref) => {
        if (ref.current) {
          try { ref.current.stop(); } catch {}
          ref.current = null;
        }
      });
      setIsListening(false);
      setIsListeningAmount(false);
    }
  }, [open]);

  useEffect(() => {
    if (gasto) {
      setDescription(gasto.description);
      setAmount(String(gasto.amount));
      setCategoryId(gasto.categoryId);
      setCurrencyId(gasto.currencyId);
      setDateTime(gasto.dateTime.slice(0, 10));
    } else {
      setDescription("");
      setAmount("");
      setCategoryId(null);
      setCurrencyId(currencies.length > 0 ? currencies[0].id : null);
      setDateTime(new Date().toISOString().slice(0, 10));
    }
    setError(null);
  }, [gasto, open]);

  // Set default currency once loaded
  useEffect(() => {
    if (!gasto && currencies.length > 0 && currencyId === null) {
      setCurrencyId(currencies[0].id);
    }
  }, [currencies, gasto, currencyId]);

  const VOICE_TIMEOUT_MS = 8000; // stop automatically after 8s if onend never fires (mobile bug)

  const startVoice = (
    ref: React.MutableRefObject<any>,
    isActive: boolean,
    setListening: (v: boolean) => void,
    onResult: (transcript: string) => void,
  ) => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setError("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    // If already listening → stop
    if (isActive && ref.current) {
      try { ref.current.stop(); } catch {}
      ref.current = null;
      setListening(false);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      ref.current = null;
      setListening(false);
    };

    recognition.onstart = () => {
      setListening(true);
      // Safety timeout in case onend never fires on mobile
      timeoutId = setTimeout(() => {
        try { recognition.stop(); } catch {}
        cleanup();
      }, VOICE_TIMEOUT_MS);
    };

    recognition.onend = () => cleanup();

    recognition.onerror = (e: any) => {
      cleanup();
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("Error al escuchar. Intentá de nuevo.");
      }
    };

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      // Stop immediately after result to release mic (otherwise iOS keeps it open)
      try { recognition.stop(); } catch {}
    };

    ref.current = recognition;
    try {
      recognition.start();
    } catch {
      cleanup();
      setError("No se pudo iniciar el micrófono.");
    }
  };

  const handleVoiceDescription = () => {
    startVoice(recognitionDescRef, isListening, setIsListening, (transcript) => {
      setLastTranscript(`Escuché: "${transcript}"`);
      const parsed = parseVoiceInput(transcript);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.description) setDescription(parsed.description);
    });
  };

  const handleVoiceAmount = () => {
    startVoice(recognitionAmountRef, isListeningAmount, setIsListeningAmount, (transcript) => {
      setLastTranscript(`Escuché: "${transcript}"`);
      const n = parseAmountOnly(transcript);
      if (n !== null) setAmount(String(n));
    });
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
      amount: parseFloat(amount),
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-card animate-slide-up p-6 pb-8 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">
            {gasto ? "Editar Gasto" : "Nuevo Gasto"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

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
              onClick={handleVoiceDescription}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                isListening ? "bg-red-500 text-white animate-pulse" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-4 pr-12 rounded-xl bg-secondary text-foreground text-sm tabular outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
            />
            <button
              onClick={handleVoiceAmount}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                isListeningAmount ? "bg-red-500 text-white animate-pulse" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {isListeningAmount ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>

        {/* Voice transcript debug banner */}
        {lastTranscript && (
          <div className="mb-3 -mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground">
            <span>{lastTranscript}</span>
            <button onClick={() => setLastTranscript(null)} className="ml-2 text-muted-foreground hover:text-foreground">✕</button>
          </div>
        )}

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

        {/* Category */}
        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Categoría</label>
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
                  onClick={() => setCategoryId(c.id != null && categoryId === c.id ? null : c.id)}
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
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? "Guardando..." : gasto ? "Guardar Cambios" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
