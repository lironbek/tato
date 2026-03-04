-- Remove existing storage policies for company-logos
DROP POLICY IF EXISTS "Users can view all company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own company logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own company logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own company logo" ON storage.objects;

-- Create new more permissive policies for company logos
CREATE POLICY "Public can view company logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can upload company logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Anyone can update company logo" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can delete company logo" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-logos');