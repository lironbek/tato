-- Add document content field to store the actual text content
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_content TEXT,
ADD COLUMN IF NOT EXISTS signature_positions JSONB DEFAULT '[]';