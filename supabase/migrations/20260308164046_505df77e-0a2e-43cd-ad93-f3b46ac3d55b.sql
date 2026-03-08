
-- Badge categories
CREATE TABLE public.badge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.badge_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.badge_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.badge_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Junction: badge_classes <-> categories
CREATE TABLE public.badge_class_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_class_id uuid NOT NULL REFERENCES public.badge_classes(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.badge_categories(id) ON DELETE CASCADE,
  UNIQUE(badge_class_id, category_id)
);
ALTER TABLE public.badge_class_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badge_class_categories" ON public.badge_class_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage badge_class_categories" ON public.badge_class_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Badge views tracking
CREATE TABLE public.badge_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assertion_id uuid NOT NULL REFERENCES public.assertions(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  viewer_hash text
);
ALTER TABLE public.badge_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert views" ON public.badge_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view badge_views" ON public.badge_views FOR SELECT TO anon, authenticated USING (true);

-- Allow public (anon) to view assertions, badge_classes, issuers, profiles for public profile page
DROP POLICY IF EXISTS "Anyone can view assertions" ON public.assertions;
CREATE POLICY "Anyone can view assertions" ON public.assertions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view badge classes" ON public.badge_classes;
CREATE POLICY "Anyone can view badge classes" ON public.badge_classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view issuers" ON public.issuers;
CREATE POLICY "Anyone can view issuers" ON public.issuers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);

-- Make categories and badge_class_categories also viewable by anon for public pages
DROP POLICY IF EXISTS "Anyone can view categories" ON public.badge_categories;
CREATE POLICY "Anyone can view categories" ON public.badge_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view badge_class_categories" ON public.badge_class_categories;
CREATE POLICY "Anyone can view badge_class_categories" ON public.badge_class_categories FOR SELECT USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
