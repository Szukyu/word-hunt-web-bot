import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// eslint-disable-next-line react-refresh/only-export-components -- helpers are co-located for username-as-email auth
const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

const INTERNAL_DOMAIN = 'wordhunt.internal'

// Username is the only credential — no real emails are collected.
// We synthesize a virtual email for Supabase Auth: <username>@wordhunt.internal
export function normalizeUsername(input) {
  return String(input ?? '').trim().toLowerCase()
}

export function validateUsername(input) {
  const u = normalizeUsername(input)
  if (u.length < 3 || u.length > 20) {
    throw new Error('Username must be 3-20 characters')
  }
  if (!/^[a-z0-9_]+$/.test(u)) {
    throw new Error('Username can only use letters, numbers, and underscores (no spaces or @)')
  }
  if (u.includes('@')) {
    throw new Error('Do not use an email — just a username')
  }
  return u
}

export function toVirtualEmail(username) {
  const u = validateUsername(username)
  return `${u}@${INTERNAL_DOMAIN}`
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for login/logout changes automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (username, password) => {
    const normalized = validateUsername(username)
    const virtualEmail = `${normalized}@${INTERNAL_DOMAIN}`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: virtualEmail,
      password: password,
      options: { data: { username: normalized } },
    });

    if (authError) throw authError;

    // profiles row is auto-created by handle_new_user trigger;
    // also insert into legacy `users` for back-compat (migration syncs both)
    // best-effort: ignore duplicate/conflict errors
    if (authData.user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: authData.user.id, username: normalized }], { onConflict: 'id' });

      // non-fatal: trigger may have already created it
      if (profileError && profileError.code !== '23505') {
        console.warn('[auth] profile upsert warning', profileError.message)
      }
    }

    return authData;
  };

  const signIn = async (username, password) => {
    const normalized = validateUsername(username)
    const virtualEmail = `${normalized}@${INTERNAL_DOMAIN}`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password,
    });

    if (error) throw error;
    return data;
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
