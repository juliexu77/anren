/**
 * Re-export shared card types so the extension uses the same types as the web app.
 * Import from here: import type { BrainCard, ItemType, ItemStatus } from "./shared/cardTypes";
 */
export type {
  BrainCard,
  CardSource,
  ItemType,
  ItemStatus,
} from "shared";
export { mapStatus, mapType } from "shared";
