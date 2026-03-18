import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SideMenu from "@/components/SideMenu";
import SettingsSheet from "@/components/SettingsSheet";
import FloatingActionButton from "@/components/FloatingActionButton";
import ExpenseModal from "@/components/ExpenseModal";
import Index from "./pages/Index";
import AddExpense from "./pages/AddExpense";
import Categories from "./pages/Categories";
import Ahorros from "./pages/Ahorros";
import Estadisticas from "./pages/Estadisticas";
import NotFound from "./pages/NotFound";
import type { GastoResponse } from "@/types/api";

const queryClient = new QueryClient();

function AppLayout() {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGasto, setEditGasto] = useState<GastoResponse | null>(null);

  const openAdd = () => { setEditGasto(null); setModalOpen(true); };
  const openEdit = (g: GastoResponse) => { setEditGasto(g); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditGasto(null); };
  const openMenu = () => setSideMenuOpen(true);
  const openSettings = () => setSettingsOpen(true);

  return (
    <>
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Routes>
        <Route path="/" element={<Index onEditGasto={openEdit} onMenu={openMenu} onSettings={openSettings} />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/ahorros" element={<Ahorros onMenu={openMenu} onSettings={openSettings} />} />
        <Route path="/estadisticas" element={<Estadisticas onMenu={openMenu} onSettings={openSettings} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FloatingActionButton onClick={openAdd} />
      <ExpenseModal open={modalOpen} onClose={closeModal} gasto={editGasto} />
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
