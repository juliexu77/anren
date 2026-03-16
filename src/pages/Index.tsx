import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { useGoogleCalendar, type CalendarEvent } from "@/hooks/useGoogleCalendar";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useHousehold } from "@/hooks/useHousehold";
import { useWeeklySynthesis } from "@/hooks/useWeeklySynthesis";
import { HomeView } from "@/components/HomeView";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { BrainDumpSheet } from "@/components/BrainDumpSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { ScheduleSheet } from "@/components/ScheduleSheet";
import { SettingsPage } from "@/components/SettingsPage";
import { DailyBriefOverlay } from "@/components/DailyBriefOverlay";
import { WeeklySynthesisOverlay } from "@/components/WeeklySynthesisOverlay";
import { CalendarEventSheet } from "@/components/CalendarEventSheet";
import { CalendarAgendaSheet } from "@/components/CalendarAgendaSheet";
import { Settings, X, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfDay, addDays } from "date-fns";
import { DesktopCalendarPanel } from "@/components/DesktopCalendarPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BrainCard, ItemType } from "@/types/card";

const Index = () => {
  const household = useHousehold();
  const { cards, loading: cardsLoading, addCard, addItems, updateCard, deleteCard } = useCards(household.isViewer ? household.ownerId : null);
  const { events: calendarEvents, loading: calendarLoading, fetchEvents, createEvent, deleteEvent } = useGoogleCalendar();
  const { shouldShow: showBrief, dismiss: dismissBrief } = useDailyBrief();
  usePushNotifications();
  const { synthesis: weeklySynthesis, dismiss: dismissWeekly } = useWeeklySynthesis();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scheduleCard, setScheduleCard] = useState<BrainCard | null>(null);
  const [selectedCalEvent, setSelectedCalEvent] = useState<CalendarEvent | null>(null);
  const [showAgenda, setShowAgenda] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);

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
      // Build new order based on AI response
      const reordered = data.items.map((item: { index: number; suggestion: string }) => active[item.index]).filter(Boolean);
      const newSuggestions: Record<string, string> = {};
      data.items.forEach((item: { index: number; suggestion: string }) => {
        const card = active[item.index];
        if (card) newSuggestions[card.id] = item.suggestion;
      });
      setSuggestions((prev) => ({ ...prev, ...newSuggestions }));

      // Update created_at in DB to reflect new order (newest first = first item gets latest timestamp)
      const now = Date.now();
      const updates = reordered.map((card: BrainCard, i: number) => {
        const ts = new Date(now - i * 1000).toISOString();
        return supabase.from("cards").update({ created_at: ts }).eq("id", card.id);
      });
      await Promise.all(updates);
      setReorderMessage("I've organized your list. Tap one to see how we can move it forward.");
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
    <div className="min-h-screen max-w-5xl mx-auto">
      {/* Weekly Synthesis Overlay (shown before daily brief) */}
      {weeklySynthesis && !showBrief && (
        <WeeklySynthesisOverlay
          synthesis={weeklySynthesis}
          onDismiss={dismissWeekly}
        />
      )}
      {/* Daily Brief Overlay */}
      {showBrief && (
        <DailyBriefOverlay
          cards={cards}
          calendarEvents={calendarEvents}
          onDismiss={dismissBrief}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-40 px-5 pt-16 pb-2">
        <div className="flex items-center justify-between">
          <div className="w-12" />
          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">ANREN</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAgenda(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            >
              <CalendarDays className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Two-panel layout: main + calendar sidebar on lg+ */}
      <div className="flex gap-0 lg:gap-6 lg:px-4">
        {/* Main column */}
        <div className="flex-1 min-w-0 max-w-xl mx-auto lg:mx-0 lg:max-w-none lg:flex-[3]">
          <HomeView
            cards={cards}
            cardsLoading={cardsLoading}
            calendarEvents={calendarEvents}
            calendarLoading={calendarLoading}
            onCardClick={(card) => setSelectedCard(card)}
            onCalendarEventClick={(event) => setSelectedCalEvent(event)}
            onViewCalendar={() => setShowAgenda(true)}
            onComplete={handleComplete}
            
            onOpenCamera={() => setShowCamera(true)}
            onOpenBrainDump={() => setShowBrainDump(true)}
            onReorder={() => { setReorderMessage(null); handleReorder(); }}
            reordering={reordering}
            reorderMessage={reorderMessage}
            readOnly={household.isViewer}
            viewerBanner={household.isViewer ? `Viewing ${household.ownerName || "your partner"}'s list` : null}
          />
        </div>

        {/* Calendar sidebar — visible on lg+ */}
        <aside className="hidden lg:block lg:flex-[2] sticky top-[88px] h-[calc(100vh-88px)] sanctuary-card overflow-hidden">
          <DesktopCalendarPanel
            events={calendarEvents}
            onEventClick={(event) => setSelectedCalEvent(event)}
          />
        </aside>
      </div>

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

      <CalendarEventSheet
        event={selectedCalEvent}
        open={!!selectedCalEvent}
        onClose={() => setSelectedCalEvent(null)}
        onDelete={async (id) => {
          await deleteEvent(id);
          setSelectedCalEvent(null);
        }}
      />

      <CalendarAgendaSheet
        events={calendarEvents}
        open={showAgenda}
        onClose={() => setShowAgenda(false)}
        onEventClick={(event) => { setShowAgenda(false); setSelectedCalEvent(event); }}
      />
    </div>
  );
};

export default Index;
