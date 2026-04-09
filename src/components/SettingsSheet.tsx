import { useMemo, useState } from "react";
import { X, Tag, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Loader2, Zap, Sun, Moon, Trash, CreditCard, Bell, Hash } from "lucide-react";
import CardConfigSheet from "@/components/CardConfigSheet";
import { toast } from "@/components/ui/sonner";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  useCategoryRules,
  useCreateCategoryRule,
  useDeleteCategoryRule,
  useLabels,
  useLabelRules,
  useCreateLabelRule,
  useUpdateLabelRule,
  useDeleteLabelRule,
  useApplyLabelRules,
  usePushSubscriptions,
  useSubscribePush,
  useUpdatePushSubscription,
  useDeletePushSubscription,
  useTestPushNotification,
} from "@/hooks/useApi";
import type { CategoryResponse, Label, LabelRule } from "@/types/api";
import type { Theme } from "@/App";
import { getDeviceId, getAlias, getSubscriptionId, subscribePushNotifications, isPushSupported } from "@/lib/pushNotifications";

type View = "main" | "categories" | "categoryForm" | "rules" | "ruleForm" | "labels" | "labelRules" | "labelRuleForm" | "notifications";

interface Props {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

interface CategoryFormProps {
  category: CategoryResponse | null;
  onBack: () => void;
}

const COLOR_PALETTE = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#8b5cf6","#ec4899","#f43f5e","#06b6d4",
  "#84cc16","#a855f7","#fb923c","#34d399","#60a5fa",
  "#f472b6","#facc15","#4ade80","#38bdf8","#c084fc",
];

