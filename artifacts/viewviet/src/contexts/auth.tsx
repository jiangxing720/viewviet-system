import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type UserRole = "admin" | "user";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = (import.meta.env.VITE_API_URL as string) || "";

const SESSION_KEY = "viewviet_session_id";

function getSessionHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sid = localStorage.getItem(SESSION_KEY);
  if (sid) headers["x-session-id"] = sid;
  return headers;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: { ...getSessionHeaders(), ...(opts?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

// Export for use by other pages
export { apiFetch, getSessionHeaders, BASE, SESSION_KEY };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(setUser)
      .catch(() => { setUser(null); localStorage.removeItem(SESSION_KEY); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.sessionId) localStorage.setItem(SESSION_KEY, data.sessionId);
    setUser(data);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, displayName?: string) => {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, displayName }),
    });
    if (data.sessionId) localStorage.setItem(SESSION_KEY, data.sessionId);
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === "admin", login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

