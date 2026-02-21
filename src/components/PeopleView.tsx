import { useState, useEffect, useCallback } from "react";
import { usePeople } from "@/hooks/usePeople";
import { PersonCard } from "@/components/PersonCard";
import { ContactImportSheet } from "@/components/ContactImportSheet";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface BirthdayEntry {
  name: string;
  date: string;
  summary: string;
}

export function PeopleView() {
  const { people, addPerson, updateDraft, deletePerson } = usePeople();
  const [showImport, setShowImport] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<typeof people[0] | null>(null);
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);
  const [editingDraft, setEditingDraft] = useState("");

  // Fetch birthdays from Google Calendar
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=birthdays`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        if (data.birthdays) {
          setBirthdays(data.birthdays);
        }
      } catch {
        // Silently fail — calendar may not be linked
      }
    };
    fetchBirthdays();
  }, []);

  // Match birthdays to people
  const getBirthday = useCallback(
    (personName: string) => {
      const match = birthdays.find(
        (b) => b.name.toLowerCase() === personName.toLowerCase()
      );
      if (!match) return undefined;
      const bDate = new Date(match.date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diff = Math.floor((bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { date: match.date, daysUntil: Math.max(0, diff) };
    },
    [birthdays]
  );

  // Sort people: upcoming birthdays first, then alphabetical
  const sortedPeople = [...people].sort((a, b) => {
    const aBday = getBirthday(a.name);
    const bBday = getBirthday(b.name);
    if (aBday && !bBday) return -1;
    if (!aBday && bBday) return 1;
    if (aBday && bBday) return aBday.daysUntil - bBday.daysUntil;
    return a.name.localeCompare(b.name);
  });

  const handleSaveDraft = async () => {
    if (selectedPerson) {
      await updateDraft(selectedPerson.id, editingDraft);
      toast.success("Saved");
    }
  };

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
        <div className="grid grid-cols-2 gap-3">
          {sortedPeople.map((person, i) => (
            <PersonCard
              key={person.id}
              person={person}
              birthday={getBirthday(person.name)}
              onUpdateDraft={updateDraft}
              onDelete={deletePerson}
              onClick={() => {
                setSelectedPerson(person);
                setEditingDraft(person.draftMessage);
              }}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Person detail sheet */}
      <Sheet
        open={!!selectedPerson}
        onOpenChange={(open) => !open && setSelectedPerson(null)}
      >
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selectedPerson && (
            <>
              <SheetHeader>
                <SheetTitle
                  className="font-display"
                  style={{ fontSize: "24px", fontWeight: 400 }}
                >
                  {selectedPerson.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {getBirthday(selectedPerson.name) && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "hsl(var(--primary))",
                    }}
                  >
                    🎂 Birthday:{" "}
                    {new Date(getBirthday(selectedPerson.name)!.date).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric" }
                    )}
                  </p>
                )}

                {selectedPerson.email && (
                  <p style={{ fontSize: "13px", color: "hsl(var(--text) / 0.5)" }}>
                    {selectedPerson.email}
                  </p>
                )}
                {selectedPerson.phone && (
                  <p style={{ fontSize: "13px", color: "hsl(var(--text) / 0.5)" }}>
                    {selectedPerson.phone}
                  </p>
                )}

                {/* Draft message */}
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(var(--text) / 0.4)",
                    }}
                  >
                    Draft message
                  </label>
                  <textarea
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.target.value)}
                    onBlur={handleSaveDraft}
                    placeholder="Write something to send them later..."
                    className="w-full mt-1 bg-transparent outline-none resize-none"
                    rows={3}
                    style={{
                      fontSize: "14px",
                      color: "hsl(var(--text) / 0.8)",
                      borderBottom: "1px solid hsl(var(--divider) / 0.2)",
                      padding: "8px 0",
                    }}
                  />
                </div>

                {/* Send button */}
                {editingDraft.trim() && selectedPerson.phone && (
                  <a
                    href={`sms:${selectedPerson.phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(editingDraft)}`}
                    className="block w-full text-center py-3 rounded-xl transition-opacity"
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "hsl(var(--accent-1) / 0.15)",
                      color: "hsl(var(--accent-1))",
                      border: "1px solid hsl(var(--accent-1) / 0.25)",
                    }}
                  >
                    Send via SMS
                  </a>
                )}

                {editingDraft.trim() && !selectedPerson.phone && (
                  <p style={{ fontSize: "12px", color: "hsl(var(--text) / 0.35)" }}>
                    Add a phone number to send via SMS
                  </p>
                )}

                {/* Delete */}
                <button
                  onClick={async () => {
                    await deletePerson(selectedPerson.id);
                    setSelectedPerson(null);
                    toast.success("Removed");
                  }}
                  style={{
                    fontSize: "13px",
                    color: "hsl(0 60% 50% / 0.7)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Remove from circle
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
