-- Add cpf and email columns to issued_certificates table
ALTER TABLE public.issued_certificates ADD COLUMN cpf TEXT;
ALTER TABLE public.issued_certificates ADD COLUMN email TEXT;
