
CREATE POLICY "audit-evidence read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audit-evidence'
    AND (public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'viewer')
      OR owner = auth.uid()));
CREATE POLICY "audit-evidence insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-evidence' AND owner = auth.uid());
CREATE POLICY "audit-evidence delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audit-evidence'
    AND (public.has_role(auth.uid(),'super_admin') OR owner = auth.uid()));
