import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ColorThemeProvider } from "@/contexts/ColorThemeContext";
import { NightSkyBackground } from "@/components/ui/NightSkyBackground";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ColorThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NightSkyBackground>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NightSkyBackground>
      </TooltipProvider>
    </ColorThemeProvider>
  </QueryClientProvider>
);

export default App;
