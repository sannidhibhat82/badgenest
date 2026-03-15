export type AppRole = "admin" | "learner";

export interface Issuer {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BadgeClass {
  id: string;
  issuer_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  criteria?: string | null;
  expiry_days?: number | null;
  created_at: string;
  updated_at: string;
  issuer_name?: string;
}
