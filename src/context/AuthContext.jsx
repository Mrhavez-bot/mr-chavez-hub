import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { authApi } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const lastUserId = useRef(null);

  async function loadProfile(userId) {
    setLoadingProfile(true);
    const p = await authApi.getProfile(userId);
    setProfile(p);
    setLoadingProfile(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        lastUserId.current = data.session.user.id;
        loadProfile(data.session.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const newUserId = newSession?.user?.id || null;
      // Only re-fetch the profile when the actual signed-in user changes
      // (sign in, sign out, switching accounts) — NOT on the silent token
      // refresh Supabase does automatically every time the browser tab
      // regains focus. Re-fetching on every one of those briefly flipped
      // "loading" to true, which flashed the whole app back to a spinner
      // and interrupted whatever the teacher was in the middle of typing.
      if (newUserId !== lastUserId.current) {
        lastUserId.current = newUserId;
        if (newUserId) loadProfile(newUserId);
        else setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = {
    session,
    profile,
    loading: session === undefined || (session && loadingProfile),
    refreshProfile: () => session && loadProfile(session.user.id),
    signOut: () => authApi.signOut()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
