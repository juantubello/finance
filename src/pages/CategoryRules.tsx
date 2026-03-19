import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, ArrowRight } from "lucide-react";
import {
  useCategoryRules,
  useCreateCategoryRule,
  useUpdateCategoryRule,
  useDeleteCategoryRule,
  useCategories,
} from "@/hooks/useApi";
import type { CategoryRule } from "@/types/api";

interface FormState {
  keyword: string;
  categoryId: number | null;
}

const emptyForm: FormState = { keyword: "", categoryId: null };

export default function CategoryRules() {
  const { data: rules = [], isLoading, error } = useCategoryRules();
  const { data: categories = [] } = useCategories();
  const createMut = useCreateCategoryRule();
  const updateMut = useUpdateCategoryRule();
  const deleteMut = useDeleteCategoryRule();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const startNew = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditingId(null);
    setShowNew(true);
  };

  const startEdit = (rule: CategoryRule) => {
    setForm({ keyword: rule.keyword, categoryId: rule.categoryId });
    setFormError(null);
    setEditingId(rule.id);
    setShowNew(false);
  };

  const cancelForm = () => {
    setShowNew(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.keyword.trim()) {
      setFormError("El keyword es requerido");
      return;
    }
    if (!form.categoryId) {
      setFormError("Seleccioná una categoría");
      return;
    }
    setFormError(null);
    const payload = { keyword: form.keyword.trim().toLowerCase(), categoryId: form.categoryId };
    try {
      if (editingId !== null) {
        await updateMut.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      cancelForm();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("409") || msg.includes("conflict")) {
        setFormError("Ya existe una regla para ese keyword");
      } else {
        setFormError("Error al guardar. Intentá de nuevo.");
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync(id);
    } catch {
      // silently ignore
    } finally {
      setDeleteId(null);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="pb-28 max-w-lg mx-auto pt-6 px-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-foreground">Reglas automáticas</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Nueva
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm mb-4">
          Error al cargar las reglas.
        </div>
      )}

      {/* New rule form */}
      {showNew && (
        <RuleForm
          form={form}
          categories={categories}
          onChange={setForm}
          onSave={handleSave}
          onCancel={cancelForm}
          error={formError}
          isSaving={isSaving}
          title="Nueva regla"
        />
      )}

      {/* List */}
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
                <RuleForm
                  form={form}
                  categories={categories}
                  onChange={setForm}
                  onSave={handleSave}
                  onCancel={cancelForm}
                  error={formError}
                  isSaving={isSaving}
                  title="Editar regla"
                />
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-subtle">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary flex-shrink-0">
                    {rule.keyword}
                  </span>
                  <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                    {rule.categoryName}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(rule)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                    >
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                    {deleteId === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          disabled={deleteMut.isPending}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          {deleteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                        >
                          <X size={13} className="text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(rule.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={14} className="text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {rules.length === 0 && !showNew && (
            <p className="text-center text-sm text-muted-foreground py-12">
              No hay reglas. ¡Creá la primera!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface FormProps {
  form: FormState;
  categories: { id: number; name: string; icon?: string | null }[];
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  isSaving: boolean;
  title: string;
}

function RuleForm({ form, categories, onChange, onSave, onCancel, error, isSaving, title }: FormProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 mb-3 shadow-subtle">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>

      <input
        type="text"
        value={form.keyword}
        onChange={e => onChange({ ...form, keyword: e.target.value.toLowerCase() })}
        placeholder="Keyword (ej: carrefour)"
        className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-2"
      />

      <select
        value={form.categoryId ?? ""}
        onChange={e => onChange({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
        className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3"
      >
        <option value="">Seleccioná una categoría</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.icon ? `${c.icon} ` : ""}{c.name}
          </option>
        ))}
      </select>

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
