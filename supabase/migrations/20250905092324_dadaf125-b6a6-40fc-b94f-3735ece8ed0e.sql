-- Add status column to clients table for approval workflow
-- Create enum for client statuses
CREATE TYPE public.client_status AS ENUM ('pending', 'active', 'inactive');

-- Add status column to clients table
ALTER TABLE public.clients 
ADD COLUMN status client_status DEFAULT 'active';

-- Create index for better performance on status queries
CREATE INDEX idx_clients_status ON public.clients(status);

-- Add comment to explain the status field
COMMENT ON COLUMN public.clients.status IS 'Client approval status: pending (awaiting approval), active (approved and visible), inactive (deactivated)';

-- Update existing clients to have 'active' status
UPDATE public.clients SET status = 'active' WHERE status IS NULL;