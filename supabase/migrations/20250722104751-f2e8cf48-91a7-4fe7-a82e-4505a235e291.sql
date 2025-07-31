-- Create storage bucket for auction images
INSERT INTO storage.buckets (id, name, public) VALUES ('auction-images', 'auction-images', true);

-- Create policies for auction images
CREATE POLICY "Allow public access to auction images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'auction-images');

CREATE POLICY "Allow authenticated users to upload auction images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'auction-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update their auction images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'auction-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete their auction images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'auction-images' AND auth.uid() IS NOT NULL);