import { useState } from "react";
import { usePeople } from "@/hooks/usePeople";
import { PersonCard } from "@/components/PersonCard";
import { ContactImportSheet } from "@/components/ContactImportSheet";
import { UserPlus } from "lucide-react";

export function PeopleView() {
  const { people, addPerson, updateDraft, deletePerson } = usePeople();
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="px-4 pt-2 pb-24">
      {/* Import button */}
      <button
        onClick={() => setShowImport(true)}
        className="w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-xl text-caption"
        style={{
          background: "hsl(var(--surface))",
          border: "1px solid hsl(var(--divider))",
          color: "hsl(var(--text-secondary))",
        }}
      >
        <UserPlus className="w-4 h-4" />
        Add from contacts
      </button>

      {people.length === 0 ? (
        <div className="text-center pt-16">
          <p className="text-h3 font-display text-foreground/60 mb-2">
            Your circle is empty
          </p>
          <p className="text-caption text-muted-foreground">
            Add people you want to stay connected with
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
