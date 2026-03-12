/**
 * Shared card types — single source of truth for web app and Chrome extension.
 */

export type ItemType = "task" | "ongoing" | "event";
export type ItemStatus = "active" | "complete";
export type CardSource = "text" | "screenshot" | "voice" | "brain_dump" | "extension";

export interface BrainCard {
  id: string;
  title: string;
  summary: string;
  body: string;
  source: CardSource;
  type: ItemType | null;
  status: ItemStatus;
  imageUrl?: string | null;
  groupId?: string | null;
  dueAt?: string | null;
  googleEventId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapStatus(raw: string): ItemStatus {
  switch (raw) {
    case "complete": return "complete";
    case "done": return "complete";
    default: return "active";
  }
}

export function mapType(raw: string | null): ItemType | null {
  switch (raw) {
    case "task": return "task";
    case "ongoing": return "ongoing";
    case "event": return "event";
    case "reference": return "ongoing";
    case "ignore": return null;
    default: return null;
  }
}
