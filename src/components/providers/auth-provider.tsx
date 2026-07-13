"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthUser,
  apiFetch,
  clearAuth,
  getStoredUser,
  mapToken,
  saveAuth,
} from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (args: {
    identifier: string;
    password: string;
    loginType: "hospital" | "patient";
  }) => Promise<AuthUser>;
  registerHospital: (args: {
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthUser>;
  registerPatient: (args: {
    name: string;
    phoneNumber: string;
    gender: "male" | "female" | "other";
    password: string;
  }) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (args: {
    identifier: string;
    password: string;
    loginType: "hospital" | "patient";
  }) => {
    const data = await apiFetch<Parameters<typeof mapToken>[0]>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: args.identifier,
        password: args.password,
        loginType: args.loginType,
      }),
    });
    const mapped = mapToken(data);
    saveAuth(mapped);
    setUser(mapped);
    return mapped;
  }, []);

  const registerHospital = useCallback(async (args: {
    name: string;
    email: string;
    password: string;
  }) => {
    const data = await apiFetch<Parameters<typeof mapToken>[0]>(
      "/api/auth/register/hospital",
      {
        method: "POST",
        body: JSON.stringify({
          type: "hospital",
          name: args.name,
          email: args.email,
          password: args.password,
        }),
      }
    );
    const mapped = mapToken(data);
    saveAuth(mapped);
    setUser(mapped);
    return mapped;
  }, []);

  const registerPatient = useCallback(async (args: {
    name: string;
    phoneNumber: string;
    gender: "male" | "female" | "other";
    password: string;
  }) => {
    const data = await apiFetch<Parameters<typeof mapToken>[0]>(
      "/api/auth/register/patient",
      {
        method: "POST",
        body: JSON.stringify({
          type: "patient",
          name: args.name,
          phoneNumber: args.phoneNumber,
          gender: args.gender,
          password: args.password,
        }),
      }
    );
    const mapped = mapToken(data);
    saveAuth(mapped);
    setUser(mapped);
    return mapped;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, registerHospital, registerPatient, logout }),
    [user, loading, login, registerHospital, registerPatient, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
