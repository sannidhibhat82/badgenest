
-- Audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

-- Badge invites table for self-claim flow
CREATE TABLE public.badge_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  badge_class_id uuid NOT NULL REFERENCES public.badge_classes(id) ON DELETE CASCADE,
  evidence_url text,
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  claimed_by uuid,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
ALTER TABLE public.badge_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage invites" ON public.badge_invites FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view invites by token" ON public.badge_invites FOR SELECT USING (true);
CREATE POLICY "Authenticated users can claim invites" ON public.badge_invites FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
