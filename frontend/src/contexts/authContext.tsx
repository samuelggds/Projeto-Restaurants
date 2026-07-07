/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../Services/api";

type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  restaurantId?: number;
  restaurant?: {
    id?: number;
    restaurantId?: number;
  } | null;
  [key: string]: unknown;
} | null;

type AuthContextValue = {
  user: AuthUser;
  login: (userData: AuthUser, token: string) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(role: unknown) {
  if (typeof role !== "string") {
    return role;
  }

  return role.trim().toUpperCase();
}

function sanitizeUserRole<T extends Record<string, unknown> | null>(
  userData: T,
): T {
  if (!userData || typeof userData !== "object") {
    return userData;
  }

  return {
    ...userData,
    role: normalizeRole(userData.role),
  } as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    function mergeUserData(remoteUser, storedUser) {
      if (!remoteUser?.id) {
        return null;
      }

      const safeStoredUser =
        storedUser && typeof storedUser === "object" ? storedUser : {};

      return {
        ...safeStoredUser,
        ...remoteUser,
        role: normalizeRole(remoteUser.role ?? safeStoredUser.role),
        phone: remoteUser.phone ?? safeStoredUser.phone ?? "",
        address: remoteUser.address ?? safeStoredUser.address ?? "",
        number: remoteUser.number ?? safeStoredUser.number ?? "",
        district: remoteUser.district ?? safeStoredUser.district ?? "",
        city: remoteUser.city ?? safeStoredUser.city ?? "",
        state: remoteUser.state ?? safeStoredUser.state ?? "",
        zipCode: remoteUser.zipCode ?? safeStoredUser.zipCode ?? "",
        complement: remoteUser.complement ?? safeStoredUser.complement ?? "",
        addresses: remoteUser.addresses ?? safeStoredUser.addresses ?? [],
        defaultAddressId:
          remoteUser.defaultAddressId ??
          safeStoredUser.defaultAddressId ??
          null,
      };
    }

    async function bootstrapAuth() {
      const storedUserRaw = localStorage.getItem("user");
      const storedUser = storedUserRaw
        ? sanitizeUserRole(JSON.parse(storedUserRaw))
        : null;
      const token = localStorage.getItem("token");

      if (!token) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const remoteUser = response?.data?.user || response?.data;
        const mergedUser = mergeUserData(remoteUser, storedUser);

        if (mergedUser?.id) {
          localStorage.setItem("user", JSON.stringify(mergedUser));
          if (mounted) {
            setUser(mergedUser);
          }
        } else if (storedUser && mounted) {
          setUser(storedUser);
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  function login(userData: AuthUser, token: string) {
    const normalizedUserData = sanitizeUserRole(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalizedUserData));
    setUser(normalizedUserData);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  function hasRole(...roles: string[]) {
    return Boolean(user?.role && roles.includes(user.role));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasRole,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
