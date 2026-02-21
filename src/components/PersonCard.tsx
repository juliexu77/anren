import { useState, useRef } from "react";
import type { Person } from "@/hooks/usePeople";
import { Trash2, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  person: Person;
  onUpdateDraft: (id: string, draft: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PersonCard({ person, onUpdateDraft, onDelete }: Props) {
  const [draft, setDraft] = useState(person.draftMessage);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    await onUpdateDraft(person.id, draft);
    setDirty(false);
    toast.success("Draft saved");
  };

  // Initials for avatar
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "hsl(var(--card-bg))",
        border: "1px solid hsl(var(--card-border))",
        boxShadow:
          "0 1px 3px var(--card-shadow), 0 4px 12px var(--card-shadow)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar circle */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "hsl(var(--accent-1) / 0.15)",
            color: "hsl(var(--accent-1))",
          }}
        >
          <span className="text-label font-semibold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-body-sm font-medium text-foreground truncate">
            {person.name}
          </h3>
          {person.phone && (
            <p className="text-caption-sm text-muted-foreground truncate">
              {person.phone}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(person.id)}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Draft message area */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        placeholder="Write a note or draft message..."
        rows={3}
        className="w-full rounded-lg px-3 py-2.5 text-caption resize-none"
        style={{
          background: "hsl(var(--surface))",
          border: "1px solid hsl(var(--divider))",
          color: "hsl(var(--text))",
        }}
      />

      {/* Save button (only when dirty) */}
      {dirty && (
        <button
          onClick={handleSave}
          className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-label transition-colors"
          style={{
            background: "hsl(var(--accent-1) / 0.15)",
            color: "hsl(var(--accent-1))",
          }}
        >
          <Check className="w-3.5 h-3.5" />
          Save draft
        </button>
      )}
    </div>
  );
}
