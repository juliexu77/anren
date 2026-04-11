import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AddressContact {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  birthday?: string | null;
  is_primary: boolean;
}

export interface AddressEntry {
  id: string;
  household_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  contacts: AddressContact[];
  created_at: string;
  updated_at: string;
}

export function useAddressBook() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AddressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: entryRows, error: eErr } = await supabase
        .from("address_book_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("household_name");
      if (eErr) throw eErr;

      const entryIds = (entryRows || []).map((e: any) => e.id);
      let contactRows: any[] = [];
      if (entryIds.length > 0) {
        const { data, error: cErr } = await supabase
          .from("address_book_contacts")
          .select("*")
          .in("entry_id", entryIds)
          .order("is_primary", { ascending: false });
        if (cErr) throw cErr;
        contactRows = data || [];
      }

      const mapped: AddressEntry[] = (entryRows || []).map((e: any) => ({
        ...e,
        contacts: contactRows.filter((c: any) => c.entry_id === e.id),
      }));
      setEntries(mapped);
    } catch (err: any) {
      toast.error("Failed to load address book");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const saveEntry = useCallback(
    async (
      entry: Omit<AddressEntry, "id" | "created_at" | "updated_at" | "contacts"> & { id?: string },
      contacts: AddressContact[]
    ) => {
      if (!user) return;
      try {
        let entryId = entry.id;
        if (entryId) {
          const { error } = await supabase
            .from("address_book_entries")
            .update({
              household_name: entry.household_name,
              address_line_1: entry.address_line_1,
              address_line_2: entry.address_line_2,
              city: entry.city,
              state: entry.state,
              zip: entry.zip,
              country: entry.country,
            })
            .eq("id", entryId);
          if (error) throw error;

          // Delete old contacts and re-insert
          await supabase.from("address_book_contacts").delete().eq("entry_id", entryId);
        } else {
          const { data, error } = await supabase
            .from("address_book_entries")
            .insert({
              user_id: user.id,
              household_name: entry.household_name,
              address_line_1: entry.address_line_1,
              address_line_2: entry.address_line_2,
              city: entry.city,
              state: entry.state,
              zip: entry.zip,
              country: entry.country,
            })
            .select("id")
            .single();
          if (error) throw error;
          entryId = data.id;
        }

        if (contacts.length > 0) {
          const rows = contacts.map((c) => ({
            entry_id: entryId!,
            user_id: user.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email || null,
            phone: c.phone || null,
            birthday: c.birthday || null,
            is_primary: c.is_primary,
          }));
          const { error: cErr } = await supabase.from("address_book_contacts").insert(rows);
          if (cErr) throw cErr;
        }

        toast.success(entry.id ? "Entry updated" : "Entry added");
        await fetchEntries();
      } catch (err: any) {
        toast.error("Failed to save entry");
      }
    },
    [user, fetchEntries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from("address_book_entries").delete().eq("id", id);
        if (error) throw error;
        toast.success("Entry deleted");
        await fetchEntries();
      } catch {
        toast.error("Failed to delete entry");
      }
    },
    [fetchEntries]
  );

  const bulkImport = useCallback(
    async (
      rows: Array<{
        household_name: string;
        address_line_1: string;
        address_line_2: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        contacts: AddressContact[];
      }>
    ) => {
      if (!user || rows.length === 0) return;
      try {
        for (const row of rows) {
          const { data, error } = await supabase
            .from("address_book_entries")
            .insert({
              user_id: user.id,
              household_name: row.household_name,
              address_line_1: row.address_line_1,
              address_line_2: row.address_line_2,
              city: row.city,
              state: row.state,
              zip: row.zip,
              country: row.country,
            })
            .select("id")
            .single();
          if (error) throw error;

          if (row.contacts.length > 0) {
            const contactRows = row.contacts.map((c) => ({
              entry_id: data.id,
              user_id: user.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email || null,
              phone: c.phone || null,
              birthday: c.birthday || null,
              is_primary: c.is_primary,
            }));
            await supabase.from("address_book_contacts").insert(contactRows);
          }
        }
        toast.success(`Imported ${rows.length} entries`);
        await fetchEntries();
      } catch (err: any) {
        toast.error("Import failed: " + (err.message || "Unknown error"));
      }
    },
    [user, fetchEntries]
  );

  return { entries, loading, saveEntry, deleteEntry, bulkImport, refetch: fetchEntries };
}
