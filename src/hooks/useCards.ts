import { useState, useEffect, useCallback } from "react";
import type { BrainCard, CardCategory, CardSource } from "@/types/card";

const STORAGE_KEY = "mom-brain-cards";

function loadCards(): BrainCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCards(cards: BrainCard[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.warn("Failed to save cards to localStorage:", e);
  }
}

export function useCards() {
  const [cards, setCards] = useState<BrainCard[]>(loadCards);

  useEffect(() => {
    saveCards(cards);
  }, [cards]);

  const addCard = useCallback(
    (data: {
      title: string;
      body: string;
      category?: CardCategory;
      source?: CardSource;
      imageUrl?: string;
    }): string => {
      const now = new Date().toISOString();
      const card: BrainCard = {
        id: crypto.randomUUID(),
        title: data.title,
        body: data.body,
        category: data.category ?? "finance",
        source: data.source ?? "text",
        imageUrl: data.imageUrl,
        createdAt: now,
        updatedAt: now,
      };
      setCards((prev) => [card, ...prev]);
      return card.id;
    },
    []
  );

  const updateCard = useCallback(
    (id: string, updates: Partial<Pick<BrainCard, "title" | "body" | "category">>) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...updates, updatedAt: new Date().toISOString() }
            : c
        )
      );
    },
    []
  );

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { cards, addCard, updateCard, deleteCard };
}
