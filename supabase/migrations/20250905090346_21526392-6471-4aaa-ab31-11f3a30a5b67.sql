-- Allow phone_number to be NULL since it's optional when just generating a link
ALTER TABLE public.form_invitations 
ALTER COLUMN phone_number DROP NOT NULL;