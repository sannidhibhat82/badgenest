
-- Fix profiles SELECT: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Authenticated users can view all profiles (needed for badge display, admin views)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Anon can view only non-email fields via a function for public profile page
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.created_at
  FROM profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;
