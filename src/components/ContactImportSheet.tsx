import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchDeviceContacts, hasContactsSupport, type ContactEntry } from "@/lib/contacts";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (contacts: ContactEntry[]) => Promise<void>;
  existingNames: string[];
}

export function ContactImportSheet({ open, onClose, onImport, existingNames }: Props) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchTriggered, setFetchTriggered] = useState(false);
  const [manualName, setManualName] = useState("");

  const supportsContacts = hasContactsSupport();

  // Auto-fetch contacts when sheet opens
  useEffect(() => {
    if (!open) {
      setFetchTriggered(false);
      setContacts([]);
      setSelected(new Set());
      setSearch("");
      return;
    }

    if (supportsContacts && !fetchTriggered) {
      setFetchTriggered(true);
      (async () => {
        try {
          const results = await fetchDeviceContacts();
          if (!results || results.length === 0) {
            onClose();
            return;
          }
          setContacts(results);
          // Pre-select contacts not already added
          const preSelected = new Set<number>();
          results.forEach((c, i) => {
            if (!existingNames.includes(c.name)) preSelected.add(i);
          });
          setSelected(preSelected);
        } catch (err) {
          console.error("Contact fetch error:", err);
          toast.error("Could not access contacts");
          onClose();
        }
      })();
    }
  }, [open, supportsContacts, fetchTriggered, existingNames, onClose]);

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return;
    const entry: ContactEntry = { name: manualName.trim() };
    setContacts((prev) => [...prev, entry]);
    setSelected((prev) => new Set(prev).add(contacts.length));
    setManualName("");
  };

  const handleImport = async () => {
    const toImport = Array.from(selected)
      .map((i) => contacts[i])
      .filter((c) => !existingNames.includes(c.name));
    if (toImport.length === 0) {
      toast.info("No new contacts to add");
      return;
    }
    setLoading(true);
    await onImport(toImport);
    setLoading(false);
    toast.success(`Added ${toImport.length} ${toImport.length === 1 ? "person" : "people"}`);
    onClose();
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const newCount = Array.from(selected).filter(
    (i) => contacts[i] && !existingNames.includes(contacts[i].name)
  ).length;

  // Don't show sheet until contacts are loaded
  if (open && supportsContacts && contacts.length === 0) return null;

  return (
    <Sheet open={open && contacts.length > 0} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0 border-0"
        style={{ background: "hsl(var(--bg))" }}
      >
        <SheetHeader className="px-5 pt-6 pb-2">
          <SheetTitle
            className="font-display"
            style={{ fontSize: "24px", fontWeight: 400, color: "hsl(var(--text))" }}
          >
            Choose people
          </SheetTitle>
          <p style={{ fontSize: "13px", color: "hsl(var(--text) / 0.45)", marginTop: "4px" }}>
            {contacts.length} contacts · {newCount} selected
          </p>
        </SheetHeader>

        <div className="px-5 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(85vh - 180px)" }}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
              style={{
                background: "hsl(var(--surface) / 0.5)",
                border: "1px solid hsl(var(--divider) / 0.15)",
                color: "hsl(var(--text))",
              }}
            />
          </div>

          {/* Contact list */}
          <div className="space-y-0.5">
            {filtered.map((contact, i) => {
              const realIndex = contacts.indexOf(contact);
              const isSelected = selected.has(realIndex);
              const alreadyAdded = existingNames.includes(contact.name);

              return (
                <button
                  key={`${contact.name}-${i}`}
                  onClick={() => !alreadyAdded && toggleSelect(realIndex)}
                  disabled={alreadyAdded}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left"
                  style={{
                    background: isSelected ? "hsl(var(--accent-1) / 0.08)" : "transparent",
                    opacity: alreadyAdded ? 0.4 : 1,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isSelected ? "hsl(var(--accent-1) / 0.2)" : "hsl(var(--surface))",
                      border: `1px solid ${isSelected ? "hsl(var(--accent-1) / 0.4)" : "hsl(var(--divider))"}`,
                    }}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent-1))" }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate"
                      style={{ fontSize: "14px", color: "hsl(var(--text) / 0.85)" }}
                    >
                      {contact.name}
                    </p>
                    {contact.phone && (
                      <p
                        className="truncate"
                        style={{ fontSize: "12px", color: "hsl(var(--text) / 0.4)" }}
                      >
                        {contact.phone}
                      </p>
                    )}
                  </div>
                  {alreadyAdded && (
                    <span style={{ fontSize: "11px", color: "hsl(var(--text) / 0.35)" }}>
                      Already added
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Manual add fallback */}
          {!supportsContacts && contacts.length === 0 && (
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Type a name..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                style={{
                  background: "hsl(var(--surface) / 0.5)",
                  border: "1px solid hsl(var(--divider) / 0.15)",
                  color: "hsl(var(--text))",
                }}
              />
              <button
                onClick={handleAddManual}
                disabled={!manualName.trim()}
                className="px-4 py-2.5 rounded-lg text-sm transition-opacity disabled:opacity-30"
                style={{
                  background: "hsl(var(--accent-1) / 0.15)",
                  color: "hsl(var(--accent-1))",
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Fixed bottom import button */}
        {newCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-8">
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "hsl(var(--accent-1) / 0.15)",
                color: "hsl(var(--accent-1))",
                border: "1px solid hsl(var(--accent-1) / 0.25)",
              }}
            >
              {loading
                ? "Adding..."
                : `Add ${newCount} ${newCount === 1 ? "person" : "people"} to your circle`}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
