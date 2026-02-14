import { useState } from "react";
import { useCards } from "@/hooks/useCards";
import { BrainCardComponent } from "@/components/BrainCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CardDetailSheet } from "@/components/CardDetailSheet";
import { NewCardSheet } from "@/components/NewCardSheet";
import { BottomNav, type TabId } from "@/components/BottomNav";
import { CalendarPlaceholder } from "@/components/CalendarPlaceholder";
import { SettingsPage } from "@/components/SettingsPage";
import { Plus } from "lucide-react";
import type { BrainCard, CardCategory } from "@/types/card";

const Index = () => {
  const { cards, addCard, updateCard, deleteCard } = useCards();
  const [activeTab, setActiveTab] = useState<TabId>("notes");
  const [filter, setFilter] = useState<CardCategory | "all">("all");
  const [selectedCard, setSelectedCard] = useState<BrainCard | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered =
    filter === "all" ? cards : cards.filter((c) => c.category === filter);

  const tabTitle: Record<TabId, string> = {
    notes: "Notes",
    calendar: "Calendar",
    settings: "Settings",
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
          <div className="mb-4">
            <CategoryFilter active={filter} onChange={setFilter} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Add new card placeholder */}
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
