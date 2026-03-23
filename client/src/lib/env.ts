/** Backend origin for API + uploads. Set `VITE_API_URL` in `.env` / `.env.production`. */
export function getApiBase(): string {
  const v = import.meta.env.VITE_API_URL;
  const s = typeof v === "string" ? v.trim() : "";
  if (s) return s.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3001";
  throw new Error("VITE_API_URL must be set for production builds (see .env.example at repo root).");
}

export const API_BASE = getApiBase();
