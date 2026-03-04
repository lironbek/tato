-- Enable password leak protection for better security
-- This will prevent users from using commonly leaked passwords
UPDATE auth.config 
SET leaked_password_protection = true;