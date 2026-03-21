import { useState, useEffect } from "react";
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
import type { GastoResponse, IngresoResponse, SavingMovement } from "@/types/api";
import { parseMultipleItems, parseVoiceInput } from "@/lib/voiceParser";

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
  const [voiceAddOpen, setVoiceAddOpen] = useState(false);

  // ── Ingreso / Ahorro modal (shared) ───────────────────────────────────────
  const [ingresoModalOpen, setIngresoModalOpen] = useState(false);
  const [ingresoModalKey, setIngresoModalKey] = useState(0);
  const [editIngreso, setEditIngreso] = useState<IngresoResponse | null>(null);
  const [ingresoDefaultCategoryId, setIngresoDefaultCategoryId] = useState<number | undefined>(undefined);

  // ── Ahorro movement modal ──────────────────────────────────────────────────
  const [ahorroModalOpen, setAhorroModalOpen] = useState(false);
  const [ahorroModalKey, setAhorroModalKey] = useState(0);
  const [editMovimiento, setEditMovimiento] = useState<SavingMovement | null>(null);

  useEffect(() => { applyTheme(theme); }, [theme]);

  // Gasto
  const openGastoAdd = () => { setEditGasto(null); setInitialData(null); setGastoModalKey(k => k + 1); setGastoModalOpen(true); };
  const openGastoEdit = (g: GastoResponse) => { setEditGasto(g); setInitialData(null); setGastoModalKey(k => k + 1); setGastoModalOpen(true); };
  const closeGasto = () => { setGastoModalOpen(false); setEditGasto(null); setInitialData(null); };

  // Ingreso
  const openIngresoAdd = () => { setEditIngreso(null); setIngresoDefaultCategoryId(11); setIngresoModalKey(k => k + 1); setIngresoModalOpen(true); };
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
    if (multi) {
      setInitialData({ description: multi.description, amount: multi.totalAmount });
    } else {
      const parsed = parseVoiceInput(transcript);
      setInitialData({ description: parsed.description || transcript, amount: parsed.amount ?? undefined });
    }
    setEditGasto(null);
    setGastoModalKey(k => k + 1);
    setGastoModalOpen(true);
  };

  return (
    <>
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} onThemeChange={setTheme} />
      <Routes>
        <Route path="/" element={<Index onEditGasto={openGastoEdit} onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} filterMode={filterMode} year={year} month={month} onFilterModeChange={setFilterMode} onDateChange={(y, m) => { setYear(y); setMonth(m); }} />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/category-rules" element={<CategoryRules />} />
        <Route path="/ingresos" element={<Ingresos onEditIngreso={openIngresoEdit} onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} filterMode={filterMode} year={year} month={month} onFilterModeChange={setFilterMode} onDateChange={(y, m) => { setYear(y); setMonth(m); }} />} />
        <Route path="/tarjetas" element={<Tarjetas onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} filterMode={filterMode} year={year} month={month} onFilterModeChange={setFilterMode} onDateChange={(y, m) => { setYear(y); setMonth(m); }} />} />
        <Route path="/cards/config" element={<CardConfig />} />
        <Route path="/cards/config/categories" element={<CardCategories />} />
        <Route path="/cards/config/category-rules" element={<CardCategoryRules />} />
        <Route path="/cards/config/logo-rules" element={<LogoRules />} />
        <Route path="/cards/config/cards" element={<CardsList />} />
        <Route path="/ahorros" element={<Ahorros onEditMovimiento={openAhorroEdit} onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} />} />
        <Route path="/estadisticas" element={<Estadisticas onMenu={() => setSideMenuOpen(true)} onSettings={() => setSettingsOpen(true)} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <VoiceOverlay open={voiceAddOpen} onCancel={() => setVoiceAddOpen(false)} onConfirm={handleVoiceAddConfirm} />
      <FloatingActionButton onAdd={handleAdd} onVoice={() => setVoiceAddOpen(true)} />
      <ExpenseModal key={`gasto-${gastoModalKey}`} open={gastoModalOpen} onClose={closeGasto} gasto={editGasto} initialData={initialData} />
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
