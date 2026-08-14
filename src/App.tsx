import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { useAuth } from "@/hooks/useAuth";
import { RecorderProvider } from "@/contexts/RecorderContext";
import { AppShell } from "@/components/AppShell";
import Index from "./pages/Index";
import Home from "./pages/Home";
import VoiceCapture from "./pages/VoiceCapture";
import WriteCapture from "./pages/WriteCapture";

import NoteDetail from "./pages/NoteDetail";
import SearchPage from "./pages/SearchPage";
import Reflect from "./pages/Reflect";
import Threads from "./pages/Threads";
import Settings from "./pages/Settings";
import ClaudeKey from "./pages/ClaudeKey";
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

const App = () => {
  const { loading } = useAuth();

  // Set the status bar style once on native platforms — the app is light-themed only today.
  useEffect(() => {
    if (Capacitor.getPlatform() !== "ios") return;
    void StatusBar.setStyle({ style: Style.Light });
  }, []);

  // Hide the launch splash once the initial auth check resolves, regardless of which
  // route renders first (protected shell or /auth) — SplashScreen.launchAutoHide is off
  // in capacitor.config.ts so this is the only thing that dismisses it.
  useEffect(() => {
    if (!loading && Capacitor.isNativePlatform()) void SplashScreen.hide();
  }, [loading]);

  return (
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


          <Route path="/" element={<ProtectedShell><Threads /></ProtectedShell>} />
          <Route path="/capture" element={<ProtectedShell><Home /></ProtectedShell>} />
          <Route path="/capture/voice" element={<ProtectedShell><VoiceCapture /></ProtectedShell>} />
          <Route path="/capture/write" element={<ProtectedShell><WriteCapture /></ProtectedShell>} />
          <Route path="/notes" element={<ProtectedShell><Index /></ProtectedShell>} />
          <Route path="/folder/:projectId" element={<ProtectedShell><Index /></ProtectedShell>} />
          
          <Route path="/note/:noteId" element={<ProtectedShell><NoteDetail /></ProtectedShell>} />
          <Route path="/search" element={<ProtectedShell><SearchPage /></ProtectedShell>} />
          <Route path="/threads" element={<Navigate to="/" replace />} />
          <Route path="/reflect" element={<ProtectedShell><Reflect /></ProtectedShell>} />
          <Route path="/on-my-mind" element={<Navigate to="/reflect" replace />} />
          <Route path="/settings" element={<ProtectedShell><Settings /></ProtectedShell>} />
          <Route path="/settings/claude" element={<ProtectedShell><ClaudeKey /></ProtectedShell>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
