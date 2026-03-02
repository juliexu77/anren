export type ItemType = "task" | "ongoing" | "event";
export type ItemStatus = "active" | "scheduled" | "complete";
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

/* ── Legacy mapping helpers ── */
export function mapStatus(raw: string): ItemStatus {
  switch (raw) {
    case "active": return "active";
    case "inbox": return "active";
    case "scheduled": return "scheduled";
    case "routed": return "scheduled";
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
