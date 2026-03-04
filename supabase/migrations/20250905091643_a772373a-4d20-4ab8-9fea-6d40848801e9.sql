-- Remove the foreign key constraint that's causing the error
-- This allows the mock authentication system to work
ALTER TABLE form_invitations DROP CONSTRAINT form_invitations_user_id_fkey;