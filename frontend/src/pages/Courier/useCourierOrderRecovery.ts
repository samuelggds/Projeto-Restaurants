import { useCallback, useEffect, useRef } from 'react';

type Options = {
  enabled: boolean;
  connected: boolean;
  isBusy: () => boolean;
  onRefresh: () => void;
};

/** Recovers missed order events without polling hidden tabs or overlapping requests. */
export function useCourierOrderRecovery(options: Options) {
  const current = useRef(options);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    current.current = options;
  }, [options]);

  const requestRecovery = useCallback(() => {
    if (pending.current !== null) return;
    const run = () => {
      pending.current = null;
      const { enabled, isBusy, onRefresh } = current.current;
      if (!enabled || document.visibilityState === 'hidden' || navigator.onLine === false) return;
      if (isBusy()) {
        pending.current = setTimeout(run, 500);
        return;
      }
      onRefresh();
    };
    pending.current = setTimeout(run, 200);
  }, []);

  useEffect(() => {
    const resume = () => requestRecovery();
    const fallback = window.setInterval(() => {
      if (!current.current.connected) requestRecovery();
    }, 30_000);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      window.clearInterval(fallback);
      if (pending.current !== null) clearTimeout(pending.current);
      pending.current = null;
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [requestRecovery]);

  return requestRecovery;
}
