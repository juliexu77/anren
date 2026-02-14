import { useState } from "react";
import { useCards } from "@/hooks/useCards";
import { BrainCardComponent } from "@/components/BrainCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { CalendarPlaceholder } from "@/components/CalendarPlaceholder";
import type { BrainCard, CardCategory } from "@/types/card";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard } = useCards();
  const [activeTab, setActiveTab] = useState<TabId>("brain");
  const [filter, setFilter] = useState<CardCategory | "all">("all");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered =
    filter === "all" ? cards : cards.filter((c) => c.category === filter);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 px-5 pt-12 pb-4 bg-background/80 backdrop-blur-xl">
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
          {activeTab === "brain" ? "Mom Brain" : "Calendar"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activeTab === "brain"
            ? "Dump it, don't lose it ✨"
            : "Your schedule at a glance"}
        </p>
      </header>

      {activeTab === "brain" ? (
        <main className="px-4">
          {/* Category filter */}
          <div className="mb-4">
            <CategoryFilter active={filter} onChange={setFilter} />
          </div>

          {/* Card grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-5xl mb-4">🧠</p>
              <p className="text-muted-foreground text-sm">
                Your brain is empty!
                <br />
                Tap + to dump your first thought.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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
      ) : (
        <CalendarPlaceholder />
      )}

      {/* Bottom nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFabClick={() => setShowNew(true)}
      />

      {/* Sheets */}
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
