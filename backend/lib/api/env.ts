export function getEnv(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

export function requireEnv(name: string): string {
  const v = getEnv(name);
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

