const ACCESS_TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function persistAuthSession(user: unknown, accessToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthSnapshotCurrent({
  snapshotToken,
  currentToken,
  snapshotRevision,
  currentRevision,
}: {
  snapshotToken: string | null;
  currentToken: string | null;
  snapshotRevision: number;
  currentRevision: number;
}) {
  return snapshotToken === currentToken && snapshotRevision === currentRevision;
}
