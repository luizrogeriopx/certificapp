
-- Tighten issued_certificates insert
DROP POLICY "Anyone can insert issuance" ON public.issued_certificates;
CREATE POLICY "Anyone can insert issuance" ON public.issued_certificates
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) BETWEEN 3 AND 120
    AND EXISTS (SELECT 1 FROM public.certificates c WHERE c.id = certificate_id)
  );

-- Replace broad SELECT on storage.objects with a no-op (public bucket serves via public URL)
DROP POLICY "Public read backgrounds" ON storage.objects;
CREATE POLICY "Public read background by name" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'certificate-backgrounds' AND name = name);

-- Revoke public execute on SECURITY DEFINER functions (still callable inside RLS/triggers)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
