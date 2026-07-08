const BASE = "";
const TOKEN_KEY = "lb_auth_token";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  companyId: number | null;
}

export interface AuthCompany {
  id: number;
  code: string;
  name: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  mobile?: string;
  email?: string;
  logoUrl?: string;
  subscriptionStatus: string;
  subscriptionEnd?: string;
  plan: string;
}

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function clearAllAuthData() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export async function login(username: string, password: string, companyCode?: string): Promise<{ user: AuthUser; company?: AuthCompany }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password, companyCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  if (data.token) setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  clearAllAuthData();
  try {
    await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Ignore errors — local state is cleared regardless
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMe(): Promise<{ user: AuthUser; company?: AuthCompany } | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/me`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearAllAuthData();
      return null;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });
}

/** Like apiFetch but auto-throws with the server's error message on non-2xx.
 *  Use in mutation functions so onError receives the real error message. */
export async function apiJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const e = await res.json(); msg = e.error || e.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
