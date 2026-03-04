-- Create storage bucket for documents if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for documents bucket
CREATE POLICY "Users can upload their own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add signature-related columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS signature_request_id TEXT,
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- Create enum for signature status
DROP TYPE IF EXISTS signature_status_enum CASCADE;
CREATE TYPE signature_status_enum AS ENUM ('draft', 'sent', 'signed', 'declined', 'expired');

-- Update the signature_status column to use the enum
ALTER TABLE public.documents 
ALTER COLUMN signature_status TYPE signature_status_enum 
USING signature_status::signature_status_enum;