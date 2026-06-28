ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.deactivated_at IS
  'Fecha de desactivación del perfil (responsables y admins).';
