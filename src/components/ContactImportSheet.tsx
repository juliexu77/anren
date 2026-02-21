import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";

interface ContactEntry {
  name: string;
  phone?: string;
  email?: string;
}

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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [manualName, setManualName] = useState("");

  // Try to access contacts API when sheet opens
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");

    if ("contacts" in navigator && "ContactsManager" in window) {
      setHasAccess(true);
    } else {
      setHasAccess(false);
    }
  }, [open]);

  const handleBrowseContacts = async () => {
    try {
      const props = ["name", "tel", "email"];
      // @ts-ignore - Contact Picker API
      const results = await navigator.contacts.select(props, { multiple: true });
      const mapped: ContactEntry[] = results.map((c: any) => ({
        name: c.name?.[0] || "Unknown",
        phone: c.tel?.[0] || undefined,
        email: c.email?.[0] || undefined,
      }));
      setContacts(mapped);
    } catch (err) {
      console.error("Contact picker error:", err);
      toast.error("Couldn't access contacts");
    }
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return;
    const entry: ContactEntry = { name: manualName.trim() };
    setContacts((prev) => [...prev, entry]);
    setSelected((prev) => new Set(prev).add(contacts.length));
    setManualName("");
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0 border-0"
        style={{
          background: "hsl(var(--bg))",
        }}
      >
        <SheetHeader className="px-5 pt-6 pb-4">
          <SheetTitle className="text-display-caps-sm text-foreground tracking-[0.2em]">
            Add People
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 120px)" }}>
          {/* Contact Picker button (mobile only) */}
          {hasAccess && contacts.length === 0 && (
            <button
              onClick={handleBrowseContacts}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-caption"
              style={{
                background: "hsl(var(--accent-1) / 0.12)",
                color: "hsl(var(--accent-1))",
                border: "1px solid hsl(var(--accent-1) / 0.2)",
              }}
            >
              <UserPlus className="w-4 h-4" />
              Browse iPhone contacts
            </button>
          )}

          {/* Manual add */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a name to add..."
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
              className="flex-1 px-3 py-2.5 rounded-lg text-caption"
            />
            <button
              onClick={handleAddManual}
              disabled={!manualName.trim()}
              className="px-4 py-2.5 rounded-lg text-label transition-opacity disabled:opacity-30"
              style={{
                background: "hsl(var(--accent-1) / 0.15)",
                color: "hsl(var(--accent-1))",
              }}
            >
              Add
            </button>
          </div>

          {/* Search (only when contacts loaded) */}
          {contacts.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search contacts"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-caption"
                />
              </div>

              {/* Contact list */}
              <div className="space-y-1">
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
                        background: isSelected
                          ? "hsl(var(--accent-1) / 0.08)"
                          : "transparent",
                        opacity: alreadyAdded ? 0.4 : 1,
                      }}
                    >
                      {/* Selection indicator */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isSelected
                            ? "hsl(var(--accent-1) / 0.2)"
                            : "hsl(var(--surface))",
                          border: `1px solid ${isSelected ? "hsl(var(--accent-1) / 0.4)" : "hsl(var(--divider))"}`,
                        }}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent-1))" }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm text-foreground truncate">{contact.name}</p>
                        {contact.phone && (
                          <p className="text-caption-sm text-muted-foreground truncate">{contact.phone}</p>
                        )}
                      </div>
                      {alreadyAdded && (
                        <span className="text-caption-sm text-muted-foreground">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Import button */}
          {selected.size > 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full py-3 rounded-xl text-label font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "hsl(var(--accent-1) / 0.15)",
                color: "hsl(var(--accent-1))",
                border: "1px solid hsl(var(--accent-1) / 0.25)",
              }}
            >
              {loading
                ? "Adding..."
                : `Add ${selected.size} ${selected.size === 1 ? "person" : "people"} to circle`}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
