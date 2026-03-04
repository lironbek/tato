-- Remove foreign key constraint from documents table to work with mock authentication
-- Since the app uses mock auth, we don't need strict foreign key relationships

-- Drop the foreign key constraint on user_id in documents table
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

-- Also remove any foreign key constraints from other tables that might reference auth.users
-- since we're using mock authentication

-- Check and remove foreign key from gallery table if exists
ALTER TABLE public.gallery DROP CONSTRAINT IF EXISTS gallery_user_id_fkey;

-- Check and remove foreign key from other relevant tables
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;
ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_user_id_fkey;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_user_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_user_id_fkey;