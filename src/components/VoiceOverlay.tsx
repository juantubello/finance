import { useEffect, useRef, useState } from "react";
import { X, Check, Mic, RotateCcw } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (transcript: string) => void;
}

/** Convert US comma-thousands "11,000" → Argentine dot-thousands "11.000" for display */
function normalizeDisplay(text: string): string {
  return text.replace(/\b(\d{1,3})(,\d{3})+\b/g, (m) => m.replace(/,/g, "."));
}

export default function VoiceOverlay({ open, onCancel, onConfirm }: Props) {
  const [displayText, setDisplayText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef(""); // final segments accumulated across results

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  };

  const startRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    accumulatedRef.current = "";
    setDisplayText("");
    setIsDone(false);

    const r = new SR();
    r.lang = "es-AR";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onstart = () => setIsListening(true);

    r.onresult = (e: any) => {
      let interim = "";
      let hasFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          accumulatedRef.current += t;
          hasFinal = true;
        } else {
          interim = t;
        }
      }
      setDisplayText(accumulatedRef.current + interim);
      // Release mic immediately on iOS when we get a final result
      // (otherwise Dynamic Island stays active until onend fires)
      if (hasFinal) {
        try { r.stop(); } catch {}
      }
    };

    r.onend = () => {
      setIsListening(false);
      setIsDone(true);
      // ensure display shows final accumulated text
      setDisplayText(accumulatedRef.current || "");
    };

    r.onerror = (e: any) => {
      setIsListening(false);
      setIsDone(true);
      if (e.error === "no-speech") setDisplayText("");
    };

    recognitionRef.current = r;
    try { r.start(); } catch { setIsDone(true); }
  };

  useEffect(() => {
    if (open) {
      startRecognition();
    } else {
      stopRecognition();
      setDisplayText("");
      setIsDone(false);
    }
    return stopRecognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCancel = () => {
    stopRecognition();
    onCancel();
  };

  const handleConfirm = () => {
    stopRecognition();
    onConfirm(displayText);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-between pb-14 pt-20 animate-gradient-shift"
      style={{
        background: "linear-gradient(135deg, #ffb3aa, #ff5c4d, #c0392b, #ff8a65, #ff5c4d, #ffb3aa)",
        backgroundSize: "300% 300%",
      }}
    >
      {/* Live transcript area */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 w-full">
        {displayText ? (
          <p className="text-white text-2xl font-semibold text-center leading-snug drop-shadow">
            {normalizeDisplay(displayText)}
          </p>
        ) : isListening ? (
          <div className="flex flex-col items-center gap-4">
            <Mic size={44} className="text-white animate-pulse drop-shadow" />
            <p className="text-white/80 text-base font-medium">Escuchando...</p>
          </div>
        ) : (
          <p className="text-white/60 text-sm">No se detectó audio</p>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between w-full px-12">
        {/* Cancel */}
        <button
          onClick={handleCancel}
          className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <X size={22} className="text-white" />
        </button>

        {/* Re-record (center, only when done) */}
        {isDone && (
          <button
            onClick={startRecognition}
            className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          >
            <RotateCcw size={18} className="text-white" />
          </button>
        )}
        {!isDone && <div className="w-11" />}

        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={!displayText}
          className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-40"
        >
          <Check size={22} className="text-[#ff5c4d]" />
        </button>
      </div>
    </div>
  );
}
