import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SideMenu from "@/components/SideMenu";
import SettingsSheet from "@/components/SettingsSheet";
import FloatingActionButton from "@/components/FloatingActionButton";
import ExpenseModal from "@/components/ExpenseModal";
import VoiceOverlay from "@/components/VoiceOverlay";
import Index from "./pages/Index";
import AddExpense from "./pages/AddExpense";
import Categories from "./pages/Categories";
import Ahorros from "./pages/Ahorros";
import Estadisticas from "./pages/Estadisticas";
import NotFound from "./pages/NotFound";
import type { GastoResponse } from "@/types/api";
import { parseMultipleItems, parseVoiceInput } from "@/lib/voiceParser";

const queryClient = new QueryClient();

export type Theme = "light" | "dark";

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function AppLayout() {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [editGasto, setEditGasto] = useState<GastoResponse | null>(null);
  const [initialData, setInitialData] = useState<{ description?: string; amount?: number } | null>(null);
  const [voiceAddOpen, setVoiceAddOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme | null) ?? "light";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const openAdd = () => { setEditGasto(null); setInitialData(null); setModalKey(k => k + 1); setModalOpen(true); };
  const openEdit = (g: GastoResponse) => { setEditGasto(g); setInitialData(null); setModalKey(k => k + 1); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditGasto(null); setInitialData(null); };
  const openMenu = () => setSideMenuOpen(true);
  const openSettings = () => setSettingsOpen(true);

  const handleVoiceAddConfirm = (transcript: string) => {
    setVoiceAddOpen(false);
    const multi = parseMultipleItems(transcript);
    if (multi) {
      setInitialData({ description: multi.description, amount: multi.totalAmount });
    } else {
      const parsed = parseVoiceInput(transcript);
      setInitialData({
        description: parsed.description || transcript,
        amount: parsed.amount ?? undefined,
      });
    }
    setEditGasto(null);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };

  return (
    <>
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} onThemeChange={setTheme} />
      <Routes>
        <Route path="/" element={<Index onEditGasto={openEdit} onMenu={openMenu} onSettings={openSettings} />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/ahorros" element={<Ahorros onMenu={openMenu} onSettings={openSettings} />} />
        <Route path="/estadisticas" element={<Estadisticas onMenu={openMenu} onSettings={openSettings} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <VoiceOverlay
        open={voiceAddOpen}
        onCancel={() => setVoiceAddOpen(false)}
        onConfirm={handleVoiceAddConfirm}
      />
      <FloatingActionButton onAdd={openAdd} onVoice={() => setVoiceAddOpen(true)} />
      <ExpenseModal key={modalKey} open={modalOpen} onClose={closeModal} gasto={editGasto} initialData={initialData} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
