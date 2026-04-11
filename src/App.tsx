import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ColorThemeProvider } from "@/contexts/ColorThemeContext";
import { NightSkyBackground } from "@/components/ui/NightSkyBackground";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import LovableOAuthCallback from "./pages/LovableOAuthCallback";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import CardDeepLink from "./pages/CardDeepLink";
import ExtensionAuthStart from "./pages/ExtensionAuthStart";
import ExtensionAuthComplete from "./pages/ExtensionAuthComplete";
import InviteJoin from "./pages/InviteJoin";
import Patterns from "./pages/Patterns";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ColorThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NightSkyBackground>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/extension-auth" element={<ExtensionAuthStart />} />
              <Route path="/extension-auth-complete" element={<ExtensionAuthComplete />} />
              <Route path="/invite/:token" element={<InviteJoin />} />
              <Route path="/~oauth/callback" element={<LovableOAuthCallback />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/card/:cardId" element={<ProtectedRoute><CardDeepLink /></ProtectedRoute>} />
              <Route path="/patterns" element={<ProtectedRoute><Patterns /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </NightSkyBackground>
      </TooltipProvider>
    </ColorThemeProvider>
  </QueryClientProvider>
);

export default App;
