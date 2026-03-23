import type { Issuer, BadgeClass, User, Webhook, ApiKey, Notification, Assertion, AuditLog } from "@prisma/client";

export function issuerRow(r: Issuer) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    email: r.email,
    website: r.website,
    logo_url: r.logoUrl,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function badgeClassRow(bc: BadgeClass, issuerName: string | null) {
  return {
    id: bc.id,
    issuer_id: bc.issuerId,
    name: bc.name,
    description: bc.description,
    image_url: bc.imageUrl,
    criteria: bc.criteria,
    expiry_days: bc.expiryDays,
    created_at: bc.createdAt,
    updated_at: bc.updatedAt,
    issuer_name: issuerName,
  };
}

export function userLearnerRow(u: Pick<User, "id" | "fullName" | "email" | "avatarUrl" | "createdAt">) {
  return {
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    avatar_url: u.avatarUrl,
    created_at: u.createdAt,
  };
}

export function webhookRow(w: Webhook) {
  return {
    id: w.id,
    url: w.url,
    events: w.events,
    secret: w.secret,
    active: w.active,
    created_by: w.createdBy,
    failure_count: w.failureCount,
    last_triggered_at: w.lastTriggeredAt,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  };
}

export function apiKeyRow(k: Pick<ApiKey, "id" | "keyPrefix" | "name" | "createdAt" | "expiresAt" | "lastUsedAt" | "revoked">) {
  return {
    id: k.id,
    key_prefix: k.keyPrefix,
    name: k.name,
    created_at: k.createdAt,
    expires_at: k.expiresAt,
    last_used_at: k.lastUsedAt,
    revoked: k.revoked,
  };
}

export function notificationRow(n: Notification) {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    read: n.read,
    created_at: n.createdAt,
  };
}

export function auditLogRow(al: AuditLog & { actor: Pick<User, "fullName"> | null }) {
  return {
    id: al.id,
    actor_id: al.actorId,
    action: al.action,
    entity_type: al.entityType,
    entity_id: al.entityId,
    details: al.details,
    created_at: al.createdAt,
    actor_name: al.actor?.fullName ?? null,
  };
}

export function adminAssertionRow(
  a: Assertion & {
    badgeClass: Pick<BadgeClass, "name" | "expiryDays">;
    recipient: Pick<User, "fullName" | "email"> | null;
  }
) {
  return {
    id: a.id,
    badge_class_id: a.badgeClassId,
    recipient_id: a.recipientId,
    issued_at: a.issuedAt,
    expires_at: a.expiresAt,
    revoked: a.revoked,
    revocation_reason: a.revocationReason,
    evidence_url: a.evidenceUrl,
    badge_name: a.badgeClass.name,
    expiry_days: a.badgeClass.expiryDays,
    recipient_name: a.recipient?.fullName ?? null,
    recipient_email: a.recipient?.email ?? null,
  };
}
