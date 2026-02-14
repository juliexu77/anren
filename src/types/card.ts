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
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_CONFIG: Record<
  CardCategory,
  { label: string; emoji: string; color: string }
> = {
  finance: { label: "Finance", emoji: "💰", color: "bg-primary/15" },
  childcare: { label: "Childcare", emoji: "👶", color: "bg-secondary/15" },
  extracurriculars: { label: "Extracurriculars", emoji: "⚽", color: "bg-primary/10" },
  doctor: { label: "Doctor Visits", emoji: "🩺", color: "bg-secondary/15" },
  "house-maintenance": { label: "House Maintenance", emoji: "🔧", color: "bg-primary/15" },
  "home-organization": { label: "Home Organization", emoji: "🏠", color: "bg-secondary/10" },
  "household-inventory": { label: "Household Inventory", emoji: "📦", color: "bg-primary/10" },
  "kids-clothes": { label: "Kids Clothes", emoji: "👕", color: "bg-secondary/15" },
  food: { label: "Food", emoji: "🍽️", color: "bg-primary/15" },
  laundry: { label: "Laundry", emoji: "🧺", color: "bg-muted" },
};
