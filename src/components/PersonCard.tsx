import { useState, useRef } from "react";
import type { Person } from "@/hooks/usePeople";

interface BirthdayInfo {
  date: string;
  daysUntil: number;
}

interface Props {
  person: Person;
  birthday?: BirthdayInfo;
  onUpdateDraft: (id: string, draft: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick: () => void;
  index: number;
}

export function PersonCard({ person, birthday, onUpdateDraft, onDelete, onClick, index }: Props) {
  const formatBirthday = (info: BirthdayInfo) => {
    if (info.daysUntil === 0) return "🎂 Today!";
    if (info.daysUntil === 1) return "🎂 Tomorrow";
    if (info.daysUntil <= 7) return `🎂 In ${info.daysUntil} days`;
    if (info.daysUntil <= 30) return `🎂 In ${Math.ceil(info.daysUntil / 7)} weeks`;
    const d = new Date(info.date);
    return `🎂 ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-lg p-3 animate-fade-in transition-shadow hover:shadow-lg overflow-hidden"
      style={{
        background: "hsl(var(--card-bg) / 0.6)",
        border: "1px solid hsl(var(--divider) / 0.3)",
        animationDelay: `${index * 40}ms`,
      }}
    >
      <p
        className="font-display truncate"
        style={{
          fontSize: "16px",
          lineHeight: "20px",
          fontWeight: 400,
          color: "hsl(var(--text))",
        }}
      >
        {person.name}
      </p>

      {birthday && (
        <p
          className="mt-1"
          style={{
            fontSize: "11px",
            lineHeight: "14px",
            color: birthday.daysUntil <= 7
              ? "hsl(var(--primary))"
              : "hsl(var(--text) / 0.45)",
          }}
        >
          {formatBirthday(birthday)}
        </p>
      )}

      {person.draftMessage && !birthday && (
        <p
          className="mt-1 truncate"
          style={{
            fontSize: "11px",
            lineHeight: "14px",
            color: "hsl(var(--text) / 0.4)",
          }}
        >
          {person.draftMessage}
        </p>
      )}
    </button>
  );
}
