import { useState } from "react";
import { X, Tag, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Loader2, Zap } from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useApi";
import type { CategoryResponse } from "@/types/api";
import { loadRules, saveRules, type CategoryRule } from "@/lib/categoryRules";

type View = "main" | "categories" | "categoryForm" | "rules" | "ruleForm";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CategoryFormProps {
  category: CategoryResponse | null;
  onBack: () => void;
}

function CategoryForm({ category, onBack }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const isLoading = createMut.isPending || updateMut.isPending;

  const handleSave = async () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);
    const data = { name: name.trim(), icon: icon.trim() || null, description: description.trim() || null };
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
        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
              <span className="text-xl w-8 text-center">{c.icon || "📁"}</span>
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

function RulesList({ onAdd, onDelete }: { onAdd: () => void; onDelete: (id: string) => void }) {
  const rules = loadRules();
  const { data: categories = [] } = useCategories();

  const catName = (id: number) => {
    const c = categories.find(c => c.id === id);
    return c ? `${c.icon ?? ""} ${c.name}`.trim() : `Cat ${id}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground px-1">
        Si la descripción contiene la palabra clave, se asigna la categoría automáticamente.
      </p>
      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay reglas</p>
        ) : rules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
            <span className="text-xs font-bold text-foreground flex-shrink-0 font-mono bg-background px-2 py-0.5 rounded-lg">
              {r.keyword}
            </span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="text-sm text-foreground flex-1">{catName(r.categoryId)}</span>
            <button
              onClick={() => onDelete(r.id)}
              className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} className="text-red-400" />
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
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!keyword.trim()) { setError("Ingresá una palabra clave"); return; }
    if (!categoryId) { setError("Seleccioná una categoría"); return; }
    const rules = loadRules();
    const newRule: CategoryRule = {
      id: Date.now().toString(),
      keyword: keyword.trim().toLowerCase(),
      categoryId: Number(categoryId),
    };
    saveRules([...rules, newRule]);
    onBack();
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
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">Seleccioná una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id ?? ""}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <div className="text-xs text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</div>}
      <button
        onClick={handleSave}
        className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center"
      >
        Guardar regla
      </button>
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export default function SettingsSheet({ open, onClose }: Props) {
  const [view, setView] = useState<View>("main");
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);

  const handleClose = () => {
    setView("main");
    setEditingCategory(null);
    onClose();
  };

  const deleteRule = (id: string) => {
    saveRules(loadRules().filter(r => r.id !== id));
    setView("rules"); // force re-render
  };

  const headingFor: Record<View, string> = {
    main: "Configuración",
    categories: "Categorías",
    categoryForm: "",
    rules: "Reglas automáticas",
    ruleForm: "",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-card animate-slide-up p-6 pb-10 max-h-[82vh] flex flex-col">
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
              <RulesList onAdd={() => setView("ruleForm")} onDelete={deleteRule} />
            </div>
          )}

          {view === "ruleForm" && (
            <RuleForm onBack={() => setView("rules")} />
          )}
        </div>
      </div>
    </div>
  );
}
