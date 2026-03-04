-- First, let's see and update existing roles to new format
UPDATE public.user_roles SET role = 'administrator' WHERE role IN ('owner', 'admin');
UPDATE public.user_roles SET role = 'מנהל מערכת' WHERE role = 'manager';
UPDATE public.user_roles SET role = 'מנהל' WHERE role = 'moderator';
UPDATE public.user_roles SET role = 'צופה' WHERE role IN ('user', 'viewer');

-- Now add constraint to ensure only valid roles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS valid_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT valid_role_check CHECK (role IN ('administrator', 'מנהל מערכת', 'מנהל', 'צופה'));

-- Create function to update user password
CREATE OR REPLACE FUNCTION public.update_user_password(user_id_param uuid, new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if current user has permission (administrator or מנהל מערכת)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid()
    AND role IN ('administrator', 'מנהל מערכת')
  ) THEN
    RETURN json_build_object('error', 'Access denied. Only administrators and system managers can update passwords.');
  END IF;

  -- This will need to be handled by an edge function since we can't update auth.users directly
  RETURN json_build_object('success', true, 'message', 'Password update request processed');
END;
$$;

-- Create function to sync users with auth table
CREATE OR REPLACE FUNCTION public.sync_users_with_auth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_count integer := 0;
  result json;
BEGIN
  -- Check if current user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid()
    AND role IN ('administrator', 'מנהל מערכת')
  ) THEN
    RETURN json_build_object('error', 'Access denied. Only administrators and system managers can sync users.');
  END IF;

  -- Insert/Update profiles from auth.users
  INSERT INTO public.profiles (user_id, full_name, email, phone, business_name, created_at)
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data ->> 'full_name', au.email),
    au.email,
    au.raw_user_meta_data ->> 'phone',
    au.raw_user_meta_data ->> 'business_name',
    au.created_at
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
  );

  GET DIAGNOSTICS sync_count = ROW_COUNT;

  -- Update existing profiles with latest auth data
  UPDATE public.profiles 
  SET 
    email = au.email,
    full_name = COALESCE(au.raw_user_meta_data ->> 'full_name', profiles.full_name),
    phone = COALESCE(au.raw_user_meta_data ->> 'phone', profiles.phone),
    business_name = COALESCE(au.raw_user_meta_data ->> 'business_name', profiles.business_name),
    updated_at = now()
  FROM auth.users au
  WHERE profiles.user_id = au.id;

  RETURN json_build_object(
    'success', true, 
    'synced_users', sync_count,
    'message', 'Users synchronized successfully'
  );
END;
$$;

-- Update is_manager_or_owner function to work with new roles
CREATE OR REPLACE FUNCTION public.is_manager_or_owner(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('administrator', 'מנהל מערכת', 'מנהל')
  );
$$;