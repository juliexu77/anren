import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RecorderProvider } from "@/contexts/RecorderContext";
import { AppShell } from "@/components/AppShell";
import Index from "./pages/Index";

import NoteDetail from "./pages/NoteDetail";
import SearchPage from "./pages/SearchPage";
import OnMyMind from "./pages/OnMyMind";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import LovableOAuthCallback from "./pages/LovableOAuthCallback";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import DeleteAccount from "./pages/DeleteAccount";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <RecorderProvider>
      <AppShell>{children}</AppShell>
    </RecorderProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/~oauth/callback" element={<LovableOAuthCallback />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/support" element={<Support />} />
          <Route path="/delete-account" element={<ProtectedShell><DeleteAccount /></ProtectedShell>} />


          <Route path="/" element={<ProtectedShell><Index /></ProtectedShell>} />
          <Route path="/folder/:projectId" element={<ProtectedShell><Index /></ProtectedShell>} />
          
          <Route path="/note/:noteId" element={<ProtectedShell><NoteDetail /></ProtectedShell>} />
          <Route path="/search" element={<ProtectedShell><SearchPage /></ProtectedShell>} />
          <Route path="/on-my-mind" element={<ProtectedShell><OnMyMind /></ProtectedShell>} />
          <Route path="/settings" element={<ProtectedShell><Settings /></ProtectedShell>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
