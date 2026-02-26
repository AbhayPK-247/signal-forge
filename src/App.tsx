import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ModulationLab from "./pages/ModulationLab";
import RealSignalLab from "./pages/RealSignalLab";
import NotFound from "./pages/NotFound";
import RecordingLab from "./pages/RecordingLab";
import FilterLab from "./pages/FilterLab";
import SpectrumLab from "./pages/SpectrumLab";
import CommunicationLab from "./pages/CommunicationLab";
import DatasetLab from "./pages/DatasetLab";
import SweepLab from "@/pages/SweepLab";
import BodeLab from "./pages/BodeLab";
import SystemLab from "./pages/SystemLab";
import VirtualLab from "./pages/VirtualLab";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/modulation" element={<ModulationLab />} />
          <Route path="/real-signal" element={<RealSignalLab />} />
          <Route path="/recording" element={<RecordingLab />} />
          <Route path="/filter" element={<FilterLab />} />
          <Route path="/spectrum" element={<SpectrumLab />} />
          <Route path="/communication" element={<CommunicationLab />} />
          <Route path="/dataset" element={<DatasetLab />} />
          <Route path="/sweep" element={<SweepLab />} />
          <Route path="/bode" element={<BodeLab />} />
          <Route path="/system" element={<SystemLab />} />
          <Route path="/virtual" element={<VirtualLab />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
