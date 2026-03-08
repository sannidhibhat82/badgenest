
-- API Keys table for programmatic access
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_by uuid NOT NULL,
  permissions jsonb NOT NULL DEFAULT '["badge.issue","badge.revoke","badge.list","assertion.list"]'::jsonb,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Webhooks table
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{"badge.issued","badge.revoked"}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  last_triggered_at timestamp with time zone,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks" ON public.webhooks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
