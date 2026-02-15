import { useState, useMemo } from "react";
import { useCards } from "@/hooks/useCards";
import { BrainCardComponent } from "@/components/BrainCard";
import { GroupedCard } from "@/components/GroupedCard";
import { CATEGORY_CONFIG } from "@/types/card";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { GoogleCalendarView } from "@/components/GoogleCalendarView";
import { SettingsPage } from "@/components/SettingsPage";
import { Settings, Search, StickyNote, Calendar, Camera, Type, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrainCard, CardCategory } from "@/types/card";

type ViewId = "notes" | "calendar" | "settings";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard, groupCards, ungroupCards } = useCards();
  const [activeView, setActiveView] = useState<ViewId>("notes");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter by search only
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  // Group cards by category (only categories that have cards)
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

  // Split into ungrouped and grouped
  const { ungroupedCards, groups } = useMemo(() => {
    const ungrouped: BrainCard[] = [];
    const groupMap: Record<string, BrainCard[]> = {};
    filtered.forEach((card) => {
      if (card.groupId) {
        if (!groupMap[card.groupId]) groupMap[card.groupId] = [];
        groupMap[card.groupId].push(card);
      } else {
        ungrouped.push(card);
      }
    });
    return { ungroupedCards: ungrouped, groups: groupMap };
  }, [filtered]);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          {/* Left: view toggle */}
          <button
            onClick={() => setActiveView(activeView === "notes" ? "calendar" : "notes")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            {activeView === "notes" ? <Calendar className="w-5 h-5" /> : <StickyNote className="w-5 h-5" />}
          </button>

          {/* Center: ANREN */}
          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">
            ANREN
          </h1>

          {/* Right: Settings */}
          <button
            onClick={() => setActiveView(activeView === "settings" ? "notes" : "settings")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeView === "settings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {activeView === "notes" ? (
        <main className="px-4">
          {/* Cards grouped by category */}
          <div className="space-y-5 mb-4">
            {(Object.keys(CATEGORY_CONFIG) as CardCategory[]).map((catKey) => {
              const catCards = cardsByCategory[catKey];
              if (!catCards || catCards.length === 0) return null;
              const cat = CATEGORY_CONFIG[catKey];
              const Icon = cat.icon;
              return (
                <div key={catKey} className="flex gap-2" style={{ minHeight: '88px' }}>
                  <div className="flex flex-col items-center pt-2" style={{ minWidth: '20px' }}>
                    <div className="flex flex-col items-center gap-[1px]">
                      {cat.label.split('').map((letter, li) => (
                        <span key={li} className="text-[10px] text-foreground/90 font-semibold uppercase leading-none">{letter}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
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



          {/* Grouped cards section */}
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
      ) : activeView === "calendar" ? (
        <GoogleCalendarView />
      ) : (
        <SettingsPage />
      )}

      {/* Bottom toolbar — search + compose (Apple Notes style) */}
      {activeView === "notes" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 flex items-center gap-3"
          style={{
            background: 'linear-gradient(to top, hsl(var(--bg)) 60%, transparent)',
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
            />
          </div>
          {[
            { action: () => setShowPhotoPicker(true), icon: Camera, label: "Photo" },
            { action: () => {}, icon: Type, label: "Type" },
            { action: () => {}, icon: Mic, label: "Voice" },
          ].map(({ action, icon: BtnIcon, label }) => (
            <button
              key={label}
              onClick={action}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105"
              style={{
                background: 'hsl(var(--text-muted) / 0.2)',
                backdropFilter: 'blur(12px)',
                border: '1px solid hsl(var(--divider) / 0.3)',
              }}
            >
              <BtnIcon className="w-5 h-5 text-foreground/70" />
            </button>
          ))}
        </div>
      )}

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
    </div>
  );
};

export default Index;
