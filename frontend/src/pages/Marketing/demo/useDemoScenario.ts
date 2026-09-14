import { useCallback, useEffect, useState } from 'react';
import {
  createInitialDemoState,
  DEMO_STORAGE_KEY,
  sanitizeDemoState,
  type DemoState,
} from './demoDomain';

export const DEMO_SESSION_KEY = 'gastronexa:demo:account';

function loadScenario(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    const state = raw ? sanitizeDemoState(JSON.parse(raw)) : createInitialDemoState();
    const accountId = sessionStorage.getItem(DEMO_SESSION_KEY) ?? state.sessionAccountId;
    return {
      ...state,
      sessionAccountId: state.accounts.some((account) => account.id === accountId)
        ? accountId
        : null,
    };
  } catch {
    return createInitialDemoState();
  }
}

// Each tab keeps its own role. Only the fictitious restaurant scenario is shared.
export function useDemoScenario() {
  const [state, setState] = useState(loadScenario);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const update = useCallback((next: DemoState) => {
    setState(next);
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ ...next, sessionAccountId: null }));
      sessionStorage.setItem(DEMO_SESSION_KEY, next.sessionAccountId ?? '');
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== DEMO_STORAGE_KEY || !event.newValue) return;
      try {
        const incoming = sanitizeDemoState(JSON.parse(event.newValue));
        setState((current) => ({ ...incoming, sessionAccountId: current.sessionAccountId }));
      } catch {
        /* Keep the current scenario if another tab writes invalid data. */
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return { state, update, storageUnavailable };
}
