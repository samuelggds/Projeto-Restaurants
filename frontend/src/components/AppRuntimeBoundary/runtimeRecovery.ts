const RECOVERY_STORAGE_KEY = 'pizza-ia-runtime-recovery-at';
const RECOVERY_COOLDOWN_MS = 15_000;
const RECOVERY_DELAY_MS = 650;

let preloadRecoveryInstalled = false;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`.trim();
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
}

export function isRecoverableRuntimeError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'chunkloaderror',
    'loading chunk',
    'failed to fetch module script',
    'unable to preload css',
  ].some((signature) => message.includes(signature));
}

function readLastRecoveryAttempt() {
  try {
    return Number(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function rememberRecoveryAttempt(timestamp: number) {
  try {
    window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, String(timestamp));
  } catch {
    // A recarga ainda funciona quando o navegador bloqueia sessionStorage.
  }
}

export function clearRuntimeRecoveryAttempt() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
  } catch {
    // Nada a limpar quando o armazenamento da sessão está indisponível.
  }
}

export function requestRuntimeReload(error: unknown) {
  if (typeof window === 'undefined' || !isRecoverableRuntimeError(error)) return false;

  const now = Date.now();
  const lastAttempt = readLastRecoveryAttempt();
  if (lastAttempt > 0 && now - lastAttempt < RECOVERY_COOLDOWN_MS) return false;

  rememberRecoveryAttempt(now);
  window.setTimeout(() => window.location.reload(), RECOVERY_DELAY_MS);
  return true;
}

export function markRuntimeReady() {
  if (typeof window === 'undefined') return () => undefined;

  const timer = window.setTimeout(clearRuntimeRecoveryAttempt, 3_000);
  return () => window.clearTimeout(timer);
}

export function installVitePreloadRecovery() {
  if (typeof window === 'undefined' || preloadRecoveryInstalled) return () => undefined;

  const handlePreloadError = (event: Event) => {
    const preloadEvent = event as Event & { payload?: unknown };
    if (requestRuntimeReload(preloadEvent.payload)) event.preventDefault();
  };

  preloadRecoveryInstalled = true;
  window.addEventListener('vite:preloadError', handlePreloadError);

  return () => {
    window.removeEventListener('vite:preloadError', handlePreloadError);
    preloadRecoveryInstalled = false;
  };
}
