import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, ArrowRight, RefreshCw, Info } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCardCategoryRules, useCreateCardCategoryRule, useUpdateCardCategoryRule, useDeleteCardCategoryRule, useCardCategories } from "@/hooks/useApi";
import { api } from "@/services/api";
import type { CardCategoryRuleDto } from "@/types/api";

interface FormState {
  keyword: string;
  categoryId: number | null;
  priority: number;
}

const emptyForm: FormState = { keyword: "", categoryId: null, priority: 1 };

export default function CardCategoryRules() {
  const navigate = useNavigate();
  const { data: rules = [], isLoading, error } = useCardCategoryRules();
  const { data: categories = [] } = useCardCategories();
  const createMut = useCreateCardCategoryRule();
  const updateMut = useUpdateCardCategoryRule();
  const deleteMut = useDeleteCardCategoryRule();

  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyToast, setApplyToast] = useState<string | null>(null);

  const startNew = () => { setForm(emptyForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (r: CardCategoryRuleDto) => {
    setForm({ keyword: r.keyword, categoryId: r.categoryId, priority: r.priority });
    setFormError(null);
    setEditingId(r.id);
    setShowNew(false);
  };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.keyword.trim()) { setFormError("El keyword es requerido"); return; }
    if (!form.categoryId) { setFormError("Seleccioná una categoría"); return; }
    setFormError(null);
    const payload = { keyword: form.keyword.trim().toLowerCase(), categoryId: form.categoryId, priority: form.priority };
    try {
      if (editingId !== null) {
        await updateMut.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      cancelForm();
    } catch (e: any) {
      setFormError(e?.message?.includes("409") ? "Ya existe una regla para ese keyword" : "Error al guardar. Intentá de nuevo.");
    }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMut.mutateAsync(id); } catch { } finally { setDeleteId(null); }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  const handleApply = async () => {
    setApplying(true);
    setApplyToast(null);
    try {
      const { updated } = await api.applyCardCategoryRules();
      const msg = updated === 0
        ? "No había gastos sin categorizar"
        : `Se categorizaron ${updated} gasto${updated === 1 ? "" : "s"}`;
      setApplyToast(msg);
      // Invalidate card expenses so Tarjetas re-fetches if open
      queryClient.invalidateQueries({ queryKey: ["cardExpenses"] });
    } catch {
      setApplyToast("Error al aplicar las reglas");
    } finally {
      setApplying(false);
      setTimeout(() => setApplyToast(null), 4000);
    }
  };

  return (
    <div className="pb-28 max-w-lg mx-auto pt-6 px-5">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex-1">Reglas de categorización</h1>
        <button
          onClick={handleApply}
          disabled={applying}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-foreground text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50"
          title="Aplicar reglas a gastos sin categoría"
        >
          {applying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Aplicar
        </button>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Nueva
        </button>
      </div>

      {applyToast && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
          {applyToast}
        </div>
      )}

      {error && <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm mb-4">Error al cargar las reglas.</div>}

      {showNew && <RuleForm form={form} categories={categories} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva regla" />}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-secondary animate-pulse">
              <div className="h-6 w-24 bg-muted rounded-full" />
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-6 w-32 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                <RuleForm form={form} categories={categories} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar regla" />
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-subtle">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary flex-shrink-0">{rule.keyword}</span>
                  <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{rule.categoryName}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 px-2">p:{rule.priority}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(rule)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                    {deleteId === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(rule.id)} disabled={deleteMut.isPending} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                          {deleteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button onClick={() => setDeleteId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
                          <X size={13} className="text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(rule.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <Trash2 size={14} className="text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {rules.length === 0 && !showNew && <p className="text-center text-sm text-muted-foreground py-12">No hay reglas. ¡Creá la primera!</p>}
        </div>
      )}
    </div>
  );
}

interface FormProps {
  form: FormState;
  categories: { id: number; name: string; color?: string | null }[];
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  isSaving: boolean;
  title: string;
}

function RuleForm({ form, categories, onChange, onSave, onCancel, error, isSaving, title }: FormProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-3 shadow-subtle">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">{title}</span>
        <button
          type="button"
          onClick={() => setShowInfo(v => !v)}
          className={`p-1 rounded-full transition-colors ${showInfo ? "bg-primary/15 text-primary" : "hover:bg-secondary text-muted-foreground"}`}
          aria-label="¿Cómo funcionan las reglas?"
        >
          <Info size={13} />
        </button>
      </div>

      {showInfo && (
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 space-y-1.5">
          <p className="text-[11px] font-semibold text-foreground">¿Cómo funcionan las reglas?</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Cuando se carga un resumen, cada gasto se analiza buscando el <span className="font-medium text-foreground">keyword</span> dentro de la descripción (sin importar mayúsculas).
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Si un gasto coincide con <span className="font-medium text-foreground">varias reglas</span>, se usa la de <span className="font-medium text-foreground">prioridad más alta</span>. Usá números más altos para keywords más específicos.
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Ejemplo: keyword <span className="font-medium text-foreground">netflix</span> con prioridad <span className="font-medium text-foreground">10</span> → cualquier gasto que contenga "netflix" en la descripción se categoriza automáticamente.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={form.keyword}
          onChange={e => onChange({ ...form, keyword: e.target.value.toLowerCase() })}
          placeholder="Keyword (ej: netflix)"
          className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="number"
          value={form.priority}
          onChange={e => onChange({ ...form, priority: Math.max(1, parseInt(e.target.value) || 1) })}
          min={1}
          placeholder="P"
          title="Prioridad"
          className="w-16 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center"
        />
      </div>

      <select
        value={form.categoryId ?? ""}
        onChange={e => onChange({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
        className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3"
      >
        <option value="">Seleccioná una categoría</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
