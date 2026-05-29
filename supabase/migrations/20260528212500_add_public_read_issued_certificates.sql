-- Add public select policy to issued_certificates to allow anonymous users to verify certificates by ID
CREATE POLICY "Anyone can read issuance by ID" ON public.issued_certificates
  FOR SELECT TO anon, authenticated
  USING (true);
