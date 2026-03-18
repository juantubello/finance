import { useState } from "react";
import { X, Tag, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useApi";
import type { CategoryResponse } from "@/types/api";

type View = "main" | "categories" | "categoryForm";

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

export default function SettingsSheet({ open, onClose }: Props) {
  const [view, setView] = useState<View>("main");
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);

  const handleClose = () => {
    setView("main");
    setEditingCategory(null);
    onClose();
  };

  const openEdit = (c: CategoryResponse) => {
    setEditingCategory(c);
    setView("categoryForm");
  };

  const openAdd = () => {
    setEditingCategory(null);
    setView("categoryForm");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-card animate-slide-up p-6 pb-10 max-h-[82vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">
            {view === "main" ? "Configuración" : view === "categories" ? "Categorías" : ""}
          </h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Views — flex-1 + overflow so inner content can scroll */}
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
          </div>
        )}

        {view === "categories" && (
          <div>
            <button
              onClick={() => setView("main")}
              className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} />
              Volver
            </button>
            <CategoriesList onEdit={openEdit} onAdd={openAdd} />
          </div>
        )}

        {view === "categoryForm" && (
          <CategoryForm
            category={editingCategory}
            onBack={() => setView("categories")}
          />
        )}
        </div>
      </div>
    </div>
  );
}
