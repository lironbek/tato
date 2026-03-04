-- Update existing data to use the new Supabase user ID
-- First, let's update company_settings
UPDATE company_settings 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update clients
UPDATE clients 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update artists if any
UPDATE artists 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update services if any
UPDATE services 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update appointments if any
UPDATE appointments 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update work_orders if any
UPDATE work_orders 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update payments if any
UPDATE payments 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update documents if any
UPDATE documents 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update gallery if any
UPDATE gallery 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';

-- Update inventory if any
UPDATE inventory 
SET user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8'
WHERE user_id = '502f483b-502f-4502-8502-502f483b502f';