import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "worker" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  profile: { full_name: string; phone: string } | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [profile, setProfile] = useState<{ full_name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchRoleAndProfile(userId: string) {
    try {
      console.log("Cargando perfil y rol para:", userId);
      const [roleRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("full_name, phone").eq("user_id", userId).maybeSingle(),
      ]);
      if (roleRes.error) console.error("Error cargando rol:", roleRes.error);
      if (profileRes.error) console.error("Error cargando perfil:", profileRes.error);
      setRole((roleRes.data?.role as AppRole) ?? null);
      setProfile(profileRes.data ?? null);
    } catch (e) {
      console.error("Error en fetchRoleAndProfile:", e);
      setRole(null);
      setProfile(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes — does NOT control loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      console.log("Auth state change:", event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Use setTimeout to avoid deadlock from awaiting inside callback
        setTimeout(() => {
          if (isMounted) fetchRoleAndProfile(currentSession.user.id);
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
      }
    });

    // INITIAL load — controls loading state
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.error("Error obteniendo sesión:", error);
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchRoleAndProfile(initialSession.user.id);
        }
      } catch (e) {
        console.error("Error crítico en initializeAuth:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, profile, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
