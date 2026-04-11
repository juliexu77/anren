import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { AddressEntry, AddressContact } from "@/hooks/useAddressBook";

interface Props {
  open: boolean;
  onClose: () => void;
  entry?: AddressEntry | null;
  onSave: (
    entry: Omit<AddressEntry, "id" | "created_at" | "updated_at" | "contacts"> & { id?: string },
    contacts: AddressContact[]
  ) => Promise<void>;
}

const emptyContact = (): AddressContact => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  birthday: "",
  is_primary: false,
});

export function AddressBookEntrySheet({ open, onClose, entry, onSave }: Props) {
  const [householdName, setHouseholdName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [contacts, setContacts] = useState<AddressContact[]>([emptyContact()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && entry) {
      setHouseholdName(entry.household_name);
      setAddress1(entry.address_line_1);
      setAddress2(entry.address_line_2);
      setCity(entry.city);
      setState(entry.state);
      setZip(entry.zip);
      setCountry(entry.country);
      setContacts(entry.contacts.length > 0 ? entry.contacts : [emptyContact()]);
    } else if (open) {
      setHouseholdName("");
      setAddress1("");
      setAddress2("");
      setCity("");
      setState("");
      setZip("");
      setCountry("US");
      setContacts([emptyContact()]);
    }
  }, [open, entry]);

  const updateContact = (i: number, field: keyof AddressContact, value: any) => {
    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const handleSave = async () => {
    setSaving(true);
    // Auto-generate household name if empty
    const name = householdName || contacts.filter(c => c.last_name).map(c => c.last_name)[0] + " Family" || "Unnamed";
    // Mark first contact as primary if none is
    const finalContacts = contacts.filter((c) => c.first_name || c.last_name);
    if (finalContacts.length > 0 && !finalContacts.some((c) => c.is_primary)) {
      finalContacts[0].is_primary = true;
    }
    await onSave(
      {
        id: entry?.id,
        household_name: name,
        address_line_1: address1,
        address_line_2: address2,
        city,
        state,
        zip,
        country,
      },
      finalContacts
    );
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-[hsl(var(--bg))] border-t border-[var(--glass-border)]">
        <SheetHeader>
          <SheetTitle className="font-serif text-foreground">
            {entry ? "Edit Household" : "Add Household"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Household Name</Label>
            <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="The Han Family" className="mt-1 bg-foreground/5 border-foreground/10" />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Address</Label>
            <Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 Main St" className="mt-1 bg-foreground/5 border-foreground/10" />
            <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt 4B" className="mt-1 bg-foreground/5 border-foreground/10" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 bg-foreground/5 border-foreground/10" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} className="mt-1 bg-foreground/5 border-foreground/10" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Zip</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1 bg-foreground/5 border-foreground/10" />
            </div>
          </div>

          {/* Members */}
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Members</Label>
            {contacts.map((c, i) => (
              <div key={i} className="mt-2 p-3 rounded-lg bg-foreground/5 border border-foreground/10 space-y-2">
                <div className="flex gap-2">
                  <Input value={c.first_name} onChange={(e) => updateContact(i, "first_name", e.target.value)} placeholder="First" className="bg-transparent border-foreground/10" />
                  <Input value={c.last_name} onChange={(e) => updateContact(i, "last_name", e.target.value)} placeholder="Last" className="bg-transparent border-foreground/10" />
                  {contacts.length > 1 && (
                    <button onClick={() => setContacts((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={c.email || ""} onChange={(e) => updateContact(i, "email", e.target.value)} placeholder="Email" type="email" className="bg-transparent border-foreground/10 text-sm" />
                  <Input value={c.phone || ""} onChange={(e) => updateContact(i, "phone", e.target.value)} placeholder="Phone" className="bg-transparent border-foreground/10 text-sm" />
                </div>
                <Input value={c.birthday || ""} onChange={(e) => updateContact(i, "birthday", e.target.value)} placeholder="Birthday (YYYY-MM-DD)" type="date" className="bg-transparent border-foreground/10 text-sm" />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setContacts((prev) => [...prev, emptyContact()])} className="mt-2 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add member
            </Button>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full" variant="cta">
            {saving ? "Saving…" : entry ? "Update" : "Add Household"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
