
-- Allow users to read their own roles (fixes blank screen for guests)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Remove plain-text secret_key and api_key from payment_settings
-- These should be stored as Lovable Cloud secrets, not in the database
ALTER TABLE public.payment_settings DROP COLUMN IF EXISTS secret_key;
ALTER TABLE public.payment_settings DROP COLUMN IF EXISTS api_key;
