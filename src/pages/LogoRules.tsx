import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, ArrowRight } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLogoRules, useCreateLogoRule, useUpdateLogoRule, useDeleteLogoRule } from "@/hooks/useApi";
import type { LogoRuleDto } from "@/types/api";

interface FormState {
  keyword: string;
  logoUrl: string;
  priority: number;
}

const emptyForm: FormState = { keyword: "", logoUrl: "", priority: 1 };

export default function LogoRules() {
  const navigate = useNavigate();
  const { data: rules = [], isLoading, error } = useLogoRules();
  const createMut = useCreateLogoRule();
  const updateMut = useUpdateLogoRule();
  const deleteMut = useDeleteLogoRule();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const startNew = () => { setForm(emptyForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (r: LogoRuleDto) => {
    setForm({ keyword: r.keyword, logoUrl: r.logoUrl, priority: r.priority });
    setFormError(null);
    setEditingId(r.id);
    setShowNew(false);
  };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.keyword.trim()) { setFormError("El keyword es requerido"); return; }
    if (!form.logoUrl.trim()) { setFormError("La URL del logo es requerida"); return; }
    setFormError(null);
    const payload = { keyword: form.keyword.trim().toLowerCase(), logoUrl: form.logoUrl.trim(), priority: form.priority };
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
        <h1 className="text-lg font-bold text-foreground flex-1">Reglas de logos</h1>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Nueva
        </button>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm mb-4">Error al cargar las reglas.</div>}

      {showNew && <RuleForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva regla" />}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-secondary animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="h-6 w-24 bg-muted rounded-full" />
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-6 w-32 bg-muted rounded-full flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                <RuleForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar regla" />
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-subtle">
                  <img src={rule.logoUrl} alt={rule.keyword} className="w-8 h-8 rounded-full object-contain flex-shrink-0 bg-secondary" />
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary flex-shrink-0">{rule.keyword}</span>
                  <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{rule.logoUrl}</span>
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
          {rules.length === 0 && !showNew && <p className="text-center text-sm text-muted-foreground py-12">No hay reglas de logos. ¡Creá la primera!</p>}
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

function RuleForm({ form, onChange, onSave, onCancel, error, isSaving, title }: FormProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-3 shadow-subtle">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
          {form.logoUrl ? <img src={form.logoUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-xs text-muted-foreground">logo</span>}
        </div>
        <input
          type="text"
          value={form.logoUrl}
          onChange={e => onChange({ ...form, logoUrl: e.target.value })}
          placeholder="URL del logo *"
          className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={form.keyword}
          onChange={e => onChange({ ...form, keyword: e.target.value.toLowerCase() })}
          placeholder="Keyword (ej: netflix) *"
          className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="number"
          value={form.priority}
          onChange={e => onChange({ ...form, priority: Math.max(1, parseInt(e.target.value) || 1) })}
          min={1}
          placeholder="P"
          className="w-16 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center"
          title="Prioridad"
        />
      </div>

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
