import type { RequestHandler } from 'express';
import { telemetryPath } from '../../services/telemetrySanitizer.js';

// Log slow or failed requests without payloads, credentials, query strings or user data.
export function resolveSlowRequestThresholdMs(value: unknown): number {
  const configured = Number(value);
  return Number.isSafeInteger(configured) && configured >= 100 && configured <= 60_000
    ? configured
    : 2_000;
}

export const requestTimingMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1_000_000);
    if (durationMs < resolveSlowRequestThresholdMs(process.env.SLOW_REQUEST_THRESHOLD_MS) && res.statusCode < 500) {
      return;
    }

    // Unknown paths may contain personal data, tokens or tenant-specific IDs.
    // A generic label is safer than logging req.path or a best-effort scrub.
    const route = req.route?.path;
    const routePath = typeof route === 'string' ? `${req.baseUrl}${route}` : '/[unmatched]';

    console.warn('[API_REQUEST_TIMING]', {
      requestId: req.requestId,
      method: req.method,
      path: telemetryPath(routePath),
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
};
