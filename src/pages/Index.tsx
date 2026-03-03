import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { HomeView } from "@/components/HomeView";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { BrainDumpSheet } from "@/components/BrainDumpSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { ScheduleSheet } from "@/components/ScheduleSheet";
import { SettingsPage } from "@/components/SettingsPage";
import { DailyBriefOverlay } from "@/components/DailyBriefOverlay";
import { Settings, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfDay, addDays } from "date-fns";
import type { BrainCard, ItemType } from "@/types/card";

const Index = () => {
  const { cards, addCard, addItems, updateCard, deleteCard } = useCards();
  const { events: calendarEvents, loading: calendarLoading, fetchEvents, createEvent } = useGoogleCalendar();
  const { shouldShow: showBrief, dismiss: dismissBrief } = useDailyBrief();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scheduleCard, setScheduleCard] = useState<BrainCard | null>(null);

  // Fetch calendar events for today + 7 days
  useEffect(() => {
    const now = startOfDay(new Date());
    const end = addDays(now, 8);
    fetchEvents(now.toISOString(), end.toISOString());
  }, [fetchEvents]);

  // Handle deep link
  useEffect(() => {
    const openCardId = searchParams.get("openCard");
    if (openCardId && cards.length > 0) {
      const found = cards.find((c) => c.id === openCardId);
      if (found) setSelectedCard(found);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, cards, setSearchParams]);

  const handleComplete = useCallback(async (id: string) => {
    await updateCard(id, { status: "complete" });
  }, [updateCard]);

  const handleSchedule = useCallback((card: BrainCard) => {
    setScheduleCard(card);
  }, []);

  const handleBrainDumpConfirm = useCallback(async (items: Array<{ title: string; type: ItemType; due_at?: string | null }>) => {
    await addItems(items.map((i) => ({ title: i.title, type: i.type, dueAt: i.due_at })));
  }, [addItems]);

  if (showSettings) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 px-5 pt-12 pb-2">
          <div className="flex items-center justify-between">
            <div className="w-12" />
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
    <div className="min-h-screen pb-24">
      {/* Daily Brief Overlay */}
      {showBrief && (
        <DailyBriefOverlay
          cards={cards}
          calendarEvents={calendarEvents}
          onDismiss={dismissBrief}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-40 px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div className="w-12" />
          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">ANREN</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Home */}
      <HomeView
        cards={cards}
        calendarEvents={calendarEvents}
        calendarLoading={calendarLoading}
        onCardClick={(card) => setSelectedCard(card)}
        onComplete={handleComplete}
        onSchedule={handleSchedule}
      />

      {/* ── Bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-8 pt-4 pointer-events-none">
        <div className="flex gap-3 pointer-events-auto">
          <button
            onClick={() => setShowCamera(true)}
            className="py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] shrink-0"
            style={{
              background: "hsl(var(--surface) / 0.7)",
              border: "1px solid hsl(var(--divider) / 0.25)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              color: "hsl(var(--text))",
            }}
            title="Capture screenshot"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowBrainDump(true)}
            className="flex-1 py-3.5 rounded-xl text-button font-medium transition-all active:scale-[0.98]"
            style={{
              background: "hsl(var(--surface) / 0.7)",
              border: "1px solid hsl(var(--divider) / 0.25)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              color: "hsl(var(--text))",
            }}
          >
            Empty your head
          </button>
        </div>
      </div>

      {/* Sheets */}
      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={updateCard}
        onDelete={deleteCard}
      />

      <ScheduleSheet
        card={scheduleCard}
        open={!!scheduleCard}
        onClose={() => setScheduleCard(null)}
        onCreateEvent={createEvent}
        onUpdateCard={updateCard}
      />

      <NewCardSheet
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onAdd={addCard}
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
