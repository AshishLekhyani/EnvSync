"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, MeResponse, OrgSummary, PublicUser, setAccessToken } from "./api";
import { queryKeys } from "./query-keys";

const ACTIVE_ORG_STORAGE_KEY = "envsync.activeOrgId";

interface AuthContextValue {
  user: PublicUser | null;
  organizations: OrgSummary[];
  activeOrgId: string | null;
  activeOrg: OrgSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  switchOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [storedActiveOrgId, setStoredActiveOrgId] = useState<string | null>(
    readStoredActiveOrgId
  );

  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: api.me,
    enabled: !!user,
  });

  const organizations = useMemo(
    () => meQuery.data?.organizations ?? [],
    [meQuery.data]
  );

  useEffect(() => {
    if (meQuery.data) {
      const { id, email, name, authProvider } = meQuery.data;
      setUser({ id, email, name, authProvider });
    }
  }, [meQuery.data]);

  const activeOrgId = useMemo(() => {
    if (storedActiveOrgId && organizations.some((o) => o.id === storedActiveOrgId)) {
      return storedActiveOrgId;
    }
    return organizations[0]?.id ?? null;
  }, [storedActiveOrgId, organizations]);

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === activeOrgId) ?? null,
    [organizations, activeOrgId]
  );

  const switchOrg = useCallback((orgId: string) => {
    setStoredActiveOrgId(orgId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
    }
  }, []);

  const loadMe = useCallback(async () => {
    const me = await api.me();
    setUser({ id: me.id, email: me.email, name: me.name, authProvider: me.authProvider });
    queryClient.setQueryData<MeResponse>(queryKeys.me(), me);
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { accessToken, user: refreshedUser } = await api.refresh();
        setAccessToken(accessToken);
        if (cancelled) return;
        setUser(refreshedUser);
        await loadMe();
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user: loggedInUser } = await api.login({ email, password });
      setAccessToken(accessToken);
      setUser(loggedInUser);
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
      setUser(null);
      queryClient.removeQueries({ queryKey: queryKeys.me() });
    }
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
  }, [queryClient]);

  const loading = bootstrapping || (!!user && meQuery.isPending);

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        activeOrgId,
        activeOrg,
        loading,
        login,
        signup,
        logout,
        refreshMe,
        switchOrg,
      }}
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
