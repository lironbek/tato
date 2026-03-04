-- Create work_orders table for managing work orders
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  work_order_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  service_id UUID NOT NULL,
  artist_id UUID,
  work_description TEXT,
  estimated_price NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC,
  estimated_duration INTEGER,
  work_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for work orders
CREATE POLICY "Anyone can manage work orders" 
ON public.work_orders 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();