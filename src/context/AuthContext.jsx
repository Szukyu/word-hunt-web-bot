import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

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
    const virtualEmail = `${username.toLowerCase()}@wordhunt.internal`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: virtualEmail,
      password: password,
      options: { data: { username } },
    });

    if (authError) throw authError;

    // profiles row is auto-created by handle_new_user trigger;
    // also insert into legacy `users` for back-compat (migration syncs both)
    // best-effort: ignore duplicate/conflict errors
    if (authData.user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: authData.user.id, username }], { onConflict: 'id' });

      // non-fatal: trigger may have already created it
      if (profileError && profileError.code !== '23505') {
        console.warn('[auth] profile upsert warning', profileError.message)
      }
    }

    return authData;
  };

  const signIn = async (username, password) => {
    const virtualEmail = `${username.toLowerCase()}@wordhunt.internal`;
    
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
