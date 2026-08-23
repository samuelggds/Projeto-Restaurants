import { useEffect, useState } from 'react';
import type { LoyaltySummary } from '../types';
import { loyaltyRedemptionEntries } from '../domain/loyaltyRedemption';

const MAX_TIMER_DELAY = 2_147_000_000;

export function nextClaimedRedemptionExpiration(summary: LoyaltySummary | null, now = Date.now()) {
  const expirations = loyaltyRedemptionEntries(summary)
    .filter(
      ({ redemption }) =>
        redemption.status === 'CLAIMED' &&
        redemption.expired !== true &&
        (redemption.expiresAt || redemption.coupon.expiration),
    )
    .map(({ redemption }) =>
      Date.parse(String(redemption.expiresAt || redemption.coupon.expiration)),
    )
    .filter((expiration) => Number.isFinite(expiration) && expiration > now);
  return expirations.length ? Math.min(...expirations) : null;
}

export function useLoyaltyExpirationClock(summary: LoyaltySummary | null) {
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const currentTime = Date.now();
    const nextExpiration = nextClaimedRedemptionExpiration(summary, currentTime);
    if (!nextExpiration) return undefined;
    const delay = Math.min(MAX_TIMER_DELAY, Math.max(0, nextExpiration - currentTime + 25));
    const timer = window.setTimeout(() => setClock(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [clock, summary]);

  return clock;
}
