import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  isAdmin: false,
  profile: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  // Track which user ID we've already fetched to prevent duplicates
  const fetchedUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string) => {
    // Skip if we already fetched for this user
    if (fetchedUserIdRef.current === userId) return;
    fetchedUserIdRef.current = userId;

    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name, avatar_url").eq("user_id", userId).single(),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role));
    if (profileRes.data) setProfile(profileRes.data);
  }, []);

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
      initializedRef.current = true;
    });

    // Then listen for changes (won't double-fetch due to fetchedUserIdRef)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Reset ref on sign-out/sign-in cycle
          if (_event === "SIGNED_IN") {
            fetchedUserIdRef.current = null;
          }
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          fetchedUserIdRef.current = null;
          setRoles([]);
          setProfile(null);
        }
        if (initializedRef.current) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin");

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
