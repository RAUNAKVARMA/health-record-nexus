const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "hrn_token";
const USER_KEY = "hrn_user";

export type AuthUser = {
  userId: string;
  name: string;
  role: "hospital" | "patient";
  email?: string | null;
  healthId?: string | null;
  accessToken: string;
};

export function getApiUrl() {
  return API_URL;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, user.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let detail = "Request failed";
    if (typeof data === "object" && data && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") detail = d;
      else if (Array.isArray(d)) detail = d.map((x) => x.msg || JSON.stringify(x)).join("; ");
    }
    throw new Error(detail);
  }
  return data as T;
}

type TokenPayload = {
  access_token: string;
  role: "hospital" | "patient";
  user_id: string;
  name: string;
  email?: string | null;
  health_id?: string | null;
};

export function mapToken(data: TokenPayload): AuthUser {
  return {
    accessToken: data.access_token,
    role: data.role,
    userId: data.user_id,
    name: data.name,
    email: data.email,
    healthId: data.health_id,
  };
}
