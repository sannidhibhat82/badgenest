
-- Create tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create profile_tags junction table
CREATE TABLE public.profile_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_user_id, tag_id)
);

-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tags ENABLE ROW LEVEL SECURITY;

-- Tags: admins can manage, anyone can view
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT TO authenticated USING (true);

-- Profile tags: admins can manage, anyone can view
CREATE POLICY "Admins can manage profile_tags" ON public.profile_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view profile_tags" ON public.profile_tags FOR SELECT TO authenticated USING (true);

-- Update handle_new_user to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner');
  RETURN NEW;
END;
$$;

-- Backfill existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;
