import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import type { AddressContact } from "@/hooks/useAddressBook";

interface ParsedRow {
  household_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  contacts: AddressContact[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ParsedRow[]) => Promise<void>;
}

// Header mapping for Minted and common formats
function findCol(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.toLowerCase().replace(/[^a-z0-9]/g, "").includes(c.toLowerCase().replace(/[^a-z0-9]/g, "")));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseRows(sheet: XLSX.WorkSheet): ParsedRow[] {
  const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (json.length < 2) return [];

  const headers = json[0].map(String);

  // Detect columns
  const iHouseholdName = findCol(headers, "Household Name", "HouseholdName", "Family Name");
  const iAddr1 = findCol(headers, "Address Line 1", "Address", "Street", "AddressLine1");
  const iAddr2 = findCol(headers, "Address Line 2", "AddressLine2", "Apt");
  const iCity = findCol(headers, "City");
  const iState = findCol(headers, "State");
  const iZip = findCol(headers, "Zip", "Zip Code", "ZipCode", "Postal");
  const iCountry = findCol(headers, "Country");

  // Name columns (Minted style: "Name 1 First", "Name 1 Last", "Name 2 First", etc.)
  const iN1First = findCol(headers, "Name 1 First", "Name1First", "First Name", "FirstName");
  const iN1Last = findCol(headers, "Name 1 Last", "Name1Last", "Last Name", "LastName");
  const iN2First = findCol(headers, "Name 2 First", "Name2First");
  const iN2Last = findCol(headers, "Name 2 Last", "Name2Last");

  // Birthday columns
  const iBday1 = findCol(headers, "Birthday 1", "Birthday", "DOB");
  const iBday2 = findCol(headers, "Birthday 2");

  // Email/Phone
  const iEmail = findCol(headers, "Email", "E-mail");
  const iPhone = findCol(headers, "Phone", "Telephone");

  const results: ParsedRow[] = [];
  for (let r = 1; r < json.length; r++) {
    const row = json[r];
    if (!row || row.every((c) => !c)) continue;

    const contacts: AddressContact[] = [];
    const n1f = iN1First >= 0 ? String(row[iN1First] || "") : "";
    const n1l = iN1Last >= 0 ? String(row[iN1Last] || "") : "";
    if (n1f || n1l) {
      contacts.push({
        first_name: n1f,
        last_name: n1l,
        email: iEmail >= 0 ? String(row[iEmail] || "") || null : null,
        phone: iPhone >= 0 ? String(row[iPhone] || "") || null : null,
        birthday: iBday1 >= 0 && row[iBday1] ? String(row[iBday1]) : null,
        is_primary: true,
      });
    }
    const n2f = iN2First >= 0 ? String(row[iN2First] || "") : "";
    const n2l = iN2Last >= 0 ? String(row[iN2Last] || "") : "";
    if (n2f || n2l) {
      contacts.push({
        first_name: n2f,
        last_name: n2l,
        email: null,
        phone: null,
        birthday: iBday2 >= 0 && row[iBday2] ? String(row[iBday2]) : null,
        is_primary: false,
      });
    }

    const householdName =
      iHouseholdName >= 0 && row[iHouseholdName]
        ? String(row[iHouseholdName])
        : contacts.length > 0
        ? `The ${contacts[0].last_name || "Unknown"} Family`
        : "Unknown";

    results.push({
      household_name: householdName,
      address_line_1: iAddr1 >= 0 ? String(row[iAddr1] || "") : "",
      address_line_2: iAddr2 >= 0 ? String(row[iAddr2] || "") : "",
      city: iCity >= 0 ? String(row[iCity] || "") : "",
      state: iState >= 0 ? String(row[iState] || "") : "",
      zip: iZip >= 0 ? String(row[iZip] || "") : "",
      country: iCountry >= 0 ? String(row[iCountry] || "") : "US",
      contacts,
    });
  }
  return results;
}

export function AddressBookUpload({ open, onClose, onImport }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      setParsed(parseRows(sheet));
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    await onImport(parsed);
    setImporting(false);
    setParsed([]);
    setFileName("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setParsed([]); setFileName(""); } }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-[hsl(var(--bg))] border-t border-[var(--glass-border)]">
        <SheetHeader>
          <SheetTitle className="font-serif text-foreground">Import Address Book</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {parsed.length === 0 ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-foreground/20 rounded-xl p-8 cursor-pointer hover:border-foreground/40 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Choose an Excel or CSV file</span>
              <span className="text-xs text-muted-foreground/60 mt-1">Supports Minted format</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            </label>
          ) : (
            <>
              <p className="text-sm text-foreground/80">
                Found <span className="font-medium text-foreground">{parsed.length}</span> households in{" "}
                <span className="text-muted-foreground">{fileName}</span>
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {parsed.slice(0, 20).map((row, i) => (
                  <div key={i} className="p-2 rounded-lg bg-foreground/5 border border-foreground/10 text-sm">
                    <p className="font-medium text-foreground">{row.household_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {[row.address_line_1, row.city, row.state, row.zip].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-muted-foreground/60 text-xs">
                      {row.contacts.map((c) => `${c.first_name} ${c.last_name}`).join(", ")}
                    </p>
                  </div>
                ))}
                {parsed.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">…and {parsed.length - 20} more</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setParsed([]); setFileName(""); }} className="flex-1">
                  Cancel
                </Button>
                <Button variant="cta" onClick={handleImport} disabled={importing} className="flex-1">
                  {importing ? "Importing…" : `Import ${parsed.length} entries`}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
