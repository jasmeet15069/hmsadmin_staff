-- Fix the audit logs insert policy to be more restrictive
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only authenticated users can insert audit logs (system will use service role for internal operations)
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);