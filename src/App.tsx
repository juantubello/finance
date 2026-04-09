import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import type { FilterMode } from "@/components/DateFilter";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SideMenu from "@/components/SideMenu";
import SettingsSheet from "@/components/SettingsSheet";
import FloatingActionButton from "@/components/FloatingActionButton";
import ExpenseModal from "@/components/ExpenseModal";
import IngresoModal from "@/components/IngresoModal";
import AhorroModal from "@/components/AhorroModal";
import VoiceOverlay from "@/components/VoiceOverlay";
import VoiceExpenseQuickConfirm, { type VoiceExpenseDraft } from "@/components/VoiceExpenseQuickConfirm";
import Index from "./pages/Index";
import AddExpense from "./pages/AddExpense";
import Categories from "./pages/Categories";
import CategoryRules from "./pages/CategoryRules";
import Ingresos from "./pages/Ingresos";
import Ahorros from "./pages/Ahorros";
import Estadisticas from "./pages/Estadisticas";
import Tarjetas from "./pages/Tarjetas";
import NotFound from "./pages/NotFound";
import CardConfig from "./pages/CardConfig";
import CardCategories from "./pages/CardCategories";
import CardCategoryRules from "./pages/CardCategoryRules";
import LogoRules from "./pages/LogoRules";
import CardsList from "./pages/CardsList";
import type { GastoResponse, IngresoResponse, Label, SavingMovement } from "@/types/api";
import { parseMultipleItems, parseVoiceInput } from "@/lib/voiceParser";
import { getDeviceId, getAlias } from "@/lib/pushNotifications";
import { useCategories, useCategoryRules, useCurrencies, useLabelRules } from "@/hooks/useApi";
import { detectCategoryFromDescription, detectLabelsFromDescription } from "@/lib/categoryRules";

const queryClient = new QueryClient();

export type Theme = "light" | "dark";

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

const now = new Date();

