-- Add phrase column to certificates table
ALTER TABLE public.certificates ADD COLUMN phrase TEXT NOT NULL DEFAULT 'concluiu com êxito o curso';