function normalizeLabelName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function CategoryForm({ category, onBack }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [color, setColor] = useState(category?.color ?? "");
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const isLoading = createMut.isPending || updateMut.isPending;

  const handleSave = async () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);
    const data = { name: name.trim(), icon: icon.trim() || null, description: description.trim() || null, color: color || null };
    try {
      if (category?.id != null) {
        await updateMut.mutateAsync({ id: category.id, data });
      } else {
        await createMut.mutateAsync(data);
      }
      onBack();
    } catch {
      setError("Error al guardar. Verificá que el backend tenga el endpoint.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h3 className="text-base font-bold text-foreground flex-1">
          {category ? "Editar categoría" : "Nueva categoría"}
        </h3>
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl transition-colors"
          style={{ backgroundColor: color || "var(--secondary)" }}
        >
          {icon || "📁"}
        </div>
      </div>

      {/* Emoji input */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Ícono (emoji)</label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🛒"
          className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Color palette */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          {color && (
            <button type="button" onClick={() => setColor("")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Quitar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-9 h-9 rounded-full flex-shrink-0 transition-transform active:scale-90"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : "none",
                outlineOffset: "3px",
              }}
            />
          ))}
          {/* Custom color */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <input
              type="color"
              value={color || "#cccccc"}
              onChange={e => setColor(e.target.value)}
              className="absolute inset-0 w-full h-full rounded-full cursor-pointer opacity-0"
            />
            <div
              className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground pointer-events-none"
              style={{ backgroundColor: color && !COLOR_PALETTE.includes(color) ? color : "transparent" }}
            >
              {!(color && !COLOR_PALETTE.includes(color)) && "…"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Supermercado"
          className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {error && (
        <div className="text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={isLoading}
        className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={16} className="animate-spin" />}
        {isLoading ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function CategoriesList({ onEdit, onAdd }: { onEdit: (c: CategoryResponse) => void; onAdd: () => void }) {
  const { data: categories = [], isLoading, error } = useCategories();
  const deleteMut = useDeleteCategory();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteMut.mutateAsync(id);
    } catch {
      // silent - will show stale data
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">Error al cargar categorías</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No hay categorías</p>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: c.color ?? "var(--muted)" }}
              >
                {c.icon || "📁"}
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{c.name}</span>
              <button
                onClick={() => onEdit(c)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil size={14} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => c.id != null && handleDelete(c.id)}
                disabled={deletingId === c.id}
                className="p-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deletingId === c.id
                  ? <Loader2 size={14} className="animate-spin text-red-400" />
                  : <Trash2 size={14} className="text-red-400" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onAdd}
        className="flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground"
      >
        <Plus size={16} />
        Agregar categoría
      </button>
    </div>
  );
}

// ─── Rules management ─────────────────────────────────────────────────────────

function RulesList({ onAdd }: { onAdd: () => void }) {
  const { data: rules = [], isLoading } = useCategoryRules();
  const deleteMut = useDeleteCategoryRule();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try { await deleteMut.mutateAsync(id); } finally { setDeletingId(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground px-1">
        Si la descripción contiene la palabra clave, se asigna la categoría automáticamente.
      </p>
      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay reglas</p>
        ) : rules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
            <span className="text-xs font-bold text-foreground flex-shrink-0 font-mono bg-background px-2 py-0.5 rounded-lg">
              {r.keyword}
            </span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="text-sm text-foreground flex-1">{r.categoryName}</span>
            <button
              onClick={() => handleDelete(r.id)}
              disabled={deletingId === r.id}
              className="p-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {deletingId === r.id
                ? <Loader2 size={14} className="animate-spin text-red-400" />
                : <Trash2 size={14} className="text-red-400" />}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground"
      >
        <Plus size={16} />
        Agregar regla
      </button>
    </div>
  );
}

function RuleForm({ onBack }: { onBack: () => void }) {
  const { data: categories = [], isLoading } = useCategories();
  const createMut = useCreateCategoryRule();
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!keyword.trim()) { setError("Ingresá una palabra clave"); return; }
    if (!categoryId) { setError("Seleccioná una categoría"); return; }
    try {
      await createMut.mutateAsync({ keyword: keyword.trim().toLowerCase(), categoryId: Number(categoryId) });
      onBack();
    } catch (e: any) {
      setError(e?.message?.includes("409") || e?.message?.includes("409") ? "Ya existe una regla para ese keyword" : "Error al guardar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h3 className="text-base font-bold text-foreground flex-1">Nueva regla</h3>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Palabra clave</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Ej: arnaldo"
          className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <p className="text-[10px] text-muted-foreground mt-1 px-1">Se detecta en cualquier parte de la descripción, sin importar mayúsculas.</p>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
        {isLoading ? (
          <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-secondary">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">Seleccioná una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id ?? ""}>{c.icon} {c.name}</option>
            ))}
          </select>
        )}
      </div>
      {error && <div className="text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</div>}
      <button
        onClick={handleSave}
        disabled={createMut.isPending}
        className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {createMut.isPending && <Loader2 size={15} className="animate-spin" />}
        Guardar regla
      </button>
    </div>
  );
}

