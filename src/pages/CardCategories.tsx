import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useCardCategories, useCreateCardCategory, useUpdateCardCategory, useDeleteCardCategory } from "@/hooks/useApi";
import type { CardCategoryDto } from "@/types/api";

const COLOR_PALETTE = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#8b5cf6","#ec4899","#f43f5e","#06b6d4",
  "#84cc16","#a855f7","#fb923c","#34d399","#60a5fa",
  "#f472b6","#facc15","#4ade80","#38bdf8","#c084fc",
];

interface FormState {
  name: string;
  description: string;
  color: string;
  logoUrl: string;
}

const empty: FormState = { name: "", description: "", color: "", logoUrl: "" };

export default function CardCategories() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading, error } = useCardCategories();
  const createMut = useCreateCardCategory();
  const updateMut = useUpdateCardCategory();
  const deleteMut = useDeleteCardCategory();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const startNew = () => { setForm(empty); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (c: CardCategoryDto) => {
    setForm({ name: c.name, description: c.description ?? "", color: c.color ?? "", logoUrl: c.logoUrl ?? "" });
    setFormError(null);
    setEditingId(c.id);
    setShowNew(false);
  };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("El nombre es requerido"); return; }
    setFormError(null);
    const payload = { name: form.name.trim(), description: form.description.trim() || null, color: form.color || null, logoUrl: form.logoUrl.trim() || null };
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
        <h1 className="text-lg font-bold text-foreground flex-1">Categorías de tarjeta</h1>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Nueva
        </button>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm mb-4">Error al cargar categorías.</div>}

      {showNew && <CategoryForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva categoría" />}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-secondary animate-pulse">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-2 flex-1"><div className="h-3.5 bg-muted rounded w-1/3" /><div className="h-2.5 bg-muted rounded w-2/3" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id}>
              {editingId === c.id ? (
                <CategoryForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar categoría" />
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-subtle">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: c.color ?? "var(--secondary)" }}>
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-sm font-bold text-white">{c.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground truncate">{c.description}</div>}
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
          {categories.length === 0 && !showNew && (
            <p className="text-center text-sm text-muted-foreground py-12">No hay categorías. ¡Creá la primera!</p>
          )}
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

function CategoryForm({ form, onChange, onSave, onCancel, error, isSaving, title }: FormProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-3 shadow-subtle">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: form.color || "var(--secondary)" }}>
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-sm font-bold text-white">{form.name.charAt(0).toUpperCase() || "?"}</span>
          )}
        </div>
        <input
          type="text"
          value={form.logoUrl}
          onChange={e => onChange({ ...form, logoUrl: e.target.value })}
          placeholder="URL del logo (opcional)"
          className="flex-1 h-9 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Color</span>
          {form.color && <button type="button" onClick={() => onChange({ ...form, color: "" })} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Quitar</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PALETTE.map(c => (
            <button key={c} type="button" onClick={() => onChange({ ...form, color: c })} className="w-7 h-7 rounded-full transition-all flex-shrink-0" style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
          ))}
          <div className="relative w-7 h-7 flex-shrink-0">
            <input type="color" value={form.color || "#cccccc"} onChange={e => onChange({ ...form, color: e.target.value })} className="absolute inset-0 w-full h-full rounded-full cursor-pointer opacity-0" />
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground pointer-events-none" style={{ backgroundColor: form.color && !COLOR_PALETTE.includes(form.color) ? form.color : "transparent" }}>
              {!(form.color && !COLOR_PALETTE.includes(form.color)) && "…"}
            </div>
          </div>
        </div>
      </div>

      <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="Nombre *" className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
      <input type="text" value={form.description} onChange={e => onChange({ ...form, description: e.target.value })} placeholder="Descripción (opcional)" className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3" />

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
