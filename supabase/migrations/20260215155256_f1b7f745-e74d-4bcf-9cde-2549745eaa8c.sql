
-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', true);

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload card images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to card images
CREATE POLICY "Card images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own card images"
ON storage.objects FOR DELETE
USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
