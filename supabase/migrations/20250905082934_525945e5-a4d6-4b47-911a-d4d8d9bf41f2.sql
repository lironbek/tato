-- Insert default company settings for the current user if not exists
INSERT INTO public.company_settings (user_id, company_name, company_logo_url) 
VALUES ('502f483b-502f-4502-8502-502f483b502f', 'InkFlow CRM', '') 
ON CONFLICT (user_id) DO NOTHING;