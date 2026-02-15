export type CardCategory =
  | "finance"
  | "childcare"
  | "extracurriculars"
  | "doctor"
  | "house-maintenance"
  | "home-organization"
  | "household-inventory"
  | "kids-clothes"
  | "food"
  | "laundry";

export type CardSource = "text" | "screenshot" | "voice";

export interface BrainCard {
  id: string;
  title: string;
  body: string;
  category: CardCategory;
  source: CardSource;
  imageUrl?: string;
  groupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_CONFIG: Record<
  CardCategory,
  { label: string; emoji: string; color: string }
> = {
  finance: { label: "Finance", emoji: "💰", color: "bg-primary/10" },
  childcare: { label: "Childcare", emoji: "👶", color: "bg-secondary/10" },
  extracurriculars: { label: "Extracurriculars", emoji: "⚽", color: "bg-primary/8" },
  doctor: { label: "Doctor Visits", emoji: "🩺", color: "bg-secondary/10" },
  "house-maintenance": { label: "House Maintenance", emoji: "🔧", color: "bg-primary/10" },
  "home-organization": { label: "Home Organization", emoji: "🏠", color: "bg-secondary/8" },
  "household-inventory": { label: "Household Inventory", emoji: "📦", color: "bg-primary/8" },
  "kids-clothes": { label: "Kids Clothes", emoji: "👕", color: "bg-secondary/10" },
  food: { label: "Food", emoji: "🍽️", color: "bg-primary/10" },
  laundry: { label: "Laundry", emoji: "🧺", color: "bg-muted" },
};
