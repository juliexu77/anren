import { useState, useRef } from "react";
import type { Person } from "@/hooks/usePeople";
import { toast } from "sonner";

interface Props {
  person: Person;
  onUpdateDraft: (id: string, draft: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PersonCard({ person, onUpdateDraft, onDelete }: Props) {
  const [draft, setDraft] = useState(person.draftMessage);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    await onUpdateDraft(person.id, draft);
    setDirty(false);
    setEditing(false);
    toast.success("Saved");
  };

  return (
    <div
      className="rounded-lg px-5 flex flex-col justify-center"
      style={{
        height: "80px",
        background: "hsl(var(--card-bg))",
        border: "1px solid hsl(var(--divider) / 0.12)",
      }}
    >
      {/* Name */}
      <p
        className="font-display truncate"
        style={{
          fontSize: "18px",
          lineHeight: "22px",
          fontWeight: 400,
          color: "hsl(var(--text))",
        }}
      >
        {person.name}
      </p>

      {/* Draft field — inline, single line */}
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
          onBlur={() => { if (dirty) handleSave(); else setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="Draft a message..."
          className="mt-1 w-full bg-transparent outline-none truncate"
          style={{
            fontSize: "13px",
            lineHeight: "18px",
            fontWeight: 400,
            color: "hsl(var(--text) / 0.5)",
            border: "none",
            padding: 0,
          }}
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="mt-1 truncate cursor-text"
          style={{
            fontSize: "13px",
            lineHeight: "18px",
            fontWeight: 400,
            color: "hsl(var(--text) / 0.4)",
          }}
        >
          {draft || "Draft a message..."}
        </p>
      )}
    </div>
  );
}
