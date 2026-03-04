-- Drop the problematic view
DROP VIEW IF EXISTS public.system_users;

-- Create a safe function instead
CREATE OR REPLACE FUNCTION public.get_system_users()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  roles TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
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
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles owner_check 
    WHERE owner_check.user_id = auth.uid()
    AND owner_check.role IN ('owner', 'manager')
  )
  GROUP BY p.user_id, p.full_name, p.email, p.phone, p.business_name, p.created_at, p.updated_at;
END;
$$;