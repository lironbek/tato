-- Add signature-related columns to documents table (only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'signature_request_id') THEN
    ALTER TABLE public.documents ADD COLUMN signature_request_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'signature_status') THEN
    ALTER TABLE public.documents ADD COLUMN signature_status TEXT DEFAULT 'draft';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'signature_url') THEN
    ALTER TABLE public.documents ADD COLUMN signature_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'signed_document_url') THEN
    ALTER TABLE public.documents ADD COLUMN signed_document_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'recipient_email') THEN
    ALTER TABLE public.documents ADD COLUMN recipient_email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'recipient_name') THEN
    ALTER TABLE public.documents ADD COLUMN recipient_name TEXT;
  END IF;
END $$;