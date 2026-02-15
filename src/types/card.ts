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
  finance: { label: "Finance", icon: Wallet, color: "bg-primary/10" },
  childcare: { label: "Childcare", icon: Baby, color: "bg-secondary/10" },
  extracurriculars: { label: "Extracurriculars", icon: Trophy, color: "bg-primary/8" },
  doctor: { label: "Doctor Visits", icon: Stethoscope, color: "bg-secondary/10" },
  "house-maintenance": { label: "House Maintenance", icon: Wrench, color: "bg-primary/10" },
  "home-organization": { label: "Home Organization", icon: Home, color: "bg-secondary/8" },
  "household-inventory": { label: "Household Inventory", icon: Package, color: "bg-primary/8" },
  "kids-clothes": { label: "Kids Clothes", icon: Shirt, color: "bg-secondary/10" },
  food: { label: "Food", icon: UtensilsCrossed, color: "bg-primary/10" },
  laundry: { label: "Laundry", icon: WashingMachine, color: "bg-muted" },
};
