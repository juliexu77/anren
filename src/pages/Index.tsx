import { useState, useMemo } from "react";
import { useCards } from "@/hooks/useCards";
import { NoteRow } from "@/components/NoteRow";
import { GroupedCard } from "@/components/GroupedCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { GoogleCalendarView } from "@/components/GoogleCalendarView";
import { SettingsPage } from "@/components/SettingsPage";
import { Sparkles, Loader2, Settings, PenSquare, Search, StickyNote, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BrainCard, CardCategory } from "@/types/card";

type ViewId = "notes" | "calendar" | "settings";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard, groupCards, ungroupCards } = useCards();
  const [activeView, setActiveView] = useState<ViewId>("notes");
  const [filter, setFilter] = useState<CardCategory | "all">("all");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<BrainCard | null>(null);

  // Filter by category and search
  const filtered = useMemo(() => {
    let result = filter === "all" ? cards : cards.filter((c) => c.category === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, filter, searchQuery]);

  // Split into ungrouped rows and grouped cards
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

      toast.success("Notes categorized!");
    } catch (e: any) {
      console.error("AI sort error:", e);
      toast.error(e.message || "Failed to sort notes");
    } finally {
      setIsSorting(false);
    }
  };

  // Drag & drop handlers
  const handleDragStart = (_e: React.DragEvent, card: BrainCard) => {
    setDraggedCard(card);
  };

  const handleDragOver = (_e: React.DragEvent, targetId: string) => {
    if (draggedCard && draggedCard.id !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (_e: React.DragEvent, targetCard: BrainCard) => {
    if (draggedCard && draggedCard.id !== targetCard.id) {
      groupCards(draggedCard.id, targetCard.id);
      toast.success("Notes grouped!");
    }
    setDragOverId(null);
    setDraggedCard(null);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 px-5 pt-12 pb-2">
        <div className="flex items-center justify-between mb-2">
          {/* Left: Notes / Calendar toggle */}
          <button
            onClick={() => setActiveView(activeView === "notes" ? "calendar" : "notes")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            {activeView === "notes" ? <Calendar className="w-5 h-5" /> : <StickyNote className="w-5 h-5" />}
          </button>

          {/* Right: Settings */}
          <button
            onClick={() => setActiveView("settings")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeView === "settings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <h1 className="text-display-caps-sm text-foreground text-center tracking-[0.25em]">
          ANREN
        </h1>
      </header>

      {activeView === "notes" ? (
        <main className="px-4">
          <div className="mb-4">
            <CategoryFilter active={filter} onChange={setFilter} />
          </div>

          {/* Ungrouped notes as rows */}
          <div className="space-y-1 mb-4">
            {ungroupedCards.map((card, i) => (
              <NoteRow
                key={card.id}
                card={card}
                index={i}
                onClick={() => setSelectedCard(card)}
                isDragOver={dragOverId === card.id}
                onDragStart={handleDragStart}
                onDragOver={(e) => handleDragOver(e, card.id)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </div>

          {/* AI Sort button — inline */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleAISort}
              disabled={isSorting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 transition-colors hover:border-primary/40 hover:text-primary/60"
            >
              {isSorting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">Sort</span>
            </button>
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
          <button
            onClick={() => setShowNew(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105"
            style={{
              background: 'hsl(var(--text-muted) / 0.2)',
              backdropFilter: 'blur(12px)',
              border: '1px solid hsl(var(--divider) / 0.3)',
            }}
          >
            <PenSquare className="w-5 h-5 text-foreground/70" />
          </button>
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
        open={showNew}
        onClose={() => setShowNew(false)}
        onAdd={addCard}
        onUpdateCard={updateCard}
      />
    </div>
  );
};

export default Index;
