"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, OrgSummary, PublicUser, setAccessToken } from "./api";

interface AuthState {
  user: PublicUser | null;
  organizations: OrgSummary[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organizations: [],
    loading: true,
  });

  const loadMe = useCallback(async () => {
    const me = await api.me();
    setState({
      user: { id: me.id, email: me.email, name: me.name },
      organizations: me.organizations,
      loading: false,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { accessToken, user } = await api.refresh();
        setAccessToken(accessToken);
        if (cancelled) return;
        setState({ user, organizations: [], loading: false });
        await loadMe();
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setState({ user: null, organizations: [], loading: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user } = await api.login({ email, password });
      setAccessToken(accessToken);
      setState({ user, organizations: [], loading: false });
      await loadMe();
    },
    [loadMe]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      await api.signup({ name, email, password });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setState({ user: null, organizations: [], loading: false });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout, refreshMe: loadMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
