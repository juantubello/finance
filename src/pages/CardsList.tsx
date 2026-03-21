import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCards, useCreateCard, useUpdateCard, useDeleteCard } from "@/hooks/useApi";
import type { CardDto } from "@/types/api";

interface FormState {
  name: string;
  bank: string;
  type: "VISA" | "MASTERCARD";
}

const emptyForm: FormState = { name: "", bank: "", type: "VISA" };

export default function CardsList() {
  const navigate = useNavigate();
  const { data: cards = [], isLoading, error } = useCards();
  const createMut = useCreateCard();
  const updateMut = useUpdateCard();
  const deleteMut = useDeleteCard();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const startNew = () => { setForm(emptyForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (c: CardDto) => {
    setForm({ name: c.name, bank: c.bank, type: c.type });
    setFormError(null);
    setEditingId(c.id);
    setShowNew(false);
  };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("El nombre es requerido"); return; }
    if (!form.bank.trim()) { setFormError("El banco es requerido"); return; }
    setFormError(null);
    const payload = { name: form.name.trim(), bank: form.bank.trim(), type: form.type };
    try {
      if (editingId !== null) {
        await updateMut.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      cancelForm();
    } catch {
      setFormError("Error al guardar. Intentá de nuevo.");
    }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMut.mutateAsync(id); } catch { } finally { setDeleteId(null); }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="pb-28 max-w-lg mx-auto pt-6 px-5">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1">Tarjetas</h1>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Nueva
        </button>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm mb-4">Error al cargar las tarjetas.</div>}

      {showNew && <CardForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva tarjeta" />}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-secondary animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-muted" />
              <div className="space-y-2 flex-1"><div className="h-3.5 bg-muted rounded w-1/3" /><div className="h-2.5 bg-muted rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(c => (
            <div key={c.id}>
              {editingId === c.id ? (
                <CardForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar tarjeta" />
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-subtle">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{c.type === "VISA" ? "V" : "MC"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.bank} · {c.type}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                    {deleteId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(c.id)} disabled={deleteMut.isPending} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                          {deleteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button onClick={() => setDeleteId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                          <X size={13} className="text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(c.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <Trash2 size={14} className="text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {cards.length === 0 && !showNew && <p className="text-center text-sm text-muted-foreground py-12">No hay tarjetas registradas. ¡Creá la primera!</p>}
        </div>
      )}
    </div>
  );
}

interface FormProps {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  isSaving: boolean;
  title: string;
}

function CardForm({ form, onChange, onSave, onCancel, error, isSaving, title }: FormProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-3 shadow-subtle">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>

      <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="Nombre (ej: Visa Signature) *" className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
      <input type="text" value={form.bank} onChange={e => onChange({ ...form, bank: e.target.value })} placeholder="Banco (ej: BBVA) *" className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-2" />

      <select value={form.type} onChange={e => onChange({ ...form, type: e.target.value as "VISA" | "MASTERCARD" })} className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3">
        <option value="VISA">VISA</option>
        <option value="MASTERCARD">MASTERCARD</option>
      </select>

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 h-10 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
        <button type="button" onClick={onSave} disabled={isSaving} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
