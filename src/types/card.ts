/**
 * Re-export shared card types — single source of truth in shared/types/card.ts (web app + extension).
 */
export type {
  ItemType,
  ItemStatus,
  CardSource,
  BrainCard,
} from "../../shared/types/card";
export { mapStatus, mapType } from "../../shared/types/card";
