import { useCallback, useEffect, useRef, useState } from 'react';

export const RESEND_COOLDOWN_SECONDS = 30;
const STORAGE_KEY = 'gastronexa:password-reset:resend-until';

function readDeadline() {
  try {
    const value = Number(sessionStorage.getItem(STORAGE_KEY));
    const now = Date.now();
    // Store a timestamp only, never the account identifier, password or OTP.
    return Number.isFinite(value) && value > now && value <= now + RESEND_COOLDOWN_SECONDS * 1000
      ? value
      : 0;
  } catch {
    return 0;
  }
}

function secondsUntil(deadline: number) {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function useResendCooldown() {
  const [deadline, setDeadline] = useState(readDeadline);
  const deadlineRef = useRef(deadline);
  const [remainingSeconds, setRemainingSeconds] = useState(() => secondsUntil(deadline));

  const startCooldown = useCallback(() => {
    const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    deadlineRef.current = until;
    setDeadline(until);
    setRemainingSeconds(RESEND_COOLDOWN_SECONDS);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(until));
    } catch {
      // The UI still works if storage is unavailable; the API is authoritative.
    }
  }, []);

  const canRequest = useCallback(
    () => Date.now() >= Math.max(deadlineRef.current, readDeadline()),
    [],
  );

  useEffect(() => {
    if (!deadline) return;
    const update = () => {
      const seconds = secondsUntil(deadline);
      setRemainingSeconds(seconds);
      if (seconds === 0) window.clearInterval(timer);
    };
    // Use the deadline rather than decrementing a counter: background tabs
    // throttle timers and must catch up when they become visible again.
    const timer = window.setInterval(update, 250);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [deadline]);

  return { remainingSeconds, canRequest, startCooldown };
}
