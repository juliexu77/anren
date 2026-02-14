export type CardCategory =
  | "events"
  | "tasks"
  | "ideas"
  | "recipes"
  | "shopping"
  | "kids"
  | "health"
  | "general";

export type CardSource = "text" | "screenshot" | "voice";

export interface BrainCard {
  id: string;
  title: string;
  body: string;
  category: CardCategory;
  source: CardSource;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_CONFIG: Record<
  CardCategory,
  { label: string; emoji: string; color: string }
> = {
  events: { label: "Events", emoji: "📅", color: "bg-peach" },
  tasks: { label: "Tasks", emoji: "✅", color: "bg-sage" },
  ideas: { label: "Ideas", emoji: "💡", color: "bg-lavender" },
  recipes: { label: "Recipes", emoji: "🍳", color: "bg-peach" },
  shopping: { label: "Shopping", emoji: "🛒", color: "bg-sky" },
  kids: { label: "Kids", emoji: "👶", color: "bg-peach" },
  health: { label: "Health", emoji: "💊", color: "bg-sage" },
  general: { label: "General", emoji: "📝", color: "bg-lavender" },
};
