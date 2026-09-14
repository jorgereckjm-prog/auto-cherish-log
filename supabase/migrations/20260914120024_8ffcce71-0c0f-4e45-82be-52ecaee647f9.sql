CREATE POLICY "Autenticados enviam comprovantes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comprovantes');
CREATE POLICY "Autenticados leem comprovantes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'comprovantes');
CREATE POLICY "Autenticados removem comprovantes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'comprovantes');