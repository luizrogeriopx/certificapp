
-- Roles enum & table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  course_name TEXT NOT NULL,
  location TEXT NOT NULL,
  event_date DATE NOT NULL,
  background_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX certificates_slug_idx ON public.certificates(slug);
CREATE INDEX certificates_owner_idx ON public.certificates(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT SELECT ON public.certificates TO anon;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read certificates" ON public.certificates
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin owners insert" ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners update" ON public.certificates
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners delete" ON public.certificates
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Issued certificates
CREATE TABLE public.issued_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX issued_certificate_idx ON public.issued_certificates(certificate_id);

GRANT SELECT, INSERT ON public.issued_certificates TO authenticated;
GRANT INSERT ON public.issued_certificates TO anon;
GRANT ALL ON public.issued_certificates TO service_role;

ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert issuance" ON public.issued_certificates
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Owners read issuances" ON public.issued_certificates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = certificate_id AND c.owner_id = auth.uid()
  ));

-- Storage bucket for certificate backgrounds (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-backgrounds', 'certificate-backgrounds', true);

CREATE POLICY "Public read backgrounds" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'certificate-backgrounds');

CREATE POLICY "Admins upload backgrounds" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificate-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update backgrounds" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificate-backgrounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete backgrounds" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificate-backgrounds' AND public.has_role(auth.uid(), 'admin'));
