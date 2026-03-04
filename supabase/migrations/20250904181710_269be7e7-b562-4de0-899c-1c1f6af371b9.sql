-- Create artists table
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  phone TEXT,
  email TEXT,
  specialties TEXT[], -- Array of specialties like ['tattoo', 'piercing']
  experience_years INTEGER,
  portfolio_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own artists" 
ON public.artists 
FOR ALL 
USING (auth.uid() = user_id);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'artist', 'receptionist')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view roles in their business" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owners and managers can manage roles" 
ON public.user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'manager')
  )
);

-- Create system_users view to get user details with roles
CREATE OR REPLACE VIEW public.system_users AS
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
GROUP BY p.user_id, p.full_name, p.email, p.phone, p.business_name, p.created_at, p.updated_at;

-- Add trigger for artists table
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for user_roles table
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update appointments table to reference artists
ALTER TABLE public.appointments 
ADD COLUMN artist_id UUID REFERENCES public.artists(id);

-- Create index for better performance
CREATE INDEX idx_artists_user_id ON public.artists(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_appointments_artist_id ON public.appointments(artist_id);