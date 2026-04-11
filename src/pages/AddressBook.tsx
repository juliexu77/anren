import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAddressBook, type AddressEntry } from "@/hooks/useAddressBook";
import { AddressBookEntrySheet } from "@/components/AddressBookEntrySheet";
import { AddressBookUpload } from "@/components/AddressBookUpload";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Upload, Download, Gift, Trash2, Pencil } from "lucide-react";
import { format, parseISO, isValid, differenceInDays, setYear } from "date-fns";

function exportMintedCSV(entries: AddressEntry[]) {
  const headers = [
    "Household Name",
    "Name 1 First",
    "Name 1 Last",
    "Name 2 First",
    "Name 2 Last",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Zip Code",
    "Country",
  ];
  const rows = entries.map((e) => {
    const c1 = e.contacts.find((c) => c.is_primary) || e.contacts[0];
    const c2 = e.contacts.find((c) => c !== c1);
    return [
      e.household_name,
      c1?.first_name || "",
      c1?.last_name || "",
      c2?.first_name || "",
      c2?.last_name || "",
      e.address_line_1,
      e.address_line_2,
      e.city,
      e.state,
      e.zip,
      e.country,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "address-book-minted.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function upcomingBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const d = parseISO(birthday);
  if (!isValid(d)) return null;
  const today = new Date();
  let next = setYear(d, today.getFullYear());
  if (next < today) next = setYear(d, today.getFullYear() + 1);
  return differenceInDays(next, today);
}

export default function AddressBook() {
  const navigate = useNavigate();
  const { entries, loading, saveEntry, deleteEntry, bulkImport } = useAddressBook();
  const [showUpload, setShowUpload] = useState(false);
  const [editEntry, setEditEntry] = useState<AddressEntry | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Group alphabetically
  const grouped = useMemo(() => {
    const groups: Record<string, AddressEntry[]> = {};
    entries.forEach((e) => {
      const letter = (e.household_name[0] || "#").toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  return (
    <div className="min-h-screen max-w-xl mx-auto px-5 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 pt-16 pb-3 bg-transparent">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-display-caps-sm text-foreground tracking-[0.25em]">ADDRESS BOOK</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="text-xs">
          <Upload className="w-3 h-3 mr-1" /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportMintedCSV(entries)} disabled={entries.length === 0} className="text-xs">
          <Download className="w-3 h-3 mr-1" /> Export for Minted
        </Button>
        <div className="flex-1" />
        <Button variant="cta" size="sm" onClick={() => setShowAdd(true)} className="text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground text-sm mt-12">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center mt-16 space-y-3">
          <p className="text-muted-foreground text-sm">No addresses yet</p>
          <p className="text-muted-foreground/60 text-xs">Import a spreadsheet or add entries manually</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([letter, group]) => (
            <div key={letter}>
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest mb-2">{letter}</p>
              <div className="space-y-2">
                {group.map((entry) => {
                  const nearestBday = entry.contacts
                    .map((c) => ({ name: c.first_name, days: upcomingBirthday(c.birthday) }))
                    .filter((b) => b.days !== null && b.days! <= 30)
                    .sort((a, b) => a.days! - b.days!)[0];

                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-foreground/5 border border-foreground/10 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-foreground text-sm font-medium truncate">{entry.household_name}</p>
                          <p className="text-muted-foreground text-xs mt-0.5 truncate">
                            {[entry.address_line_1, entry.city, entry.state, entry.zip].filter(Boolean).join(", ")}
                          </p>
                          <p className="text-muted-foreground/60 text-xs mt-0.5">
                            {entry.contacts.map((c) => `${c.first_name} ${c.last_name}`).join(", ")}
                          </p>
                          {nearestBday && (
                            <p className="text-xs mt-1 flex items-center gap-1">
                              <Gift className="w-3 h-3 text-accent-1" />
                              <span className="text-[hsl(var(--accent-1))]">
                                {nearestBday.name}'s birthday in {nearestBday.days} days
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditEntry(entry)} className="p-1.5 text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheets */}
      <AddressBookEntrySheet
        open={showAdd || !!editEntry}
        onClose={() => { setShowAdd(false); setEditEntry(null); }}
        entry={editEntry}
        onSave={saveEntry}
      />

      <AddressBookUpload
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onImport={bulkImport}
      />
    </div>
  );
}
