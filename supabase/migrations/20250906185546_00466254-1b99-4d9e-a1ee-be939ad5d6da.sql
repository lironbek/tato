-- Update get_system_users function to use profiles table
CREATE OR REPLACE FUNCTION public.get_system_users()
RETURNS TABLE(user_id uuid, full_name text, email text, phone text, business_name text, roles text[], created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow managers and owners to see all system users
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid()
    AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied. Only managers and owners can view all users.';
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
$function$;