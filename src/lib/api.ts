const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const { body, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : init.body,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? res.statusText ?? "Request failed");
  return data as T;
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string; full_name: string | null; avatar_url: string | null } }>("/api/auth/login", { method: "POST", body: { email, password } }),
  signup: (email: string, password: string, full_name?: string) =>
    api<{ token: string; user: { id: string; email: string; full_name: string | null; avatar_url: string | null } }>("/api/auth/signup", { method: "POST", body: { email, password, full_name } }),
  session: () =>
    api<{ user: { id: string; email: string } | null; profile: { full_name: string | null; avatar_url: string | null } | null; roles: string[] }>("/api/auth/session"),
  updatePassword: (password: string) =>
    api<{ message: string }>("/api/auth/update-password", { method: "PATCH", body: { password } }),
};

export const users = {
  me: () => api<{ id: string; email: string; full_name: string | null; avatar_url: string | null }>("/api/users/me"),
  updateMe: (data: { full_name?: string; avatar_url?: string }) =>
    api<{ message: string }>("/api/users/me", { method: "PATCH", body: data }),
};

export const data = {
  assertions: () => api<any[]>("/api/data/assertions"),
  createAssertion: (body: { recipient_id: string; badge_class_id: string; evidence_url?: string; issued_at?: string }) =>
    api<{ id: string }>("/api/data/assertions", { method: "POST", body }),
  issuers: () => api<any[]>("/api/data/issuers"),
  createIssuer: (body: { name: string; description?: string; email?: string; website?: string; logo_url?: string }) =>
    api<{ id: string }>("/api/data/issuers", { method: "POST", body }),
  updateIssuer: (id: string, body: Partial<{ name: string; description: string; email: string; website: string; logo_url: string }>) =>
    api("/api/data/issuers/" + id, { method: "PATCH", body }),
  deleteIssuer: (id: string) => api("/api/data/issuers/" + id, { method: "DELETE" }),
  badgeClasses: () => api<any[]>("/api/data/badge-classes"),
  createBadgeClass: (body: { issuer_id: string; name: string; description?: string; image_url?: string; criteria?: string; expiry_days?: number }) =>
    api<{ id: string }>("/api/data/badge-classes", { method: "POST", body }),
  updateBadgeClass: (id: string, body: Partial<{ name: string; description: string; image_url: string; criteria: string; expiry_days: number; issuer_id: string }>) =>
    api("/api/data/badge-classes/" + id, { method: "PATCH", body }),
  deleteBadgeClass: (id: string) => api("/api/data/badge-classes/" + id, { method: "DELETE" }),
};

export const admin = {
  assertions: () => api<any[]>("/api/admin/assertions"),
  assertionUpdate: (id: string, body: { revoked?: boolean; revocation_reason?: string }) =>
    api("/api/data/assertions/" + id, { method: "PATCH", body }),
  assertionDelete: (id: string) => api("/api/data/assertions/" + id, { method: "DELETE" }),
  dashboardStats: () => api<{ total_badges: number; active_assertions: number; revoked_assertions: number; total_learners: number; chart_data: any[]; recent: any[] }>("/api/admin/dashboard-stats"),
  learners: () => api<any[]>("/api/admin/learners"),
  auditLogs: () => api<any[]>("/api/admin/audit-logs"),
  webhooks: () => api<any[]>("/api/admin/webhooks"),
  createWebhook: (body: { url: string; events?: string[]; secret?: string }) =>
    api<{ id: string }>("/api/admin/webhooks", { method: "POST", body }),
  updateWebhook: (id: string, body: { active: boolean }) =>
    api("/api/admin/webhooks/" + id, { method: "PATCH", body }),
  deleteWebhook: (id: string) => api("/api/admin/webhooks/" + id, { method: "DELETE" }),
  apiKeys: () => api<any[]>("/api/admin/api-keys"),
  createApiKey: (name: string) => api<{ id: string; key: string; key_prefix: string }>("/api/admin/api-keys", { method: "POST", body: { name } }),
  revokeApiKey: (id: string) => api("/api/admin/api-keys/" + id, { method: "PATCH" }),
};

export const verify = {
  assertion: (assertionId: string) =>
    api<{ assertion: any; badge_class: any; issuer: any; recipient: any; view_count: number }>("/api/verify/" + assertionId),
  recordView: (assertionId: string) =>
    api<{ id: string }>("/api/views/record", { method: "POST", body: { assertion_id: assertionId } }),
};

export const invites = {
  getByToken: (token: string) =>
    api<{ id: string; badge_class_id: string; status: string; masked_email: string; evidence_url?: string; badge_classes: any; issuer: any }>("/api/invites/" + token),
  claim: (inviteId: string) =>
    api<{ id: string }>("/api/invites/claim", { method: "POST", body: { invite_id: inviteId } }),
};

export const notifications = {
  list: () => api<any[]>("/api/notifications"),
  markRead: (id: string) => api("/api/notifications", { method: "PATCH", body: { id } }),
  markAllRead: () => api("/api/notifications", { method: "PATCH", body: { mark_all: true } }),
};

export const profile = {
  getPublic: (userId: string) =>
    api<{ profile: any; assertions: any[]; totalViews: number }>("/api/profile/" + userId),
};

export function getUploadUrl(bucket: string): string {
  return `${API_BASE}/api/upload?bucket=${bucket}`;
}

export function uploadFile(bucket: string, file: File): Promise<{ publicUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = (reader.result as string).split(",")[1];
      api<{ publicUrl: string }>("/api/upload?bucket=" + bucket, {
        method: "POST",
        body: { data, filename: file.name },
      })
        .then(resolve)
        .catch(reject);
    };
    reader.readAsDataURL(file);
  });
}
