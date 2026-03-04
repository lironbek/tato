-- Remove foreign key constraints that are causing the issue
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

-- Also remove the foreign key from profiles table if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Make user_id in clients table not require a foreign key reference
-- This allows the mock authentication system to work