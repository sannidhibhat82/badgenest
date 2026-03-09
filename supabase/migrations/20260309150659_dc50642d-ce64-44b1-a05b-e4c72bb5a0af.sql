
-- Phase 1: Performance indexes for scale (50K users, 300K badges)

-- Assertions table indexes
CREATE INDEX IF NOT EXISTS idx_assertions_recipient_id ON public.assertions (recipient_id);
CREATE INDEX IF NOT EXISTS idx_assertions_badge_class_id ON public.assertions (badge_class_id);
CREATE INDEX IF NOT EXISTS idx_assertions_issued_at ON public.assertions (issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_assertions_revoked ON public.assertions (revoked);
CREATE INDEX IF NOT EXISTS idx_assertions_recipient_revoked ON public.assertions (recipient_id, revoked);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);

-- Badge invites index
CREATE INDEX IF NOT EXISTS idx_badge_invites_email ON public.badge_invites (email);
CREATE INDEX IF NOT EXISTS idx_badge_invites_badge_class_id ON public.badge_invites (badge_class_id);

-- Profile tags index
CREATE INDEX IF NOT EXISTS idx_profile_tags_profile_user_id ON public.profile_tags (profile_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tags_tag_id ON public.profile_tags (tag_id);
