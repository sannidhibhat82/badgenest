-- Drop the broad SELECT policy on profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));