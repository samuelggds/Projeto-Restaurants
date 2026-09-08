import { getAuthSessionUserId } from '../modules/auth/session/authSession';

const SESSION_KEY = 'order-creation-session';
const PREFIX = 'order-creation-pending:';
const memory = new Map<string, string>();
const pending = new Map<string, Promise<unknown>>();

function read(key: string, persist = true) {
  if (!persist) return memory.get(key);
  try { return localStorage.getItem(key) || memory.get(key); }
  catch { return memory.get(key); }
}
function save(key: string, value: string, persist = true) {
  memory.set(key, value);
  if (!persist) return;
  try { localStorage.setItem(key, value); } catch { /* Mantém retry nesta aba. */ }
}
function remove(key: string, persist = true) {
  memory.delete(key);
  if (!persist) return;
  try { localStorage.removeItem(key); } catch { /* Storage pode estar bloqueado. */ }
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function randomKey() {
  // getRandomValues also works on the HTTP LAN origins used by local installations.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Retains a failed attempt; only hashes and random keys enter persistent storage. */
export function withOrderCreationAttempt<T>(payload: unknown, send: (headers: Record<string, string>) => Promise<T>): Promise<T> {
  let session = read(SESSION_KEY);
  if (!session) { session = randomKey(); save(SESSION_KEY, session); }
  const identity = JSON.stringify([getAuthSessionUserId(), session, canonical(payload)]);
  // Register synchronously: WebCrypto may finish the second digest after a very
  // fast first HTTP response, when its pending entry/key has already been removed.
  const inFlight = pending.get(identity);
  if (inFlight) return inFlight as Promise<T>;
  const attempt = Promise.resolve().then(async () => {
    const persist = Boolean(crypto.subtle);
    const digest = persist ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity)) : null;
    const fingerprint = digest
      ? Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
      : identity;
    // In insecure contexts no SHA-256 is available: retain retries in memory
    // without writing a cart, customer address or other personal data to storage.
    const storageKey = `${PREFIX}${fingerprint}`;
    const key = read(storageKey, persist) || randomKey();
    save(storageKey, key, persist);
    const result = await send({ 'Idempotency-Key': key, 'X-Order-Session': session });
    remove(storageKey, persist);
    return result;
  }).finally(() => pending.delete(identity));
  pending.set(identity, attempt);
  return attempt;
}