function AppLayout() {
  const location = useLocation();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme | null) ?? "light";
  });

  // ── Shared date filter state ───────────────────────────────────────────────
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // ── Gasto modal ────────────────────────────────────────────────────────────
  const [gastoModalOpen, setGastoModalOpen] = useState(false);
  const [gastoModalKey, setGastoModalKey] = useState(0);
  const [editGasto, setEditGasto] = useState<GastoResponse | null>(null);
  const [initialData, setInitialData] = useState<{ description?: string; amount?: number } | null>(null);
  const [initialEntryType, setInitialEntryType] = useState<"gasto" | "ingreso" | "ahorro">("gasto");
  const [voiceAddOpen, setVoiceAddOpen] = useState(false);
  const [gastosSearchOpen, setGastosSearchOpen] = useState(false);
  const [ingresosSearchOpen, setIngresosSearchOpen] = useState(false);
  const [tarjetasSearchOpen, setTarjetasSearchOpen] = useState(false);
  const [ahorrosSearchOpen, setAhorrosSearchOpen] = useState(false);
  const [voiceExpenseDraft, setVoiceExpenseDraft] = useState<VoiceExpenseDraft | null>(null);

  // ── Ingreso / Ahorro modal (shared) ───────────────────────────────────────
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false);
  const [ingresoModalKey, setIngresoModalKey] = useState(0);
  const [editIngreso, setEditIngreso] = useState<IngresoResponse | null>(null);
  const [ingresoDefaultCategoryId, setIngresoDefaultCategoryId] = useState<number | undefined>(undefined);

  // ── Ahorro movement modal ──────────────────────────────────────────────────
  const [ahorroModalOpen, setAhorroModalOpen] = useState(false);
  const [ahorroModalKey, setAhorroModalKey] = useState(0);
  const [editMovimiento, setEditMovimiento] = useState<SavingMovement | null>(null);
  const { data: categories = [] } = useCategories();
  const { data: categoryRules = [] } = useCategoryRules();
  const { data: labelRules = [] } = useLabelRules();
  const { data: currencies = [] } = useCurrencies();

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    if (location.pathname !== "/") setGastosSearchOpen(false);
    if (location.pathname !== "/ingresos") setIngresosSearchOpen(false);
    if (location.pathname !== "/tarjetas") setTarjetasSearchOpen(false);
    if (location.pathname !== "/ahorros") setAhorrosSearchOpen(false);
  }, [location.pathname]);

  // Push notification re-registration alert
  // Show if alias was previously set but deviceId was cleared (e.g. cache wipe)
  const [showPushAlert, setShowPushAlert] = useState(() =>
    getAlias() !== null && getDeviceId() === null
  );

  // Gasto
  const openGastoAdd = () => { setEditGasto(null); setInitialData(null); setInitialEntryType("gasto"); setGastoModalKey(k => k + 1); setGastoModalOpen(true); };
  const openGastoEdit = (g: GastoResponse) => { setEditGasto(g); setInitialData(null); setInitialEntryType("gasto"); setGastoModalKey(k => k + 1); setGastoModalOpen(true); };
  const closeGasto = () => { setGastoModalOpen(false); setEditGasto(null); setInitialData(null); };

  // Ingreso (add → reuse ExpenseModal pre-selected as ingreso; edit → IngresoModal)
  const openIngresoAdd = () => { setEditGasto(null); setInitialData(null); setInitialEntryType("ingreso"); setGastoModalKey(k => k + 1); setGastoModalOpen(true); };
  const openIngresoEdit = (i: IngresoResponse) => { setEditIngreso(i); setIngresoDefaultCategoryId(undefined); setIngresoModalKey(k => k + 1); setIngresoModalOpen(true); };
  const closeIngreso = () => { setIngresoModalOpen(false); setEditIngreso(null); };

  // Ahorro
  const openAhorroAdd = () => { setEditMovimiento(null); setAhorroModalKey(k => k + 1); setAhorroModalOpen(true); };
  const openAhorroEdit = (m: SavingMovement) => { setEditMovimiento(m); setAhorroModalKey(k => k + 1); setAhorroModalOpen(true); };
  const closeAhorro = () => { setAhorroModalOpen(false); setEditMovimiento(null); };

  // Route-aware FAB
  const handleAdd = () => {
    if (location.pathname === "/ingresos") openIngresoAdd();
    else if (location.pathname === "/ahorros") openAhorroAdd();
    else openGastoAdd();
  };

  const handleVoiceAddConfirm = (transcript: string) => {
    setVoiceAddOpen(false);
    const multi = parseMultipleItems(transcript);
    setInitialEntryType("gasto");
    const parsed = multi
      ? { description: multi.description, amount: multi.totalAmount }
      : parseVoiceInput(transcript);
    const description = parsed.description || transcript;
    const amount = parsed.amount ?? undefined;
    const autoCategory = detectCategoryFromDescription(description, categoryRules);
    const autoLabels: Label[] = detectLabelsFromDescription(description, labelRules);
    const arsCurrency = currencies.find(c => c.symbol === "$" || c.name.toUpperCase().includes("ARS") || c.name.toLowerCase().includes("peso"));
    const matchedCategory = autoCategory ? categories.find(c => c.id === autoCategory.categoryId) : null;

    if (amount != null && autoCategory && arsCurrency && matchedCategory) {
      setVoiceExpenseDraft({
        description,
        amount,
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
        categoryIcon: matchedCategory.icon,
        categoryColor: matchedCategory.color,
        currencyId: arsCurrency.id,
        currencyCode: "ARS",
        currencySymbol: arsCurrency.symbol,
        labels: autoLabels,
      });
      return;
    }

    if (multi) {
      setInitialData({ description: multi.description, amount: multi.totalAmount });
    } else {
      setInitialData({ description, amount });
    }
    setEditGasto(null);
    setGastoModalKey(k => k + 1);
    setGastoModalOpen(true);
  };

  return (
    <>
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} onThemeChange={setTheme} />
      {showPushAlert && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium shadow-lg">
          <span>Las notificaciones no están configuradas en este dispositivo.</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setShowPushAlert(false); setSettingsOpen(true); }}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
            >
              Configurar
            </button>
            <button onClick={() => setShowPushAlert(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Index onEditGasto={openGastoEdit} onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} filterMode={filterMode} year={year} month={month} onFilterModeChange={setFilterMode} onDateChange={(y, m) => { setYear(y); setMonth(m); }} searchOpen={gastosSearchOpen} onSearchOpenChange={setGastosSearchOpen} />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/category-rules" element={<CategoryRules />} />
        <Route path="/ingresos" element={<Ingresos onEditIngreso={openIngresoEdit} onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} filterMode={filterMode} year={year} month={month} onFilterModeChange={setFilterMode} onDateChange={(y, m) => { setYear(y); setMonth(m); }} searchOpen={ingresosSearchOpen} onSearchOpenChange={setIngresosSearchOpen} />} />
        <Route path="/tarjetas" element={<Tarjetas onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} filterMode={filterMode} year={year} month={month} onFilterModeChange={setFilterMode} onDateChange={(y, m) => { setYear(y); setMonth(m); }} searchOpen={tarjetasSearchOpen} onSearchOpenChange={setTarjetasSearchOpen} />} />
        <Route path="/cards/config" element={<CardConfig />} />
        <Route path="/cards/config/categories" element={<CardCategories />} />
        <Route path="/cards/config/category-rules" element={<CardCategoryRules />} />
        <Route path="/cards/config/logo-rules" element={<LogoRules />} />
        <Route path="/cards/config/cards" element={<CardsList />} />
        <Route path="/ahorros" element={<Ahorros onEditMovimiento={openAhorroEdit} onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} searchOpen={ahorrosSearchOpen} onSearchOpenChange={setAhorrosSearchOpen} />} />
        <Route path="/estadisticas" element={<Estadisticas onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <VoiceOverlay open={voiceAddOpen} onCancel={() => setVoiceAddOpen(false)} onConfirm={handleVoiceAddConfirm} />
      <VoiceExpenseQuickConfirm
        draft={voiceExpenseDraft}
        onDismiss={() => setVoiceExpenseDraft(null)}
        onSaved={() => setVoiceExpenseDraft(null)}
        onEdit={(draft) => {
          setVoiceExpenseDraft(null);
          setEditGasto(null);
          setInitialEntryType("gasto");
          setInitialData({ description: draft.description, amount: draft.amount });
          setGastoModalKey(k => k + 1);
          setGastoModalOpen(true);
        }}
      />
      <FloatingActionButton
        onAdd={handleAdd}
        onVoice={() => setVoiceAddOpen(true)}
        showSearch={location.pathname === "/" || location.pathname === "/ingresos" || location.pathname === "/tarjetas" || location.pathname === "/ahorros"}
        searchActive={
          location.pathname === "/"
            ? gastosSearchOpen
            : location.pathname === "/ingresos"
            ? ingresosSearchOpen
            : location.pathname === "/tarjetas"
            ? tarjetasSearchOpen
            : location.pathname === "/ahorros"
            ? ahorrosSearchOpen
            : false
        }
        onSearchToggle={() => {
          if (location.pathname === "/") setGastosSearchOpen(v => !v);
          if (location.pathname === "/ingresos") setIngresosSearchOpen(v => !v);
          if (location.pathname === "/tarjetas") setTarjetasSearchOpen(v => !v);
          if (location.pathname === "/ahorros") setAhorrosSearchOpen(v => !v);
        }}
      />
      <ExpenseModal key={`gasto-${gastoModalKey}`} open={gastoModalOpen} onClose={closeGasto} gasto={editGasto} initialData={initialData} initialEntryType={initialEntryType} />
      <IngresoModal key={`ingreso-${ingresoModalKey}`} open={ingresoModalOpen} onClose={closeIngreso} ingreso={editIngreso} defaultCategoryId={ingresoDefaultCategoryId} />
      <AhorroModal key={`ahorro-${ahorroModalKey}`} open={ahorroModalOpen} onClose={closeAhorro} movimiento={editMovimiento} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
