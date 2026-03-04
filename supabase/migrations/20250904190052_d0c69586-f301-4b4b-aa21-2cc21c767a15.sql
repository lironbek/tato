-- Fix infinite recursion in user_roles RLS policies
DROP POLICY IF EXISTS "Owners and managers can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT AS $$
  SELECT role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to check if user has manager or owner role
CREATE OR REPLACE FUNCTION public.is_manager_or_owner(user_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('owner', 'manager')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create new RLS policies using security definer functions
CREATE POLICY "Owners and managers can manage roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_manager_or_owner(auth.uid()));

CREATE POLICY "Users can view roles in their business" 
ON public.user_roles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  public.is_manager_or_owner(auth.uid())
);