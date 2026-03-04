-- First, let's create a profile for the current user if it doesn't exist
INSERT INTO public.profiles (user_id, full_name, email)
VALUES ('4da5c58e-4da5-44da-84da-4da5c58e4da5', 'משתמש ראשי', 'a.cybertattoo@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- Check if there are foreign key constraints on clients table pointing to the wrong table
-- If there's a foreign key pointing to auth.users, we need to drop it and recreate it to point to profiles

-- Drop the existing foreign key constraint if it exists (pointing to auth.users)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

-- Add a new foreign key constraint pointing to profiles table
ALTER TABLE public.clients 
ADD CONSTRAINT clients_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;