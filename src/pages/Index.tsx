import { useState } from "react";
import { useCards } from "@/hooks/useCards";
import { BrainCardComponent } from "@/components/BrainCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { CalendarPlaceholder } from "@/components/CalendarPlaceholder";
import { SettingsPage } from "@/components/SettingsPage";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { CATEGORY_CONFIG } from "@/types/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BrainCard, CardCategory } from "@/types/card";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard } = useCards();
  const [activeTab, setActiveTab] = useState<TabId>("notes");
  const [filter, setFilter] = useState<CardCategory | "all">("all");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [groupedByWorkstream, setGroupedByWorkstream] = useState(false);
  const [isSorting, setIsSorting] = useState(false);

  const filtered =
    filter === "all" ? cards : cards.filter((c) => c.category === filter);

  const tabTitle: Record<TabId, string> = {
    notes: "Notes",
    calendar: "Calendar",
    settings: "Settings",
  };

  const handleAISort = async () => {
    if (cards.length === 0) {
      toast("No notes to sort!");
      return;
    }
    setIsSorting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sort-cards", {
        body: { cards: cards.map((c) => ({ title: c.title, body: c.body })) },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assignments = data.assignments as { index: number; category: CardCategory }[];
      assignments.forEach(({ index, category }) => {
        if (cards[index] && category) {
          updateCard(cards[index].id, { category });
        }
      });

      setGroupedByWorkstream(true);
      setFilter("all");
      toast.success("Notes organized by workstream! ✨");
    } catch (e: any) {
      console.error("AI sort error:", e);
      toast.error(e.message || "Failed to sort notes");
    } finally {
      setIsSorting(false);
    }
  };

  // Group cards by workstream for grouped view
  const groupedCards = () => {
    const groups: Record<string, BrainCard[]> = {};
    filtered.forEach((card) => {
      if (!groups[card.category]) groups[card.category] = [];
      groups[card.category].push(card);
    });
    return groups;
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 px-5 pt-12 pb-4 text-center">
        <h1 className="text-display-caps-sm text-foreground">
          {tabTitle[activeTab]}
        </h1>
      </header>

      {activeTab === "notes" ? (
        <main className="px-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1 overflow-x-auto">
              <CategoryFilter active={filter} onChange={(cat) => { setFilter(cat); if (cat !== "all") setGroupedByWorkstream(false); }} />
            </div>
            <button
              onClick={handleAISort}
              disabled={isSorting}
              className="flex items-center gap-1.5 category-pill bg-primary text-primary-foreground shrink-0"
            >
              {isSorting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Sort
            </button>
          </div>

          {groupedByWorkstream && filter === "all" ? (
            // Grouped view by workstream
            <div className="space-y-6">
              {Object.entries(groupedCards()).map(([category, catCards]) => {
                const cat = CATEGORY_CONFIG[category as CardCategory];
                if (!cat) return null;
                return (
                  <div key={category}>
                    <h2 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      <span className="text-muted-foreground font-normal">({catCards.length})</span>
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
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
          ) : (
            // Standard grid view
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowNew(true)}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 py-10 text-muted-foreground/50 transition-colors hover:border-primary/40 hover:text-primary/60"
              >
                <Plus className="w-8 h-8 mb-1" />
                <span className="text-xs font-medium">New Note</span>
              </button>

              {filtered.map((card, i) => (
                <BrainCardComponent
                  key={card.id}
                  card={card}
                  index={i}
                  onClick={() => setSelectedCard(card)}
                />
              ))}
            </div>
          )}
        </main>
      ) : activeTab === "calendar" ? (
        <CalendarPlaceholder />
      ) : (
        <SettingsPage />
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={updateCard}
        onDelete={deleteCard}
      />

      <NewCardSheet
        open={showNew}
        onClose={() => setShowNew(false)}
        onAdd={addCard}
      />
    </div>
  );
};

export default Index;
