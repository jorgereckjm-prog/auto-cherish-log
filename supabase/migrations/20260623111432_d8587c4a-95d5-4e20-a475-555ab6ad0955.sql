DROP POLICY IF EXISTS "Authenticated insert logs" ON public.audit_logs;

CREATE POLICY "Admins insert logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));