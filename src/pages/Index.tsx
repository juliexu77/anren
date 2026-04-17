import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useDailyPlan } from "@/hooks/useDailyPlan";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useHousehold } from "@/hooks/useHousehold";

import { HomeView } from "@/components/HomeView";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { BrainDumpSheet } from "@/components/BrainDumpSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { SettingsPage } from "@/components/SettingsPage";
import { DailyBriefOverlay } from "@/components/DailyBriefOverlay";
import { WeeklyReview } from "@/components/WeeklyReview";
import { EnergyView } from "@/components/EnergyView";

import { Settings, X, Users, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BrainCard, ItemType } from "@/types/card";

type Tab = "home" | "mind" | "energy";

const Index = () => {
  const navigate = useNavigate();
  const household = useHousehold();
  const { cards, loading: cardsLoading, addCard, addItems, updateCard, deleteCard } = useCards(household.isViewer ? household.ownerId : null);
  const { shouldShow: showBrief, dismiss: dismissBrief } = useDailyBrief();

  const { plan: dailyPlan, loading: dailyPlanLoading, regenerate: regeneratePlan } = useDailyPlan(!cardsLoading);
  usePushNotifications();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "mind" || t === "energy" ? t : "home";
  });
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  const [reorderMessage, setReorderMessage] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);

  // Handle deep link
  useEffect(() => {
    const openCardId = searchParams.get("openCard");
    const tabParam = searchParams.get("tab");
    if (tabParam === "mind" || tabParam === "energy" || tabParam === "home") {
      setActiveTab(tabParam as Tab);
    }
    if (openCardId && cards.length > 0) {
      const found = cards.find((c) => c.id === openCardId);
      if (found) {
        setSelectedCard(found);
        setActiveTab("mind");
      }
      setSearchParams({}, { replace: true });
    } else if (tabParam) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, cards, setSearchParams]);

  const handleComplete = useCallback(async (id: string) => {
    await updateCard(id, { status: "complete" });
  }, [updateCard]);

  const handleBrainDumpConfirm = useCallback(async (items: Array<{ title: string; type: ItemType; due_at?: string | null }>) => {
    await addItems(items.map((i) => ({ title: i.title, type: i.type, dueAt: i.due_at })));
    regeneratePlan();
  }, [addItems, regeneratePlan]);

  const handleReorder = useCallback(async () => {
    const active = cards.filter((c) => c.status === "active" && c.body !== "@@PARSING@@" && c.body !== "@@PARSE_FAILED@@");
    if (active.length < 2) return;
    setReordering(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-reorder", {
        body: { cards: active.map((c) => ({ id: c.id, title: c.title, body: c.body, type: c.type, dueAt: c.dueAt, createdAt: c.createdAt })) },
      });
      if (error || !data?.items) {
        toast.error("Couldn't organize right now. Try again in a moment.");
        return;
      }
      const reordered = data.items.map((item: { index: number; suggestion: string }) => active[item.index]).filter(Boolean);
      const newSuggestions: Record<string, string> = {};
      data.items.forEach((item: { index: number; suggestion: string }) => {
        const card = active[item.index];
        if (card) newSuggestions[card.id] = item.suggestion;
      });
      setSuggestions((prev) => ({ ...prev, ...newSuggestions }));

      const now = Date.now();
      const updates = reordered.map((card: BrainCard, i: number) => {
        const ts = new Date(now - i * 1000).toISOString();
        return supabase.from("cards").update({ created_at: ts }).eq("id", card.id);
      });
      await Promise.all(updates);
      setReorderMessage("I've organized your list. Tap one to see how we can move it forward.");
      regeneratePlan();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setReordering(false);
    }
  }, [cards]);

  const handleResearch = useCallback(async (cardId: string, title: string, body: string, type: string | null) => {
    setResearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-next-step", {
        body: { title, body, type },
      });
      if (error || !data || data.error) {
        toast.error(data?.error || "Couldn't get a suggestion right now. Try again.");
        return;
      }
      setSuggestions((prev) => ({ ...prev, [cardId]: data.suggestion }));
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setResearching(false);
    }
  }, []);

  if (showSettings) {
    return (
      <div className="min-h-screen max-w-5xl mx-auto">
        <header className="sticky top-0 z-40 px-5 pt-16 pb-2">
          <div className="flex items-center justify-between">
          <div className="w-10" />
            <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">ANREN</h1>
            <button onClick={() => setShowSettings(false)} className="p-2">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>
        <SettingsPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto">
      {/* Daily Brief Overlay */}
      {showBrief && (
        <DailyBriefOverlay
          onDismiss={dismissBrief}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-40 px-5 pt-16 pb-2">
        <div className="flex items-center justify-between">
          <div className="w-[120px]" />
          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">ANREN</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/address-book")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Address book"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/connections")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Integrations"
            >
              <Plug className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="pb-24">
        {activeTab === "home" && (
          <WeeklyReview cards={cards} cardsLoading={cardsLoading} />
        )}

        {activeTab === "mind" && (
          <div className="max-w-xl mx-auto">
            <HomeView
              cards={cards}
              cardsLoading={cardsLoading}
              onCardClick={(card) => setSelectedCard(card)}
              onComplete={handleComplete}
              onOpenCamera={() => setShowCamera(true)}
              onOpenBrainDump={() => setShowBrainDump(true)}
              onReorder={() => { setReorderMessage(null); handleReorder(); }}
              reordering={reordering}
              reorderMessage={reorderMessage}
              readOnly={household.isViewer}
              viewerBanner={household.isViewer ? `Viewing ${household.ownerName || "your partner"}'s list` : null}
              dailyPlan={dailyPlan}
              dailyPlanLoading={dailyPlanLoading}
            />
          </div>
        )}

        {activeTab === "energy" && <EnergyView />}
      </div>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-background/85 backdrop-blur-md border-t border-divider-color"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-3">
          {(["home", "mind", "energy"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative py-4 text-label uppercase tracking-[0.2em] transition-colors"
              >
                <span className={isActive ? "text-foreground" : "text-text-muted-color"}>
                  {tab}
                </span>
                {isActive && (
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-2 w-6 h-px bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sheets */}
      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={updateCard}
        onDelete={deleteCard}
        onComplete={handleComplete}
        suggestion={selectedCard ? suggestions[selectedCard.id] : undefined}
        onResearch={handleResearch}
        researching={researching}
      />

      <NewCardSheet
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onAdd={async (...args) => { const result = await addCard(...args); regeneratePlan(); return result; }}
        onUpdateCard={(id, updates) => updateCard(id, updates)}
      />

      <BrainDumpSheet
        open={showBrainDump}
        onClose={() => setShowBrainDump(false)}
        onConfirm={handleBrainDumpConfirm}
      />
    </div>
  );
};

export default Index;
