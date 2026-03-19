import { useState } from "react";
import { X, Tag, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Loader2, Zap, Sun, Moon, Trash } from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useCategoryRules, useCreateCategoryRule, useDeleteCategoryRule } from "@/hooks/useApi";
import type { CategoryResponse } from "@/types/api";
import type { Theme } from "@/App";

type View = "main" | "categories" | "categoryForm" | "rules" | "ruleForm";

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

  const handleClose = () => {
    setView("main");
    setEditingCategory(null);
    onClose();
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
        </div>
      </div>
    </div>
  );
}
