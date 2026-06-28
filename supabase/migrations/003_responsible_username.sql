-- Username login for responsibles (no real email required)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles (username)
  WHERE username IS NOT NULL;

COMMENT ON COLUMN public.profiles.username IS
  'Login slug for responsibles (e.g. resp-la-plaza-01). Nullable for admins.';
