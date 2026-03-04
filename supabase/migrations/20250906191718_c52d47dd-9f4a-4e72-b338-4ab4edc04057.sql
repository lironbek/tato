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

-- Update get_system_users function to work with new roles
CREATE OR REPLACE FUNCTION public.get_system_users()
RETURNS TABLE(user_id uuid, full_name text, email text, phone text, business_name text, roles text[], created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow managers and owners to see all system users
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid()
    AND role IN ('administrator', 'מנהל מערכת', 'מנהל')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only administrators, system managers and managers can view all users.';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.phone,
    p.business_name,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  GROUP BY p.user_id, p.full_name, p.email, p.phone, p.business_name, p.created_at, p.updated_at
  ORDER BY p.created_at DESC;
END;
$$;