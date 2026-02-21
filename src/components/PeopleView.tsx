import { useState } from "react";
import { usePeople } from "@/hooks/usePeople";
import { PersonCard } from "@/components/PersonCard";
import { ContactImportSheet } from "@/components/ContactImportSheet";

export function PeopleView() {
  const { people, addPerson, updateDraft, deletePerson } = usePeople();
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="px-4 pt-2 pb-28">
      {/* Section header */}
      <h2
        className="font-display mb-1"
        style={{
          fontSize: "32px",
          lineHeight: "36px",
          fontWeight: 400,
          color: "hsl(var(--text))",
        }}
      >
        Your People
      </h2>

      {/* Import link */}
      <button
        onClick={() => setShowImport(true)}
        className="mb-6 mt-1"
        style={{
          fontSize: "13px",
          lineHeight: "18px",
          fontWeight: 400,
          color: "hsl(var(--text) / 0.5)",
          background: "none",
          border: "none",
          padding: 0,
        }}
      >
        Add from contacts
      </button>

      {people.length === 0 ? (
        <div className="pt-16">
          <p
            className="font-display"
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: "hsl(var(--text) / 0.4)",
            }}
          >
            No one here yet
          </p>
          <p
            className="mt-2"
            style={{
              fontSize: "13px",
              color: "hsl(var(--text) / 0.35)",
            }}
          >
            Add people you want to stay connected with
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onUpdateDraft={updateDraft}
              onDelete={deletePerson}
            />
          ))}
        </div>
      )}

      <ContactImportSheet
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={async (contacts) => {
          for (const c of contacts) {
            await addPerson({ name: c.name, phone: c.phone, email: c.email });
          }
        }}
        existingNames={people.map((p) => p.name)}
      />
    </div>
  );
}
