/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { AuthSessionIdentityChangedError, refreshAccessToken } from '../Services/api';
import { clearSystemBlockState } from '../Services/systemBlock';
import { disconnectSocket } from '../Services/socketService';
import {
  clearAuthSession,
  getAccessToken,
  invalidateAuthSessionMemory,
  isAuthSnapshotCurrent,
  persistAuthSession,
  readSessionUserRaw,
  replaceSessionUser,
} from '../modules/auth/session/authSession';
import { rememberSignedOutRole } from '../shared/navigation/sessionEntry';

type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
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
  if (typeof role !== 'string') {
    return role;
  }

  return role.trim().toUpperCase();
}

function sanitizeUserRole<T extends Record<string, unknown> | null>(userData: T): T {
  if (!userData || typeof userData !== 'object') {
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
  const authRevision = useRef(0);

  function readStoredUser(): AuthUser {
    const storedUserRaw = readSessionUserRaw();

    if (!storedUserRaw || storedUserRaw === 'undefined') {
      return null;
    }

    try {
      return sanitizeUserRole(JSON.parse(storedUserRaw));
    } catch {
      sessionStorage.removeItem('user');
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;

    function mergeUserData(remoteUser, storedUser) {
      if (!remoteUser?.id) {
        return null;
      }

      const safeStoredUser = storedUser && typeof storedUser === 'object' ? storedUser : {};

      return {
        ...safeStoredUser,
        ...remoteUser,
        role: normalizeRole(remoteUser.role ?? safeStoredUser.role),
        phone: remoteUser.phone ?? safeStoredUser.phone ?? '',
        address: remoteUser.address ?? safeStoredUser.address ?? '',
        number: remoteUser.number ?? safeStoredUser.number ?? '',
        district: remoteUser.district ?? safeStoredUser.district ?? '',
        city: remoteUser.city ?? safeStoredUser.city ?? '',
        state: remoteUser.state ?? safeStoredUser.state ?? '',
        zipCode: remoteUser.zipCode ?? safeStoredUser.zipCode ?? '',
        complement: remoteUser.complement ?? safeStoredUser.complement ?? '',
        addresses: remoteUser.addresses ?? safeStoredUser.addresses ?? [],
        defaultAddressId: remoteUser.defaultAddressId ?? safeStoredUser.defaultAddressId ?? null,
      };
    }

    async function bootstrapAuth() {
      const storedUser = readStoredUser();
      const bootstrapRevision = authRevision.current;
      let token: string | null = null;

      const sessionIsStillCurrent = () =>
        mounted &&
        isAuthSnapshotCurrent({
          snapshotToken: token,
          currentToken: getAccessToken(),
          snapshotRevision: bootstrapRevision,
          currentRevision: authRevision.current,
        });

      try {
        token = await refreshAccessToken(storedUser?.id);
        if (!sessionIsStillCurrent()) return;

        const response = await api.get('/auth/me');
        const remoteUser = response?.data?.user || response?.data;
        const mergedUser = mergeUserData(remoteUser, storedUser);

        if (mergedUser?.id && sessionIsStillCurrent()) {
          replaceSessionUser(mergedUser);
          setUser(mergedUser);
        } else if (storedUser && sessionIsStillCurrent()) {
          setUser(storedUser);
        }
      } catch (error) {
        if (sessionIsStillCurrent()) {
          if (error instanceof AuthSessionIdentityChangedError) {
            invalidateAuthSessionMemory();
          } else {
            clearAuthSession();
          }
          setUser(null);
        }
      } finally {
        if (sessionIsStillCurrent() || (mounted && !getAccessToken())) {
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
    authRevision.current += 1;
    const normalizedUserData = sanitizeUserRole(userData);
    persistAuthSession(normalizedUserData, token);
    setUser(normalizedUserData);
    setIsLoading(false);
  }

  function logout() {
    authRevision.current += 1;
    rememberSignedOutRole(user?.role);
    void api.post('/auth/logout').catch(() => undefined);
    clearAuthSession();
    clearSystemBlockState();
    disconnectSocket({ immediate: true });
    setUser(null);
    setIsLoading(false);
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
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
