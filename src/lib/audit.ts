import { supabase } from "@/integrations/supabase/client";

export async function logAuditAction(
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, any> = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
