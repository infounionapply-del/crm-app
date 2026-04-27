-- Fix user_role ENUM to use 'Sales' instead of 'Sale'
ALTER TYPE user_role RENAME VALUE 'Sale' TO 'Sales';

-- Optional: Update any default values if they are broken
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'Sales'::user_role;
