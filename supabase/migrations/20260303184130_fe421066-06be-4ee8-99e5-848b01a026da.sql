
-- Evolve Careers Badge Platform - Full Schema

-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'learner');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'learner',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Issuers
CREATE TABLE public.issuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issuers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view issuers" ON public.issuers FOR SELECT USING (true);
CREATE POLICY "Admins can manage issuers" ON public.issuers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Badge Classes
CREATE TABLE public.badge_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID NOT NULL REFERENCES public.issuers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  criteria TEXT,
  expiry_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.badge_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badge classes" ON public.badge_classes FOR SELECT USING (true);
CREATE POLICY "Admins can manage badge classes" ON public.badge_classes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Assertions (issued badges)
CREATE TABLE public.assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_class_id UUID NOT NULL REFERENCES public.badge_classes(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  evidence_url TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assertions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view assertions" ON public.assertions FOR SELECT USING (true);
CREATE POLICY "Admins can manage assertions" ON public.assertions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. Auto-create profile + learner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_issuers_updated_at BEFORE UPDATE ON public.issuers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_badge_classes_updated_at BEFORE UPDATE ON public.badge_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assertions_updated_at BEFORE UPDATE ON public.assertions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('badge-images', 'badge-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('issuer-logos', 'issuer-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Badge images public read" ON storage.objects FOR SELECT USING (bucket_id = 'badge-images');
CREATE POLICY "Admins upload badge images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'badge-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update badge images" ON storage.objects FOR UPDATE USING (bucket_id = 'badge-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete badge images" ON storage.objects FOR DELETE USING (bucket_id = 'badge-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Issuer logos public read" ON storage.objects FOR SELECT USING (bucket_id = 'issuer-logos');
CREATE POLICY "Admins upload issuer logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issuer-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update issuer logos" ON storage.objects FOR UPDATE USING (bucket_id = 'issuer-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete issuer logos" ON storage.objects FOR DELETE USING (bucket_id = 'issuer-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
