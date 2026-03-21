import { useState } from "react";
import {
  X, ChevronLeft, ChevronRight, CreditCard, Tag, Zap, Image,
  Plus, Pencil, Trash2, Check, Loader2, ArrowRight,
} from "lucide-react";
import {
  useCards, useCreateCard, useUpdateCard, useDeleteCard,
  useCardCategories, useCreateCardCategory, useUpdateCardCategory, useDeleteCardCategory,
  useCardCategoryRules, useCreateCardCategoryRule, useUpdateCardCategoryRule, useDeleteCardCategoryRule,
  useLogoRules, useCreateLogoRule, useUpdateLogoRule, useDeleteLogoRule,
} from "@/hooks/useApi";
import type { CardDto, CardCategoryDto, CardCategoryRuleDto, LogoRuleDto } from "@/types/api";

type View = "main" | "cards" | "categories" | "categoryRules" | "logoRules";

const headings: Record<View, string> = {
  main: "Configuración tarjetas",
  cards: "Tarjetas",
  categories: "Categorías de tarjeta",
  categoryRules: "Reglas de categorización",
  logoRules: "Reglas de logos",
};

const COLOR_PALETTE = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#8b5cf6","#ec4899","#f43f5e","#06b6d4",
  "#84cc16","#a855f7","#fb923c","#34d399","#60a5fa",
  "#f472b6","#facc15","#4ade80","#38bdf8","#c084fc",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─── Main hub ─────────────────────────────────────────────────────────────────

