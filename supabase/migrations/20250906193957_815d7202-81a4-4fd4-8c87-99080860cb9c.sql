-- Remove all existing roles for the user
DELETE FROM user_roles WHERE user_id = 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8';

-- Add only administrator role for לירון בקמן
INSERT INTO user_roles (user_id, role, created_by)
VALUES ('d1e0c5a3-2c45-47cd-9f62-11fea221ccf8', 'administrator', 'd1e0c5a3-2c45-47cd-9f62-11fea221ccf8');