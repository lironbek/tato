-- Create table for form invitations
CREATE TABLE public.form_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('whatsapp', 'sms')),
  status TEXT CHECK (status IN ('sent', 'opened', 'completed')) DEFAULT 'sent',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.form_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for form invitations
CREATE POLICY "Users can manage their own form invitations" 
ON public.form_invitations 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow public access to view invitations by token (for the form filling)
CREATE POLICY "Public can view invitations by token" 
ON public.form_invitations 
FOR SELECT 
USING (expires_at > now());

-- Add source tracking to clients table
ALTER TABLE public.clients 
ADD COLUMN source TEXT DEFAULT 'manual',
ADD COLUMN invitation_token TEXT REFERENCES public.form_invitations(invitation_token);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_form_invitations_updated_at
BEFORE UPDATE ON public.form_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_form_invitations_user_id ON public.form_invitations(user_id);
CREATE INDEX idx_form_invitations_token ON public.form_invitations(invitation_token);
CREATE INDEX idx_form_invitations_expires_at ON public.form_invitations(expires_at);
CREATE INDEX idx_clients_invitation_token ON public.clients(invitation_token);