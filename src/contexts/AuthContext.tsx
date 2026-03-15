import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { auth as authApi } from "@/lib/api";

export type AppRole = "admin" | "learner";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  isAdmin: false,
  profile: null,
  signOut: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<{ user: AuthUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setSession(null);
      setRoles([]);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.session();
      if (data.user) {
        setUser(data.user);
        setSession({ user: data.user });
        setRoles((data.roles ?? []) as AppRole[]);
        setProfile(data.profile ?? null);
      } else {
        localStorage.removeItem("token");
        setUser(null);
        setSession(null);
        setRoles([]);
        setProfile(null);
      }
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      setSession(null);
      setRoles([]);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signOut = useCallback(async () => {
    localStorage.removeItem("token");
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  }, []);

  const isAdmin = roles.includes("admin");

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, profile, signOut, refreshSession: loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}
