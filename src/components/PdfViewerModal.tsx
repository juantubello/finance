import { useEffect, useState } from "react";
import { X, Loader2, FileText, ExternalLink } from "lucide-react";

interface Props {
  url: string;
  fileName: string;
  onClose: () => void;
}

export default function PdfViewerModal({ url, fileName, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string;
    fetch(url, {
      headers: {
        "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID ?? "",
        "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET ?? "",
      },
    })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
        <span className="text-sm font-semibold text-foreground truncate pr-2">{fileName}</span>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors flex-shrink-0">
          <X size={18} className="text-muted-foreground" />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar el PDF.</p>
        </div>
      ) : !blobUrl ? (
        <div className="flex-1 flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : (
        <>
          {/* Desktop: iframe nativo con todos los controles */}
          <iframe
            src={blobUrl}
            className="hidden md:block flex-1 w-full"
            title={fileName}
          />

          {/* Mobile: iframe no funciona bien en iOS — abrir en visor nativo */}
          <div className="md:hidden flex-1 flex flex-col items-center justify-center gap-6 px-8">
            <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center">
              <FileText size={40} className="text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">Abrí el PDF en el visor nativo para navegar todas las páginas.</p>
            </div>
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              <ExternalLink size={16} />
              Abrir PDF
            </a>
          </div>
        </>
      )}
    </div>
  );
}
