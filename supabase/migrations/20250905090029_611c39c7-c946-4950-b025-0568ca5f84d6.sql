-- Update RLS policies for form_invitations to work with mock authentication
DROP POLICY IF EXISTS "Users can manage their own form invitations" ON public.form_invitations;
DROP POLICY IF EXISTS "Public can view invitations by token" ON public.form_invitations;

-- Allow anyone to insert invitations (since we're using mock auth)
CREATE POLICY "Anyone can create form invitations" 
ON public.form_invitations 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to view their own invitations by user_id
CREATE POLICY "Anyone can view form invitations by user_id" 
ON public.form_invitations 
FOR SELECT 
USING (true);

-- Allow anyone to update invitation status
CREATE POLICY "Anyone can update form invitations" 
ON public.form_invitations 
FOR UPDATE 
USING (true);

-- Allow public access to invitations by token (for the public form)
CREATE POLICY "Public can view invitations by token" 
ON public.form_invitations 
FOR SELECT 
USING (expires_at > now());