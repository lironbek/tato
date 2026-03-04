-- Add work_order_id column to payments table to link payments to work orders
ALTER TABLE public.payments 
ADD COLUMN work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL;