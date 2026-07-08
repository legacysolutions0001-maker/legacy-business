import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getMe, logout as doLogout, clearAllAuthData, type AuthUser, type AuthCompany } from "../lib/auth";
import { queryClient } from "../lib/queryClient";

interface AuthState {
  user: AuthUser | null;
  company: AuthCompany | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: AuthUser, company?: AuthCompany) => void;
}

const AuthContext = createContext<AuthState>({
  user: null, company: null, isLoading: true, isAuthenticated: false, isSuperAdmin: false,
  refresh: async () => {}, logout: async () => {}, setAuth: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // This ref prevents a race condition where logout clears auth but
  // an in-flight getMe() call then sets it again (the "logout → re-login" bug)
  const isLoggingOut = useRef(false);

  const refresh = useCallback(async () => {
    if (isLoggingOut.current) return;
    setIsLoading(true);
    try {
      const data = await getMe();
      if (isLoggingOut.current) return; // Check again after async call
      if (data) {
        setUser(data.user);
        setCompany(data.company ?? null);
      } else {
        setUser(null);
        setCompany(null);
        clearAllAuthData();
      }
    } catch {
      if (isLoggingOut.current) return;
      setUser(null);
      setCompany(null);
      clearAllAuthData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    isLoggingOut.current = true;
    // Clear state immediately — before any async operations
    setUser(null);
    setCompany(null);
    queryClient.clear();
    clearAllAuthData();
    try {
      await doLogout();
    } catch {
      // Already cleared locally — ignore network errors
    } finally {
      // Reset flag after a short delay to allow navigation to complete
      setTimeout(() => { isLoggingOut.current = false; }, 1000);
    }
  }, []);

  const setAuth = useCallback((u: AuthUser, c?: AuthCompany) => {
    isLoggingOut.current = false;
    setUser(u);
    setCompany(c ?? null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{
      user, company, isLoading,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === "super_admin",
      refresh, logout, setAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
