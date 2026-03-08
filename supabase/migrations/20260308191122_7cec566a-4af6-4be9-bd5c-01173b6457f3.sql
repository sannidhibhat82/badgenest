
-- 1. Fix badge_invites RLS: drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.badge_invites;
DROP POLICY IF EXISTS "Authenticated users can claim invites" ON public.badge_invites;

-- Allow SELECT only for admins or the invited user (by email match)
CREATE POLICY "Admins or invited user can view invites"
ON public.badge_invites FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow UPDATE (claim) only when the invite email matches the user's email
CREATE POLICY "Users can claim own invites"
ON public.badge_invites FOR UPDATE
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create a security definer function to look up an invite by token (for unauthenticated claim page)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE(
  id uuid,
  badge_class_id uuid,
  status text,
  masked_email text,
  evidence_url text,
  badge_name text,
  badge_description text,
  badge_image_url text,
  issuer_name text,
  issuer_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bi.id,
    bi.badge_class_id,
    bi.status,
    LEFT(bi.email, 1) || '***@' || SPLIT_PART(bi.email, '@', 2) as masked_email,
    bi.evidence_url,
    bc.name as badge_name,
    bc.description as badge_description,
    bc.image_url as badge_image_url,
    i.name as issuer_name,
    i.logo_url as issuer_logo_url
  FROM badge_invites bi
  LEFT JOIN badge_classes bc ON bc.id = bi.badge_class_id
  LEFT JOIN issuers i ON i.id = bc.issuer_id
  WHERE bi.invite_token = _token
  LIMIT 1;
$$;
