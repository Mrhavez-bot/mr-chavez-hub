import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { authApi } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const userIdRef = useRef(null);

  async function loadProfile(userId, { silent = false } = {}) {
    if (!silent) setLoadingProfile(true);
    try {
      const p = await authApi.getProfile(userId);
      setProfile(p);
    } finally {
      setLoadingProfile(false);
    }
  }

  function handleSession(newSession) {
    const newUserId = newSession?.user?.id ?? null;
    setSession(newSession); // token fresco; no afecta a quien dependa solo del user id

    if (newUserId === userIdRef.current) return; // mismo usuario: no recargar nada

    userIdRef.current = newUserId;
    if (newUserId) loadProfile(newUserId);
    else setProfile(null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => handleSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // setTimeout evita llamar a Supabase dentro del callback (puede bloquearse)
      setTimeout(() => handleSession(newSession), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = {
    session,
    profile,
    loading: session === undefined || (!!session && loadingProfile),
    refreshProfile: () => session && loadProfile(session.user.id, { silent: true }),
    signOut: () => authApi.signOut()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
