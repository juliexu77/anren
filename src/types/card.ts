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
  events: { label: "Events", emoji: "📅", color: "bg-primary/15" },
  tasks: { label: "Tasks", emoji: "✅", color: "bg-teal-accent/15" },
  ideas: { label: "Ideas", emoji: "💡", color: "bg-gold-accent/15" },
  recipes: { label: "Recipes", emoji: "🍳", color: "bg-primary/15" },
  shopping: { label: "Shopping", emoji: "🛒", color: "bg-nebula/30" },
  kids: { label: "Kids", emoji: "👶", color: "bg-gold-accent/15" },
  health: { label: "Health", emoji: "💊", color: "bg-teal-accent/15" },
  general: { label: "General", emoji: "📝", color: "bg-accent" },
};