function LabelNameForm({
  title,
  initialName = "",
  submitLabel,
  onCancel,
  onSave,
  isSaving,
  error,
}: {
  title: string;
  initialName?: string;
  submitLabel: string;
  onCancel: () => void;
  onSave: (name: string) => void | Promise<void>;
  isSaving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-subtle">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: helado"
        className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
      {error && <div className="mt-2 text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</div>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void onSave(name)}
          disabled={isSaving}
          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function LabelsView({ onBack }: { onBack: () => void }) {
  const { data: labels = [], isLoading, error } = useLabels();
  const createMut = useCreateLabel();
  const updateMut = useUpdateLabel();
  const deleteMut = useDeleteLabel();
  const sortedLabels = useMemo(() => [...labels].sort((a, b) => a.name.localeCompare(b.name)), [labels]);
  const [showNew, setShowNew] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const resetForm = () => {
    setShowNew(false);
    setEditingLabel(null);
    setFormError(null);
  };

  const handleCreate = async (rawName: string) => {
    const name = normalizeLabelName(rawName);
    if (!name) {
      setFormError("Ingresá un nombre de etiqueta");
      return;
    }
    setFormError(null);
    try {
      await createMut.mutateAsync({ name });
      resetForm();
      toast.success("Etiqueta creada.");
    } catch (e: any) {
      const message = e?.message ?? "";
      setFormError(message.includes("409") ? "Ya existe una etiqueta con ese nombre" : "Error al crear la etiqueta");
    }
  };

  const handleUpdate = async (rawName: string) => {
    if (!editingLabel) return;
    const name = normalizeLabelName(rawName);
    if (!name) {
      setFormError("Ingresá un nombre de etiqueta");
      return;
    }
    setFormError(null);
    try {
      await updateMut.mutateAsync({ id: editingLabel.id, data: { name } });
      resetForm();
      toast.success("Etiqueta actualizada.");
    } catch (e: any) {
      const message = e?.message ?? "";
      setFormError(message.includes("409") ? "Ya existe una etiqueta con ese nombre" : "Error al guardar la etiqueta");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync(id);
      setConfirmDeleteId(null);
      toast.success("Etiqueta eliminada.");
    } catch {
      toast.error("No se pudo eliminar la etiqueta.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Volver
      </button>

      {(showNew || editingLabel) && (
        <LabelNameForm
          key={editingLabel ? `edit-${editingLabel.id}` : "new-label"}
          title={editingLabel ? "Editar etiqueta" : "Nueva etiqueta"}
          initialName={editingLabel?.name ?? ""}
          submitLabel={editingLabel ? "Guardar" : "Crear"}
          onCancel={resetForm}
          onSave={editingLabel ? handleUpdate : handleCreate}
          isSaving={createMut.isPending || updateMut.isPending}
          error={formError}
        />
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando etiquetas...</span>
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">Error al cargar etiquetas</p>
      ) : sortedLabels.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No hay etiquetas</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[42vh] overflow-y-auto">
          {sortedLabels.map((label) => (
            <div key={label.id} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                #{label.name}
              </span>
              <span className="text-xs text-muted-foreground flex-1">Etiqueta</span>
              <button
                onClick={() => {
                  setEditingLabel(label);
                  setShowNew(false);
                  setFormError(null);
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil size={14} className="text-muted-foreground" />
              </button>
              {confirmDeleteId === label.id ? (
                <>
                  <button
                    onClick={() => void handleDelete(label.id)}
                    disabled={deleteMut.isPending}
                    className="p-1.5 rounded-lg bg-red-500 text-white transition-colors disabled:opacity-50"
                  >
                    {deleteMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Sí"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(label.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!showNew && !editingLabel && (
        <button
          onClick={() => {
            setShowNew(true);
            setEditingLabel(null);
            setFormError(null);
          }}
          className="flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground"
        >
          <Plus size={16} />
          Agregar etiqueta
        </button>
      )}
    </div>
  );
}

function LabelRulesList({ onAdd, onEdit, onManageLabels }: { onAdd: () => void; onEdit: (rule: LabelRule) => void; onManageLabels: () => void }) {
  const { data: rules = [], isLoading, error } = useLabelRules();
  const deleteMut = useDeleteLabelRule();
  const applyMut = useApplyLabelRules();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteMut.mutateAsync(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleApply = async () => {
    try {
      const res = await applyMut.mutateAsync();
      toast.success(`Se actualizaron ${res.updated} gasto${res.updated === 1 ? "" : "s"}.`);
    } catch {
      toast.error("No se pudieron reaplicar las reglas.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground px-1">
        Si la descripción contiene la palabra clave, se agregan automáticamente los labels asociados.
      </p>

      <button
        onClick={onManageLabels}
        className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-secondary text-sm font-semibold text-foreground hover:bg-muted transition-colors"
      >
        <Hash size={15} />
        Gestionar etiquetas
      </button>

      <button
        onClick={handleApply}
        disabled={applyMut.isPending}
        className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors disabled:opacity-50"
      >
        {applyMut.isPending && <Loader2 size={15} className="animate-spin" />}
        Reaplicar reglas
      </button>

      <div className="flex flex-col gap-2 max-h-[42vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">Error al cargar reglas de etiquetas</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay reglas</p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="rounded-xl bg-secondary px-3 py-2.5">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-foreground flex-shrink-0 font-mono bg-background px-2 py-0.5 rounded-lg">
                  {rule.keyword}
                </span>
                <span className="text-muted-foreground text-xs pt-1">→</span>
                <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
                  {rule.labels.map((label) => (
                    <span key={`${rule.id}-${label.id}`} className="inline-flex items-center h-6 px-2 rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                      #{label.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(rule)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                  {confirmDeleteId === rule.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        className="p-1.5 rounded-lg bg-red-500 text-white transition-colors disabled:opacity-50"
                      >
                        {deletingId === rule.id ? <Loader2 size={14} className="animate-spin" /> : "Sí"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <X size={14} className="text-muted-foreground" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onAdd}
        className="flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground"
      >
        <Plus size={16} />
        Agregar regla de etiquetas
      </button>
    </div>
  );
}

function LabelRuleForm({ rule, onBack }: { rule: LabelRule | null; onBack: () => void }) {
  const { data: labels = [], isLoading } = useLabels();
  const createMut = useCreateLabelRule();
  const updateMut = useUpdateLabelRule();
  const createLabelMut = useCreateLabel();
  const [keyword, setKeyword] = useState(rule?.keyword ?? "");
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(rule?.labels.map((label) => label.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [showNewLabelForm, setShowNewLabelForm] = useState(false);
  const [labelFormError, setLabelFormError] = useState<string | null>(null);

  const selectedLabels = labels.filter((label) => selectedLabelIds.includes(label.id));

  const toggleLabel = (labelId: number) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const handleCreateInlineLabel = async (rawName: string) => {
    const name = normalizeLabelName(rawName);
    if (!name) {
      setLabelFormError("Ingresá un nombre de etiqueta");
      return;
    }
    setLabelFormError(null);
    try {
      const created = await createLabelMut.mutateAsync({ name });
      setSelectedLabelIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      setShowNewLabelForm(false);
      toast.success("Etiqueta creada.");
    } catch (e: any) {
      const message = e?.message ?? "";
      setLabelFormError(message.includes("409") ? "Ya existe una etiqueta con ese nombre" : "Error al crear la etiqueta");
    }
  };

  const handleSave = async () => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) {
      setError("Ingresá una palabra clave");
      return;
    }
    if (selectedLabelIds.length === 0) {
      setError("Seleccioná al menos un label");
      return;
    }

    setError(null);
    const payload = { keyword: trimmedKeyword, labelIds: selectedLabelIds };

    try {
      if (rule) {
        await updateMut.mutateAsync({ id: rule.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onBack();
    } catch (e: any) {
      const message = e?.message ?? "";
      if (message.includes("409") || message.toLowerCase().includes("conflict")) {
        setError("Ya existe una regla para ese keyword");
      } else {
        setError("Error al guardar");
      }
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h3 className="text-base font-bold text-foreground flex-1">
          {rule ? "Editar regla de etiquetas" : "Nueva regla de etiquetas"}
        </h3>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Palabra clave</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Ej: arnaldo"
          className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <p className="text-[10px] text-muted-foreground mt-1 px-1">Si la descripción contiene esta palabra, se agregan los labels elegidos.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-muted-foreground block">Labels</label>
          {!showNewLabelForm && (
            <button
              type="button"
              onClick={() => {
                setShowNewLabelForm(true);
                setLabelFormError(null);
              }}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Crear etiqueta
            </button>
          )}
        </div>
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedLabels.map((label) => (
              <button
                key={`selected-${label.id}`}
                type="button"
                onClick={() => toggleLabel(label.id)}
                className="inline-flex items-center h-7 px-2.5 rounded-full bg-primary/12 text-[11px] font-semibold text-primary"
              >
                #{label.name}
              </button>
            ))}
          </div>
        )}
        {showNewLabelForm && (
          <LabelNameForm
            title="Nueva etiqueta"
            submitLabel="Crear y usar"
            onCancel={() => {
              setShowNewLabelForm(false);
              setLabelFormError(null);
            }}
            onSave={handleCreateInlineLabel}
            isSaving={createLabelMut.isPending}
            error={labelFormError}
          />
        )}
        {isLoading ? (
          <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-secondary">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando labels...</span>
          </div>
        ) : labels.length === 0 ? (
          <div className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">No hay labels disponibles.</div>
        ) : (
          <div className="flex flex-wrap gap-2 rounded-2xl bg-secondary/60 p-3">
            {labels.map((label) => {
              const active = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`inline-flex items-center h-8 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  #{label.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</div>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSaving && <Loader2 size={15} className="animate-spin" />}
        {rule ? "Guardar cambios" : "Guardar regla"}
      </button>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

const ALIASES = ["JUAN", "CAMI"] as const;

function NotificationsView({ onBack }: { onBack: () => void }) {
  const { data: subscriptions = [], isLoading } = usePushSubscriptions();
  const subscribeMut = useSubscribePush();
  const updateMut = useUpdatePushSubscription();
  const deleteMut = useDeletePushSubscription();
  const testMut = useTestPushNotification();

  const [selectedAlias, setSelectedAlias] = useState<string>(getAlias() ?? "");
  const [registering, setRegistering] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceId = getDeviceId();
  const mySubscription = subscriptions.find(s => s.deviceId === deviceId);
  const subId = mySubscription?.id ?? getSubscriptionId();

  const handleRegister = async () => {
    if (!selectedAlias) { setError("Seleccioná un alias"); return; }
    if (!isPushSupported()) { setError("Tu navegador no soporta notificaciones push"); return; }
    setRegistering(true);
    setError(null);
    try {
      await subscribePushNotifications(selectedAlias, data => subscribeMut.mutateAsync(data));
    } catch {
      setError("No se pudo registrar. Verificá los permisos del navegador.");
    } finally {
      setRegistering(false);
    }
  };

  const handleToggle = async (field: "active" | "receiveOwn", value: boolean) => {
    if (!mySubscription) return;
    await updateMut.mutateAsync({
      id: mySubscription.id,
      data: {
        active: field === "active" ? value : mySubscription.active,
        receiveOwn: field === "receiveOwn" ? value : mySubscription.receiveOwn,
      },
    });
  };

  const handleTest = async () => {
    const id = mySubscription?.id ?? subId;
    if (!id) return;
    setTestResult(null);
    try {
      await testMut.mutateAsync(id);
      setTestResult("Notificación enviada");
    } catch {
      setTestResult("Error al enviar");
    }
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
        <h3 className="text-base font-bold text-foreground flex-1">Notificaciones</h3>
      </div>

      {/* Este dispositivo */}
      <div className="rounded-2xl bg-secondary/60 border border-border/40 px-4 py-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Este dispositivo</p>

        {mySubscription ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{mySubscription.alias}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mySubscription.active ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-secondary text-muted-foreground"}`}>
                {mySubscription.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Recibir notificaciones</span>
              <button
                onClick={() => handleToggle("active", !mySubscription.active)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${mySubscription.active ? "bg-primary" : "bg-secondary border border-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${mySubscription.active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-foreground">Recibir mis propios gastos</span>
                <p className="text-[10px] text-muted-foreground">Para probar — te llegan tus propias notificaciones</p>
              </div>
              <button
                onClick={() => handleToggle("receiveOwn", !mySubscription.receiveOwn)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ml-3 ${mySubscription.receiveOwn ? "bg-primary" : "bg-secondary border border-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${mySubscription.receiveOwn ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleTest}
                disabled={testMut.isPending}
                className="flex-1 h-9 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {testMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                {testResult ?? "Probar notificación"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Este dispositivo no está registrado.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">¿Quién sos?</label>
              <div className="flex gap-2">
                {ALIASES.map(a => (
                  <button
                    key={a}
                    onClick={() => setSelectedAlias(a)}
                    className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${selectedAlias === a ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleRegister}
              disabled={registering || !selectedAlias}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {registering ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              Activar notificaciones
            </button>
          </>
        )}
      </div>

      {/* Todos los dispositivos */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Todos los dispositivos</p>
        {isLoading ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">No hay dispositivos registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {subscriptions.map(s => (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${s.deviceId === deviceId ? "bg-primary/10 border border-primary/20" : "bg-secondary"}`}>
                <Bell size={16} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.alias} {s.deviceId === deviceId && <span className="text-[10px] font-normal text-primary">(este)</span>}</p>
                  <p className="text-[10px] text-muted-foreground">{s.active ? "Activo" : "Inactivo"}{s.receiveOwn ? " · recibe propios" : ""}</p>
                </div>
                <button
                  onClick={() => deleteMut.mutate(s.id)}
                  disabled={deleteMut.isPending}
                  className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Purge cache ──────────────────────────────────────────────────────────────

function PurgeButton() {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30">
        <p className="text-xs font-medium text-red-600 dark:text-red-400">¿Limpiar todos los datos locales? Se recargará la app.</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
            localStorage.clear();
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
            window.location.reload();
          }}
            className="flex-1 h-9 rounded-xl bg-red-500 text-white text-xs font-semibold"
          >
            Sí, limpiar
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 h-9 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
    >
      <Trash size={20} className="text-red-400" />
      <span className="text-sm font-medium text-red-500 flex-1">Limpiar caché local</span>
    </button>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export default function SettingsSheet({ open, onClose, theme, onThemeChange }: Props) {
  const [view, setView] = useState<View>("main");
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [editingLabelRule, setEditingLabelRule] = useState<LabelRule | null>(null);
  const [cardConfigOpen, setCardConfigOpen] = useState(false);

  const handleClose = () => {
    setView("main");
    setEditingCategory(null);
    setEditingLabelRule(null);
    onClose();
  };

  const headingFor: Record<View, string> = {
    main: "Configuración",
    categories: "Categorías",
    categoryForm: "",
    rules: "Reglas automáticas",
    ruleForm: "",
    labels: "Etiquetas",
    labelRules: "Reglas de etiquetas",
    labelRuleForm: "",
    notifications: "",
  };

  if (!open) return null;

  return (
    <>
    <CardConfigSheet open={cardConfigOpen} onClose={() => setCardConfigOpen(false)} />
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-card animate-slide-up p-6 pb-10 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">{headingFor[view]}</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {view === "main" && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setView("categories")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <Tag size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">Editar categorías</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => setView("rules")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <Zap size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">Reglas automáticas</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => setView("labels")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <Hash size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">Etiquetas</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => setView("labelRules")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <Tag size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">Reglas automáticas de etiquetas</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => setCardConfigOpen(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <CreditCard size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">Configuración tarjetas</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => setView("notifications")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <Bell size={20} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">Notificaciones</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
              {/* Theme toggle */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl">
                {theme === "dark" ? <Moon size={20} className="text-muted-foreground" /> : <Sun size={20} className="text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground flex-1">Tema</span>
                <button
                  onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Purge cache */}
              <PurgeButton />
            </div>
          )}

          {view === "categories" && (
            <div>
              <button onClick={() => setView("main")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
                <ChevronLeft size={14} /> Volver
              </button>
              <CategoriesList
                onEdit={(c) => { setEditingCategory(c); setView("categoryForm"); }}
                onAdd={() => { setEditingCategory(null); setView("categoryForm"); }}
              />
            </div>
          )}

          {view === "categoryForm" && (
            <CategoryForm category={editingCategory} onBack={() => setView("categories")} />
          )}

          {view === "rules" && (
            <div>
              <button onClick={() => setView("main")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
                <ChevronLeft size={14} /> Volver
              </button>
              <RulesList onAdd={() => setView("ruleForm")} />
            </div>
          )}

          {view === "ruleForm" && (
            <RuleForm onBack={() => setView("rules")} />
          )}

          {view === "notifications" && (
            <NotificationsView onBack={() => setView("main")} />
          )}

          {view === "labels" && (
            <LabelsView onBack={() => setView("main")} />
          )}

          {view === "labelRules" && (
            <div>
              <button onClick={() => setView("main")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
                <ChevronLeft size={14} /> Volver
              </button>
              <LabelRulesList
                onManageLabels={() => setView("labels")}
                onAdd={() => { setEditingLabelRule(null); setView("labelRuleForm"); }}
                onEdit={(rule) => { setEditingLabelRule(rule); setView("labelRuleForm"); }}
              />
            </div>
          )}

          {view === "labelRuleForm" && (
            <LabelRuleForm rule={editingLabelRule} onBack={() => setView("labelRules")} />
          )}
        </div>
      </div>
    </div>
    </>
  );
}
