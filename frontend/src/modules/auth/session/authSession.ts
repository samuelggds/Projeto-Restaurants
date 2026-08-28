const ACCESS_TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REFRESH_TOKEN_KEY = 'refreshToken';

let accessToken: string | null = null;
let sessionUserId: number | null = null;
let sessionRevision = 0;

function normalizeUserId(value: unknown) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function readUserId(user: unknown) {
  if (!user || typeof user !== 'object') return null;
  return normalizeUserId((user as { id?: unknown }).id);
}

function removeLegacyPersistedTokens() {
  if (typeof localStorage === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Remove credentials left by versions that persisted them in Web Storage.
removeLegacyPersistedTokens();

export function getAccessToken() {
  removeLegacyPersistedTokens();
  return accessToken;
}

export function getAuthSessionRevision() {
  return sessionRevision;
}

export function getAuthSessionUserId() {
  return sessionUserId;
}

export function applyRefreshedAccessToken(
  token: string,
  expectedRevision: number,
  refreshedUserId?: unknown,
) {
  if (sessionRevision !== expectedRevision) return false;

  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return false;
  const normalizedUserId =
    refreshedUserId === undefined ? sessionUserId : normalizeUserId(refreshedUserId);
  if (refreshedUserId !== undefined && !normalizedUserId) return false;
  if (sessionUserId && normalizedUserId && sessionUserId !== normalizedUserId) return false;

  accessToken = normalizedToken;
  sessionUserId = normalizedUserId;
  removeLegacyPersistedTokens();
  return true;
}

export function persistAuthSession(user: unknown, token: string) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('Não é possível iniciar uma sessão sem token de acesso.');
  }

  sessionRevision += 1;
  accessToken = normalizedToken;
  sessionUserId = readUserId(user);
  removeLegacyPersistedTokens();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function invalidateAuthSessionMemory() {
  sessionRevision += 1;
  accessToken = null;
  sessionUserId = null;
  removeLegacyPersistedTokens();
}

export function clearAuthSession() {
  invalidateAuthSessionMemory();
  localStorage.removeItem(USER_KEY);
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
