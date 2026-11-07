import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setLoading] = useState(true);
  const [authChecked, setChecked] = useState(false);
  const checkUserAuth = useCallback(async () => {
    try { setUser(await base44.auth.me()); } catch { setUser(null); }
    finally { setLoading(false); setChecked(true); }
  }, []);
  useEffect(() => {
    checkUserAuth();
    const listener = supabase?.auth.onAuthStateChange(() => { setTimeout(checkUserAuth, 0); });
    return () => listener?.data.subscription.unsubscribe();
  }, [checkUserAuth]);
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, isLoadingPublicSettings: false, authError: null, appPublicSettings: null, authChecked, checkUserAuth, checkAppState: checkUserAuth, logout: base44.auth.logout, navigateToLogin: base44.auth.redirectToLogin }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
