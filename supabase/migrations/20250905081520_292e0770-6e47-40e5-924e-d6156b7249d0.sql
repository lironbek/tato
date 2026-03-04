-- Update RLS policies for clients table to be more permissive
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;

CREATE POLICY "Anyone can manage clients" 
ON public.clients 
FOR ALL 
USING (true);

-- Update other relevant tables
DROP POLICY IF EXISTS "Users can manage their own appointments" ON public.appointments;
CREATE POLICY "Anyone can manage appointments" 
ON public.appointments 
FOR ALL 
USING (true);

DROP POLICY IF EXISTS "Users can manage their own artists" ON public.artists;
CREATE POLICY "Anyone can manage artists" 
ON public.artists 
FOR ALL 
USING (true);

DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;
CREATE POLICY "Anyone can manage documents" 
ON public.documents 
FOR ALL 
USING (true);

DROP POLICY IF EXISTS "Users can manage their own gallery" ON public.gallery;
CREATE POLICY "Anyone can manage gallery" 
ON public.gallery 
FOR ALL 
USING (true);

DROP POLICY IF EXISTS "Users can manage their own inventory" ON public.inventory;
CREATE POLICY "Anyone can manage inventory" 
ON public.inventory 
FOR ALL 
USING (true);

DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
CREATE POLICY "Anyone can manage payments" 
ON public.payments 
FOR ALL 
USING (true);

DROP POLICY IF EXISTS "Users can manage their own services" ON public.services;
CREATE POLICY "Anyone can manage services" 
ON public.services 
FOR ALL 
USING (true);