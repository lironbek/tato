-- First, let's check and assign the current user as owner
-- Get current user and assign owner role if not exists
DO $$
BEGIN
  -- Check if current user exists in user_roles, if not add as owner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
  ) THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES ('d1e0c5a3-2c45-47cd-9f62-11fea221ccf8', 'owner', 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8');
  END IF;
END $$;