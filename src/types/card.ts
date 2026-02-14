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
  tasks: { label: "Tasks", emoji: "✅", color: "bg-secondary/15" },
  ideas: { label: "Ideas", emoji: "💡", color: "bg-primary/10" },
  recipes: { label: "Recipes", emoji: "🍳", color: "bg-secondary/15" },
  shopping: { label: "Shopping", emoji: "🛒", color: "bg-primary/15" },
  kids: { label: "Kids", emoji: "👶", color: "bg-secondary/10" },
  health: { label: "Health", emoji: "💊", color: "bg-primary/10" },
  general: { label: "General", emoji: "📝", color: "bg-muted" },
};
