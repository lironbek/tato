-- Remove all existing constraints on role column
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS valid_role_check;

-- Update existing roles to new format
UPDATE public.user_roles SET role = 'administrator' WHERE role IN ('owner', 'admin');
UPDATE public.user_roles SET role = 'מנהל מערכת' WHERE role = 'manager';
UPDATE public.user_roles SET role = 'מנהל' WHERE role = 'moderator';
UPDATE public.user_roles SET role = 'צופה' WHERE role IN ('user', 'viewer');

-- Now add the new constraint
ALTER TABLE public.user_roles 
ADD CONSTRAINT valid_role_check CHECK (role IN ('administrator', 'מנהל מערכת', 'מנהל', 'צופה'));