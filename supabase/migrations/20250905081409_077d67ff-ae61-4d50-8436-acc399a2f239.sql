-- Remove existing RLS policies for company_settings
DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can create their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;

-- Create more permissive policies for company_settings
CREATE POLICY "Anyone can view company settings" 
ON public.company_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update company settings" 
ON public.company_settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete company settings" 
ON public.company_settings 
FOR DELETE 
USING (true);