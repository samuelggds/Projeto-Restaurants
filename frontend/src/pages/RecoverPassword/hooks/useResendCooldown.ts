import { useCallback, useEffect, useRef, useState } from 'react';

export const RESEND_COOLDOWN_SECONDS = 30;
const COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
const STORAGE_KEY = 'gastronexa:password-reset:resend-until';

function readDeadline() {
  try {
    const value = Number(sessionStorage.getItem(STORAGE_KEY));
    const now = Date.now();
    // Store a timestamp only, never the account identifier, password or OTP.
    return Number.isFinite(value) && value > now && value <= now + COOLDOWN_MS ? value : 0;
  } catch {
    return 0;
  }
}

function millisecondsUntil(deadline: number) {
  return Math.min(COOLDOWN_MS, Math.max(0, deadline - Date.now()));
}

export function useResendCooldown() {
  const [deadline, setDeadline] = useState(readDeadline);
  const deadlineRef = useRef(deadline);
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(() =>
    millisecondsUntil(deadline),
  );
  const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);

  const startCooldown = useCallback(() => {
    const until = Date.now() + COOLDOWN_MS;
    deadlineRef.current = until;
    setDeadline(until);
    setRemainingMilliseconds(COOLDOWN_MS);
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
      const milliseconds = millisecondsUntil(deadline);
      setRemainingMilliseconds(milliseconds);
      if (milliseconds === 0) window.clearInterval(timer);
    };
    // Fractional progress lets CSS interpolate the rectangular border smoothly.
    // The stored deadline, not timer ticks or animation events, controls access.
    const timer = window.setInterval(update, 250);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [deadline]);

  return { deadline, remainingSeconds, remainingMilliseconds, canRequest, startCooldown };
}
