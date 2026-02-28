import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { HomeTriageView } from "@/components/HomeTriageView";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { GoogleCalendarView } from "@/components/GoogleCalendarView";
import { SettingsPage } from "@/components/SettingsPage";
import { ScheduleSheet } from "@/components/ScheduleSheet";
import { Settings, Home, Calendar, Camera, Type, Mic, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfDay, addDays } from "date-fns";
import type { BrainCard, CardCategory, RoutedType } from "@/types/card";

type ViewId = "home" | "calendar" | "settings";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard } = useCards();
  const { events: calendarEvents, loading: calendarLoading, fetchEvents, createEvent } = useGoogleCalendar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showComposeMenu, setShowComposeMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
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

  const handleRoute = useCallback(async (id: string, routedType: RoutedType) => {
    const status = routedType === "ignore" ? "done" : "routed";
    await updateCard(id, { status, routedType } as any);
    toast.success(routedType === "ignore" ? "Dismissed" : `Routed as ${routedType}`);
  }, [updateCard]);

  const handleSchedule = useCallback((card: BrainCard) => {
    setScheduleCard(card);
  }, []);

  const navTabs: { id: ViewId; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: "Home" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div className="w-12" />
          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">ANREN</h1>
          <button
            onClick={() => setActiveView(activeView === "settings" ? "home" : "settings")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeView === "settings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {activeView === "home" ? (
        <HomeTriageView
          cards={cards}
          calendarEvents={calendarEvents}
          calendarLoading={calendarLoading}
          onCardClick={(card) => setSelectedCard(card)}
          onRoute={handleRoute}
          onSchedule={handleSchedule}
        />
      ) : activeView === "calendar" ? (
        <GoogleCalendarView />
      ) : (
        <SettingsPage />
      )}

      {/* ─── Bottom Nav ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-7 pt-3 pointer-events-none">
        <div className="flex items-end gap-2.5 pointer-events-auto w-full">
          <div
            className="flex items-center rounded-[22px] p-[5px]"
            style={{
              background: "hsl(var(--surface) / 0.55)",
              border: "1px solid hsl(var(--divider) / 0.25)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 hsl(var(--text) / 0.04)",
            }}
          >
            {navTabs.map(({ id, icon: TabIcon }) => {
              const isActive = activeView === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveView(id)}
                  className={cn(
                    "flex items-center justify-center w-[52px] h-[42px] rounded-[17px] transition-all duration-200",
                    isActive ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"
                  )}
                  style={isActive ? {
                    background: "hsl(var(--card-bg) / 0.7)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 hsl(var(--text) / 0.06)",
                  } : undefined}
                >
                  <TabIcon className="w-[20px] h-[20px]" />
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Compose button */}
          <div className="relative">
            <button
              onClick={() => setShowComposeMenu(!showComposeMenu)}
              className="flex items-center justify-center w-[52px] h-[52px] rounded-[22px] shrink-0 transition-transform hover:scale-105 active:scale-95"
              style={{
                background: "hsl(var(--surface) / 0.55)",
                border: "1px solid hsl(var(--divider) / 0.25)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 hsl(var(--text) / 0.04)",
              }}
            >
              <Plus className="w-[22px] h-[22px] text-foreground/80" />
            </button>

            {showComposeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowComposeMenu(false)} />
                <div
                  className="absolute bottom-14 right-0 z-50 rounded-xl py-2 min-w-[140px] shadow-lg"
                  style={{
                    background: "hsl(var(--card-bg) / 0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid hsl(var(--divider) / 0.3)",
                  }}
                >
                  {[
                    { action: () => { setShowPhotoPicker(true); setShowComposeMenu(false); }, icon: Camera, label: "Photo" },
                    {
                      action: async () => {
                        setShowComposeMenu(false);
                        const id = await addCard({ title: "", body: "" });
                        if (id) {
                          const newCard: BrainCard = {
                            id, title: "", summary: "", body: "",
                            category: "uncategorized" as CardCategory,
                            source: "text" as const,
                            status: "inbox",
                            routedType: null,
                            dueAt: null,
                            googleEventId: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          setSelectedCard(newCard);
                        }
                      },
                      icon: Type, label: "Type",
                    },
                    { action: () => { setShowVoiceRecorder(true); setShowComposeMenu(false); }, icon: Mic, label: "Voice" },
                  ].map(({ action, icon: MIcon, label }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-foreground/5 transition-colors"
                    >
                      <MIcon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={updateCard}
        onDelete={deleteCard}
      />

      <NewCardSheet
        open={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        onAdd={addCard}
        onUpdateCard={updateCard}
      />

      <ScheduleSheet
        card={scheduleCard}
        open={!!scheduleCard}
        onClose={() => setScheduleCard(null)}
        onCreateEvent={createEvent}
        onUpdateCard={updateCard}
      />

      <VoiceRecorder
        open={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onRecordingComplete={async (audioBase64, mimeType) => {
          setShowVoiceRecorder(false);
          const cardId = await addCard({ title: "", body: "@@PARSING@@", source: "voice" });
          if (!cardId) return;
          toast.info("Transcribing voice note...");
          const { data, error } = await supabase.functions.invoke("transcribe-voice", {
            body: { audioBase64, mimeType },
          });
          if (error || !data || data.error) {
            console.error("Transcribe error:", error || data?.error);
            toast.error("Couldn't transcribe — edit the note manually");
            updateCard(cardId, { body: "@@PARSE_FAILED@@" });
            return;
          }
          updateCard(cardId, {
            title: data.title || "",
            body: data.body || "",
            summary: data.summary || "",
            category: data.category || "uncategorized",
          });
          toast.success("Voice note processed!");
        }}
      />
    </div>
  );
};

export default Index;
