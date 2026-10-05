const SECURITY_SCRIPT_URL = 'https://www.mercadopago.com/v2/security.js';
const SESSION_WAIT_MS = 5000;
let sessionPromise: Promise<string | undefined> | undefined;

function currentDeviceSession() {
  return String(window.MP_DEVICE_SESSION_ID || '').trim() || undefined;
}

/** Starts the official Mercado Pago device fingerprint collection as early as possible. */
export function collectMercadoPagoDeviceSession(): Promise<string | undefined> {
  const current = currentDeviceSession();
  if (current) return Promise.resolve(current);
  if (sessionPromise) return sessionPromise;

  const pending = new Promise<string | undefined>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SECURITY_SCRIPT_URL}"]`,
    );
    const script = existingScript || document.createElement('script');
    const finish = () => {
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      script.removeEventListener('error', finish);
      resolve(currentDeviceSession());
    };
    const poll = window.setInterval(() => {
      if (currentDeviceSession()) finish();
    }, 50);
    const timeout = window.setTimeout(finish, SESSION_WAIT_MS);
    script.addEventListener('error', finish, { once: true });

    if (!existingScript) {
      try {
        // SDK v2 collects its own token profile; this script exposes the session
        // used by the Orders API's X-meli-session-id header.
        script.src = SECURITY_SCRIPT_URL;
        script.async = true;
        script.setAttribute('view', 'checkout');
        document.head.appendChild(script);
      } catch {
        finish();
      }
    }
  });
  sessionPromise = pending.then((value) => {
    // A blocked/slow fingerprint must be retryable on the next payment attempt.
    if (!value) sessionPromise = undefined;
    return value;
  });
  return sessionPromise;
}

export async function requireMercadoPagoDeviceSession() {
  const session = await collectMercadoPagoDeviceSession();
  if (!session) {
    throw new Error(
      'Não foi possível iniciar a proteção antifraude do Mercado Pago. Recarregue a página e tente novamente.',
    );
  }
  return session;
}
