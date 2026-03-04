-- Update all existing documents to use the current user_id format
-- Since we're using mock authentication, we'll update all documents to the current user
UPDATE documents 
SET user_id = '4da5c58e-4da5-44da-84da-4da5c58e4da5'
WHERE user_id != '4da5c58e-4da5-44da-84da-4da5c58e4da5';