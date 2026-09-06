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

function removeLegacyPersistedAuthData() {
  if (typeof localStorage === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Versões anteriores guardavam também o snapshot do usuário de forma persistente.
  // Isso não é necessário para autenticação e pode expor identidade em dispositivos compartilhados.
  localStorage.removeItem(USER_KEY);
}

function persistSessionUser(user: unknown) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function readSessionUserRaw() {
  removeLegacyPersistedAuthData();
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(USER_KEY);
}

// Remove credenciais/snapshots deixados por versões que persistiam dados em Web Storage.
removeLegacyPersistedAuthData();

export function getAccessToken() {
  removeLegacyPersistedAuthData();
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
  removeLegacyPersistedAuthData();
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
  removeLegacyPersistedAuthData();
  persistSessionUser(user);
}

export function replaceSessionUser(user: unknown) {
  removeLegacyPersistedAuthData();
  persistSessionUser(user);
}

export function invalidateAuthSessionMemory() {
  sessionRevision += 1;
  accessToken = null;
  sessionUserId = null;
  removeLegacyPersistedAuthData();
}

export function clearAuthSession() {
  invalidateAuthSessionMemory();
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(USER_KEY);
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
