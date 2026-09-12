import { useCallback, useEffect, useState } from 'react';

export function getBillingPixExpiry(expiresAt?: string | null, now = Date.now()) {
  const deadline = expiresAt ? Date.parse(expiresAt) : NaN;
  const known = Number.isFinite(deadline);
  const remainingSeconds = known ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  return {
    status: !known
      ? ('unknown' as const)
      : remainingSeconds > 0
        ? ('valid' as const)
        : ('expired' as const),
    remainingSeconds,
    remainingLabel: `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`,
    expiresLabel: known
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(deadline)
      : '',
  };
}

export function useBillingPixExpiry(expiresAt?: string | null) {
  const [now, setNow] = useState(Date.now);
  const refresh = useCallback(() => setNow(Date.now()), []);
  useEffect(() => {
    // Read the absolute deadline again: background tabs may suspend timers.
    const timer = window.setInterval(refresh, 1000);
    const initial = window.setTimeout(refresh, 0);
    const remaining = expiresAt ? Date.parse(expiresAt) - Date.now() : NaN;
    const deadlineTimer =
      Number.isFinite(remaining) && remaining > 0
        ? window.setTimeout(refresh, Math.min(remaining, 2_147_483_647))
        : undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initial);
      window.clearTimeout(deadlineTimer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [expiresAt, refresh]);

  return { ...getBillingPixExpiry(expiresAt, now), refresh };
}
