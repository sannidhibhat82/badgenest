import { api } from "@/lib/api";

export async function logAuditAction(
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    await api("/api/admin/audit-logs", {
      method: "POST",
      body: { action, entity_type: entityType, entity_id: entityId, details },
    });
  } catch {
    // Audit is best-effort
  }
}
