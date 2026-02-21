import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { BrainCardComponent } from "@/components/BrainCard";
import { GroupedCard } from "@/components/GroupedCard";
import { CATEGORY_CONFIG } from "@/types/card";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { GoogleCalendarView } from "@/components/GoogleCalendarView";
import { SettingsPage } from "@/components/SettingsPage";
import { HubView } from "@/components/HubView";
import { PeopleView } from "@/components/PeopleView";
import { usePeople } from "@/hooks/usePeople";
import { Settings, Search, Home, Users, Calendar, Camera, Type, Mic, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BrainCard, CardCategory } from "@/types/card";

type ViewId = "hub" | "home" | "people" | "calendar" | "settings";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard, groupCards, ungroupCards } = useCards();
  const { people } = usePeople();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState<ViewId>("hub");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showComposeMenu, setShowComposeMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Handle deep link
  useEffect(() => {
    const openCardId = searchParams.get("openCard");
    if (openCardId && cards.length > 0) {
      const found = cards.find((c) => c.id === openCardId);
      if (found) {
        setSelectedCard(found);
        setActiveView("home");
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, cards, setSearchParams]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  const cardsByCategory = useMemo(() => {
    const map: Partial<Record<CardCategory, BrainCard[]>> = {};
    filtered.forEach((card) => {
      if (!card.groupId) {
        if (!map[card.category]) map[card.category] = [];
        map[card.category]!.push(card);
      }
    });
    return map;
  }, [filtered]);

  const { groups } = useMemo(() => {
    const groupMap: Record<string, BrainCard[]> = {};
    filtered.forEach((card) => {
      if (card.groupId) {
        if (!groupMap[card.groupId]) groupMap[card.groupId] = [];
        groupMap[card.groupId].push(card);
      }
    });
    return { groups: groupMap };
  }, [filtered]);

  // Surface data for hub cards
  const firstPendingTitle = cards.find((c) => c.title && c.body !== "@@PARSING@@")?.title || "";
  const peopleNames = people.map((p) => p.name);

  const navTabs: { id: ViewId; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: "Home" },
    { id: "people", icon: Users, label: "People" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
  ];

  // Map nav tab clicks — if on hub or settings, go to that tab's view
  const handleNavTab = (id: ViewId) => {
    if (id === "home" && activeView === "home") {
      setActiveView("hub");
    } else {
      setActiveView(id);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          {/* Left: back text for sub-views */}
          {activeView !== "hub" ? (
            <button
              onClick={() => setActiveView("hub")}
              style={{
                fontSize: "13px",
                fontWeight: 400,
                color: "hsl(var(--text) / 0.5)",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              ← Back
            </button>
          ) : (
            <div className="w-12" />
          )}

          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">
            ANREN
          </h1>

          <button
            onClick={() => setActiveView(activeView === "settings" ? "hub" : "settings")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeView === "settings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar for home/notes view */}
        {activeView === "home" && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
            />
          </div>
        )}
      </header>

      {activeView === "hub" ? (
        <HubView
          onNavigate={(v) => setActiveView(v === "notes" ? "home" : v)}
          cardCount={cards.length}
          firstPendingTitle={firstPendingTitle}
          peopleNames={peopleNames}
        />
      ) : activeView === "home" ? (
        <main className="px-4">
          {/* Cards grouped by category */}
          <div className="space-y-5 mb-4">
            {(Object.keys(CATEGORY_CONFIG) as CardCategory[]).map((catKey) => {
              const catCards = cardsByCategory[catKey];
              if (!catCards || catCards.length === 0) return null;
              const cat = CATEGORY_CONFIG[catKey];
              return (
                <div key={catKey}>
                  <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {cat.label}
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {catCards.map((card, i) => (
                      <BrainCardComponent
                        key={card.id}
                        card={card}
                        index={i}
                        onClick={() => setSelectedCard(card)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(groups).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Grouped
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(groups).map(([groupId, groupCards]) => (
                  <GroupedCard
                    key={groupId}
                    cards={groupCards}
                    onClick={(card) => setSelectedCard(card)}
                    onUngroup={ungroupCards}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      ) : activeView === "people" ? (
        <PeopleView />
      ) : activeView === "calendar" ? (
        <GoogleCalendarView />
      ) : (
        <SettingsPage />
      )}

      {/* ─── Bottom Nav — split pill style ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-7 pt-3 pointer-events-none">
        <div className="flex items-end gap-2.5 pointer-events-auto">
          {/* Left pill: nav tabs */}
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
              const isActive = activeView === id || (id === "home" && activeView === "hub");
              return (
                <button
                  key={id}
                  onClick={() => handleNavTab(id)}
                  className={cn(
                    "flex items-center justify-center w-[52px] h-[42px] rounded-[17px] transition-all duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/60 hover:text-muted-foreground"
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

          {/* Right pill: compose + button */}
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
                          const newCard = {
                            id, title: "", summary: "", body: "",
                            category: "uncategorized" as CardCategory,
                            source: "text" as const,
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
