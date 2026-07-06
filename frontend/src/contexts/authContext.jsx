/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../Services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
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
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
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

  function login(userData, token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  function hasRole(...roles) {
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
  return useContext(AuthContext);
}