function MainView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const items: { label: string; description: string; icon: React.ElementType; view: View }[] = [
    { label: "Tarjetas", description: "Gestionar tarjetas registradas", icon: CreditCard, view: "cards" },
    { label: "Categorías de tarjeta", description: "Categorías para gastos de tarjeta", icon: Tag, view: "categories" },
    { label: "Reglas de categorización", description: "Keyword → categoría automática", icon: Zap, view: "categoryRules" },
    { label: "Reglas de logos", description: "Keyword → imagen del comercio", icon: Image, view: "logoRules" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {items.map(({ label, description, icon: Icon, view }) => (
        <button
          key={view}
          onClick={() => onNavigate(view)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
        >
          <Icon size={20} className="text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

interface CardFormState { name: string; bank: string; type: "VISA" | "MASTERCARD" }
const emptyCardForm: CardFormState = { name: "", bank: "", type: "VISA" };

function CardsView({ onBack }: { onBack: () => void }) {
  const { data: cards = [], isLoading, error } = useCards();
  const createMut = useCreateCard();
  const updateMut = useUpdateCard();
  const deleteMut = useDeleteCard();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CardFormState>(emptyCardForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMut.isPending || updateMut.isPending;

  const startNew = () => { setForm(emptyCardForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (c: CardDto) => { setForm({ name: c.name, bank: c.bank, type: c.type }); setFormError(null); setEditingId(c.id); setShowNew(false); };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("El nombre es requerido"); return; }
    if (!form.bank.trim()) { setFormError("El banco es requerido"); return; }
    setFormError(null);
    try {
      if (editingId !== null) await updateMut.mutateAsync({ id: editingId, data: { name: form.name.trim(), bank: form.bank.trim(), type: form.type } });
      else await createMut.mutateAsync({ name: form.name.trim(), bank: form.bank.trim(), type: form.type });
      cancelForm();
    } catch { setFormError("Error al guardar. Intentá de nuevo."); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMut.mutateAsync(id); } catch {} finally { setDeleteId(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <BackRow onBack={onBack} />
      {error && <ErrorMsg>Error al cargar las tarjetas.</ErrorMsg>}
      {showNew && (
        <InlineCardForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva tarjeta" />
      )}
      {isLoading ? <Skeleton count={2} /> : (
        <div className="flex flex-col gap-2">
          {cards.map(c => (
            <div key={c.id}>
              {editingId === c.id ? (
                <InlineCardForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar tarjeta" />
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
                  <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{c.type === "VISA" ? "V" : "MC"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.bank} · {c.type}</div>
                  </div>
                  <EditDeleteBtns onEdit={() => startEdit(c)} onDelete={() => setDeleteId(c.id)} onDeleteConfirm={() => handleDelete(c.id)} onDeleteCancel={() => setDeleteId(null)} isDeleting={deleteId === c.id} isPending={deleteMut.isPending} />
                </div>
              )}
            </div>
          ))}
          {cards.length === 0 && !showNew && <EmptyMsg>No hay tarjetas registradas.</EmptyMsg>}
        </div>
      )}
      <AddButton onClick={startNew} label="Agregar tarjeta" />
    </div>
  );
}

function InlineCardForm({ form, onChange, onSave, onCancel, error, isSaving, title }: {
  form: CardFormState; onChange: (f: CardFormState) => void; onSave: () => void; onCancel: () => void; error: string | null; isSaving: boolean; title: string;
}) {
  return (
    <div className="bg-background border border-border/60 rounded-2xl p-4 mb-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>
      <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="Nombre (ej: Visa Signature) *" className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
      <input type="text" value={form.bank} onChange={e => onChange({ ...form, bank: e.target.value })} placeholder="Banco (ej: BBVA) *" className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
      <select value={form.type} onChange={e => onChange({ ...form, type: e.target.value as "VISA" | "MASTERCARD" })} className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3">
        <option value="VISA">VISA</option>
        <option value="MASTERCARD">MASTERCARD</option>
      </select>
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      <SaveCancelRow onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  );
}

// ─── Card Categories ──────────────────────────────────────────────────────────

interface CatFormState { name: string; description: string; color: string; logoUrl: string }
const emptyCatForm: CatFormState = { name: "", description: "", color: "", logoUrl: "" };

function CategoriesView({ onBack }: { onBack: () => void }) {
  const { data: categories = [], isLoading, error } = useCardCategories();
  const createMut = useCreateCardCategory();
  const updateMut = useUpdateCardCategory();
  const deleteMut = useDeleteCardCategory();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CatFormState>(emptyCatForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMut.isPending || updateMut.isPending;

  const startNew = () => { setForm(emptyCatForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (c: CardCategoryDto) => { setForm({ name: c.name, description: c.description ?? "", color: c.color ?? "", logoUrl: c.logoUrl ?? "" }); setFormError(null); setEditingId(c.id); setShowNew(false); };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("El nombre es requerido"); return; }
    setFormError(null);
    const payload = { name: form.name.trim(), description: form.description.trim() || null, color: form.color || null, logoUrl: form.logoUrl.trim() || null };
    try {
      if (editingId !== null) await updateMut.mutateAsync({ id: editingId, data: payload });
      else await createMut.mutateAsync(payload);
      cancelForm();
    } catch { setFormError("Error al guardar. Intentá de nuevo."); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMut.mutateAsync(id); } catch {} finally { setDeleteId(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <BackRow onBack={onBack} />
      {error && <ErrorMsg>Error al cargar categorías.</ErrorMsg>}
      {showNew && <InlineCatForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva categoría" />}
      {isLoading ? <Skeleton count={3} /> : (
        <div className="flex flex-col gap-2">
          {categories.map(c => (
            <div key={c.id}>
              {editingId === c.id ? (
                <InlineCatForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar categoría" />
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: c.color ?? "var(--muted)" }}>
                    {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" /> : <span className="text-sm font-bold text-white">{c.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground truncate">{c.description}</div>}
                  </div>
                  <EditDeleteBtns onEdit={() => startEdit(c)} onDelete={() => setDeleteId(c.id)} onDeleteConfirm={() => handleDelete(c.id)} onDeleteCancel={() => setDeleteId(null)} isDeleting={deleteId === c.id} isPending={deleteMut.isPending} />
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && !showNew && <EmptyMsg>No hay categorías de tarjeta.</EmptyMsg>}
        </div>
      )}
      <AddButton onClick={startNew} label="Agregar categoría" />
    </div>
  );
}

function InlineCatForm({ form, onChange, onSave, onCancel, error, isSaving, title }: {
  form: CatFormState; onChange: (f: CatFormState) => void; onSave: () => void; onCancel: () => void; error: string | null; isSaving: boolean; title: string;
}) {
  return (
    <div className="bg-background border border-border/60 rounded-2xl p-4 mb-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: form.color || "var(--secondary)" }}>
          {form.logoUrl ? <img src={form.logoUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-sm font-bold text-white">{form.name.charAt(0).toUpperCase() || "?"}</span>}
        </div>
        <input type="text" value={form.logoUrl} onChange={e => onChange({ ...form, logoUrl: e.target.value })} placeholder="URL del logo (opcional)" className="flex-1 h-9 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
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
      <SaveCancelRow onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  );
}

// ─── Category Rules ───────────────────────────────────────────────────────────

interface CatRuleFormState { keyword: string; categoryId: number | null; priority: number }
const emptyCatRuleForm: CatRuleFormState = { keyword: "", categoryId: null, priority: 1 };

function CategoryRulesView({ onBack }: { onBack: () => void }) {
  const { data: rules = [], isLoading, error } = useCardCategoryRules();
  const { data: categories = [] } = useCardCategories();
  const createMut = useCreateCardCategoryRule();
  const updateMut = useUpdateCardCategoryRule();
  const deleteMut = useDeleteCardCategoryRule();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CatRuleFormState>(emptyCatRuleForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMut.isPending || updateMut.isPending;

  const startNew = () => { setForm(emptyCatRuleForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (r: CardCategoryRuleDto) => { setForm({ keyword: r.keyword, categoryId: r.categoryId, priority: r.priority }); setFormError(null); setEditingId(r.id); setShowNew(false); };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.keyword.trim()) { setFormError("El keyword es requerido"); return; }
    if (!form.categoryId) { setFormError("Seleccioná una categoría"); return; }
    setFormError(null);
    const payload = { keyword: form.keyword.trim().toLowerCase(), categoryId: form.categoryId, priority: form.priority };
    try {
      if (editingId !== null) await updateMut.mutateAsync({ id: editingId, data: payload });
      else await createMut.mutateAsync(payload);
      cancelForm();
    } catch (e: any) { setFormError(e?.message?.includes("409") ? "Ya existe una regla para ese keyword" : "Error al guardar."); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMut.mutateAsync(id); } catch {} finally { setDeleteId(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <BackRow onBack={onBack} />
      {error && <ErrorMsg>Error al cargar las reglas.</ErrorMsg>}
      {showNew && <InlineCatRuleForm form={form} categories={categories} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva regla" />}
      {isLoading ? <Skeleton count={3} /> : (
        <div className="flex flex-col gap-2">
          {rules.map(rule => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                <InlineCatRuleForm form={form} categories={categories} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar regla" />
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">{rule.keyword}</span>
                  <ArrowRight size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{rule.categoryName}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">p:{rule.priority}</span>
                  <EditDeleteBtns onEdit={() => startEdit(rule)} onDelete={() => setDeleteId(rule.id)} onDeleteConfirm={() => handleDelete(rule.id)} onDeleteCancel={() => setDeleteId(null)} isDeleting={deleteId === rule.id} isPending={deleteMut.isPending} />
                </div>
              )}
            </div>
          ))}
          {rules.length === 0 && !showNew && <EmptyMsg>No hay reglas de categorización.</EmptyMsg>}
        </div>
      )}
      <AddButton onClick={startNew} label="Agregar regla" />
    </div>
  );
}

function InlineCatRuleForm({ form, categories, onChange, onSave, onCancel, error, isSaving, title }: {
  form: CatRuleFormState; categories: { id: number; name: string }[]; onChange: (f: CatRuleFormState) => void; onSave: () => void; onCancel: () => void; error: string | null; isSaving: boolean; title: string;
}) {
  return (
    <div className="bg-background border border-border/60 rounded-2xl p-4 mb-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>
      <div className="flex gap-2 mb-2">
        <input type="text" value={form.keyword} onChange={e => onChange({ ...form, keyword: e.target.value.toLowerCase() })} placeholder="Keyword (ej: netflix)" className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
        <input type="number" value={form.priority} onChange={e => onChange({ ...form, priority: Math.max(1, parseInt(e.target.value) || 1) })} min={1} placeholder="P" title="Prioridad" className="w-14 h-10 px-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center" />
      </div>
      <select value={form.categoryId ?? ""} onChange={e => onChange({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })} className="w-full h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3">
        <option value="">Seleccioná una categoría</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      <SaveCancelRow onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  );
}

// ─── Logo Rules ───────────────────────────────────────────────────────────────

interface LogoRuleFormState { keyword: string; logoUrl: string; priority: number }
const emptyLogoRuleForm: LogoRuleFormState = { keyword: "", logoUrl: "", priority: 1 };

function LogoRulesView({ onBack }: { onBack: () => void }) {
  const { data: rules = [], isLoading, error } = useLogoRules();
  const createMut = useCreateLogoRule();
  const updateMut = useUpdateLogoRule();
  const deleteMut = useDeleteLogoRule();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LogoRuleFormState>(emptyLogoRuleForm);
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMut.isPending || updateMut.isPending;

  const startNew = () => { setForm(emptyLogoRuleForm); setFormError(null); setEditingId(null); setShowNew(true); };
  const startEdit = (r: LogoRuleDto) => { setForm({ keyword: r.keyword, logoUrl: r.logoUrl, priority: r.priority }); setFormError(null); setEditingId(r.id); setShowNew(false); };
  const cancelForm = () => { setShowNew(false); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.keyword.trim()) { setFormError("El keyword es requerido"); return; }
    if (!form.logoUrl.trim()) { setFormError("La URL del logo es requerida"); return; }
    setFormError(null);
    const payload = { keyword: form.keyword.trim().toLowerCase(), logoUrl: form.logoUrl.trim(), priority: form.priority };
    try {
      if (editingId !== null) await updateMut.mutateAsync({ id: editingId, data: payload });
      else await createMut.mutateAsync(payload);
      cancelForm();
    } catch { setFormError("Error al guardar. Intentá de nuevo."); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMut.mutateAsync(id); } catch {} finally { setDeleteId(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <BackRow onBack={onBack} />
      {error && <ErrorMsg>Error al cargar las reglas.</ErrorMsg>}
      {showNew && <InlineLogoRuleForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Nueva regla" />}
      {isLoading ? <Skeleton count={3} /> : (
        <div className="flex flex-col gap-2">
          {rules.map(rule => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                <InlineLogoRuleForm form={form} onChange={setForm} onSave={handleSave} onCancel={cancelForm} error={formError} isSaving={isSaving} title="Editar regla" />
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
                  <img src={rule.logoUrl} alt={rule.keyword} className="w-8 h-8 rounded-full object-contain flex-shrink-0 bg-background" />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">{rule.keyword}</span>
                  <ArrowRight size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{rule.logoUrl}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">p:{rule.priority}</span>
                  <EditDeleteBtns onEdit={() => startEdit(rule)} onDelete={() => setDeleteId(rule.id)} onDeleteConfirm={() => handleDelete(rule.id)} onDeleteCancel={() => setDeleteId(null)} isDeleting={deleteId === rule.id} isPending={deleteMut.isPending} />
                </div>
              )}
            </div>
          ))}
          {rules.length === 0 && !showNew && <EmptyMsg>No hay reglas de logos.</EmptyMsg>}
        </div>
      )}
      <AddButton onClick={startNew} label="Agregar regla" />
    </div>
  );
}

function InlineLogoRuleForm({ form, onChange, onSave, onCancel, error, isSaving, title }: {
  form: LogoRuleFormState; onChange: (f: LogoRuleFormState) => void; onSave: () => void; onCancel: () => void; error: string | null; isSaving: boolean; title: string;
}) {
  return (
    <div className="bg-background border border-border/60 rounded-2xl p-4 mb-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
          {form.logoUrl ? <img src={form.logoUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-xs text-muted-foreground">logo</span>}
        </div>
        <input type="text" value={form.logoUrl} onChange={e => onChange({ ...form, logoUrl: e.target.value })} placeholder="URL del logo *" className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="flex gap-2 mb-3">
        <input type="text" value={form.keyword} onChange={e => onChange({ ...form, keyword: e.target.value.toLowerCase() })} placeholder="Keyword (ej: netflix) *" className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
        <input type="number" value={form.priority} onChange={e => onChange({ ...form, priority: Math.max(1, parseInt(e.target.value) || 1) })} min={1} placeholder="P" title="Prioridad" className="w-14 h-10 px-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center" />
      </div>
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      <SaveCancelRow onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground mb-1 hover:text-foreground transition-colors w-fit">
      <ChevronLeft size={14} /> Volver
    </button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground">
      <Plus size={16} /> {label}
    </button>
  );
}

function SaveCancelRow({ onSave, onCancel, isSaving }: { onSave: () => void; onCancel: () => void; isSaving: boolean }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} className="flex-1 h-10 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
      <button type="button" onClick={onSave} disabled={isSaving} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {isSaving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function EditDeleteBtns({ onEdit, onDelete, onDeleteConfirm, onDeleteCancel, isDeleting, isPending }: {
  onEdit: () => void; onDelete: () => void; onDeleteConfirm: () => void; onDeleteCancel: () => void; isDeleting: boolean; isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {!isDeleting && (
        <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors">
          <Pencil size={13} className="text-muted-foreground" />
        </button>
      )}
      {isDeleting ? (
        <>
          <button onClick={onDeleteConfirm} disabled={isPending} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button onClick={onDeleteCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors">
            <X size={13} className="text-muted-foreground" />
          </button>
        </>
      ) : (
        <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
          <Trash2 size={13} className="text-muted-foreground hover:text-red-500" />
        </button>
      )}
    </div>
  );
}

function Skeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary animate-pulse">
          <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-1.5"><div className="h-3 bg-muted rounded w-1/3" /><div className="h-2.5 bg-muted rounded w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 text-sm">{children}</div>;
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground py-8">{children}</p>;
}

// ─── Sheet wrapper ────────────────────────────────────────────────────────────

export default function CardConfigSheet({ open, onClose }: Props) {
  const [view, setView] = useState<View>("main");

  const handleClose = () => { setView("main"); onClose(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-card animate-slide-up p-6 pb-10 max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">{headings[view]}</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {view === "main" && <MainView onNavigate={setView} />}
          {view === "cards" && <CardsView onBack={() => setView("main")} />}
          {view === "categories" && <CategoriesView onBack={() => setView("main")} />}
          {view === "categoryRules" && <CategoryRulesView onBack={() => setView("main")} />}
          {view === "logoRules" && <LogoRulesView onBack={() => setView("main")} />}
        </div>
      </div>
    </div>
  );
}
