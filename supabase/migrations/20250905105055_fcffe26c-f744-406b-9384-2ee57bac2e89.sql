-- Update storage policies for documents bucket to work with mock authentication
-- Since the app uses mock auth and documents table has permissive RLS, we'll make storage policies permissive too

-- Drop existing restrictive policies for documents bucket
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create permissive policies for documents bucket to work with mock authentication
CREATE POLICY "Anyone can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents');

CREATE POLICY "Anyone can update documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents');

CREATE POLICY "Anyone can delete documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents');