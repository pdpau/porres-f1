import { createContext, useContext, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AppUser {
  name: string;
  role: "admin" | "user";
}

interface AuthContextValue {
  user: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (name: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const STORAGE_KEY = "porres_f1_user";

function getStoredUser(): AppUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppUser;
      if (parsed.name && parsed.role) return parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(getStoredUser);

  const login = async (name: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc("login", {
      p_name: name,
      p_password: password,
    });

    if (error) return "Error de connexió";
    if (!data || data.length === 0) return "Nom o contrasenya incorrectes";

    const row = data[0] as { name: string; role: string };
    const appUser: AppUser = { name: row.name, role: row.role as "admin" | "user" };
    setUser(appUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === "admin", loading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
