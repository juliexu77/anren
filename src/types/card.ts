import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Baby,
  Trophy,
  Stethoscope,
  Wrench,
  Home,
  Package,
  Shirt,
  UtensilsCrossed,
  WashingMachine,
} from "lucide-react";

export type CardCategory =
  | "uncategorized"
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
  summary: string;
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
  { label: string; icon: LucideIcon; color: string }
> = {
  uncategorized: { label: "New", icon: Package, color: "bg-muted" },
  finance: { label: "Finance", icon: Wallet, color: "bg-primary/10" },
  childcare: { label: "Kids", icon: Baby, color: "bg-secondary/10" },
  extracurriculars: { label: "Activities", icon: Trophy, color: "bg-primary/8" },
  doctor: { label: "Medical", icon: Stethoscope, color: "bg-secondary/10" },
  "house-maintenance": { label: "Repairs", icon: Wrench, color: "bg-primary/10" },
  "home-organization": { label: "Organize", icon: Home, color: "bg-secondary/8" },
  "household-inventory": { label: "Inventory", icon: Package, color: "bg-primary/8" },
  "kids-clothes": { label: "Clothes", icon: Shirt, color: "bg-secondary/10" },
  food: { label: "Food", icon: UtensilsCrossed, color: "bg-primary/10" },
  laundry: { label: "Laundry", icon: WashingMachine, color: "bg-muted" },
};
