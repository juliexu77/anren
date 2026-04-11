
-- Address book entries (one row per household/address)
CREATE TABLE public.address_book_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  household_name TEXT NOT NULL DEFAULT '',
  address_line_1 TEXT NOT NULL DEFAULT '',
  address_line_2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.address_book_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.address_book_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own entries" ON public.address_book_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.address_book_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.address_book_entries FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_address_book_entries_updated_at
  BEFORE UPDATE ON public.address_book_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Address book contacts (one row per person within a household)
CREATE TABLE public.address_book_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.address_book_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  birthday DATE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.address_book_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.address_book_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own contacts" ON public.address_book_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.address_book_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.address_book_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_address_book_contacts_updated_at
  BEFORE UPDATE ON public.address_book_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_address_book_entries_user_id ON public.address_book_entries(user_id);
CREATE INDEX idx_address_book_contacts_entry_id ON public.address_book_contacts(entry_id);
CREATE INDEX idx_address_book_contacts_user_id ON public.address_book_contacts(user_id);
