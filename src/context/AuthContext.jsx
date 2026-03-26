import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const SALT_ROUNDS = 10;

  useEffect(() => {
    const storedUser = localStorage.getItem('wordhunt_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signUp = async (username, password) => {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      throw new Error('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from('users')
      .insert([{ username, password: hashedPassword }])
      .select()
      .single();

    if (error) throw error;

    const user = { id: data.id, username: data.username };
    setUser(user);
    localStorage.setItem('wordhunt_user', JSON.stringify(user));
    return data;
  };

  const signIn = async (username, password) => {
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !userData) {
      throw new Error('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    const user = { id: userData.id, username: userData.username };
    setUser(user);
    localStorage.setItem('wordhunt_user', JSON.stringify(user));
    return userData;
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('wordhunt_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
