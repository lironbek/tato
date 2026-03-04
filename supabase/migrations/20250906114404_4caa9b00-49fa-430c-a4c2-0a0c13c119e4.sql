-- Add created_by field to work_orders table to track who created each order
ALTER TABLE public.work_orders 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update existing work orders to set created_by to the user_id for backward compatibility
UPDATE public.work_orders 
SET created_by = user_id 
WHERE created_by IS NULL;