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
import {
  api,
  API_URL,
  MeResponse,
  OrgSummary,
  PublicUser,
  setAccessToken,
  setSessionExpiredHandler,
  trySilentRefresh,
} from "./api";
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
      const { id, email, name, authProvider, avatarUrl, notificationPrefs, emailVerifiedAt } = meQuery.data;
      setUser({ id, email, name, authProvider, avatarUrl, notificationPrefs, emailVerifiedAt });
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
    setUser({
      id: me.id,
      email: me.email,
      name: me.name,
      authProvider: me.authProvider,
      avatarUrl: me.avatarUrl,
      notificationPrefs: me.notificationPrefs,
      emailVerifiedAt: me.emailVerifiedAt,
    });
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

  const forceLogout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      forceLogout();
    }
  }, [forceLogout]);

  const refreshMe = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(forceLogout);
    return () => setSessionExpiredHandler(null);
  }, [forceLogout]);

  useEffect(() => {
    if (!user) return;

    const source = new EventSource(`${API_URL}/auth/events`, { withCredentials: true });

    const onRevoked = () => {
      trySilentRefresh().then((ok) => {
        if (!ok) forceLogout();
      });
    };

    const onAccessChanged = (event: MessageEvent) => {
      let orgId: string | undefined;
      let projectId: string | undefined;
      try {
        const payload = JSON.parse(event.data);
        orgId = payload?.orgId;
        projectId = payload?.projectId;
      } catch {
        /* ignore malformed payload */
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orgProjects(orgId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) });
      }
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projectEnvironments(projectId) });
      }
    };

    const onNotificationCreated = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    };

    source.addEventListener("session-revoked", onRevoked);
    source.addEventListener("access-changed", onAccessChanged);
    source.addEventListener("notification-created", onNotificationCreated);

    return () => {
      source.removeEventListener("session-revoked", onRevoked);
      source.removeEventListener("access-changed", onAccessChanged);
      source.removeEventListener("notification-created", onNotificationCreated);
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, forceLogout]);

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
