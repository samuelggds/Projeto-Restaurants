import * as Sentry from '@sentry/react';
import type { Event } from '@sentry/react';
import { redactTelemetryText, sanitizeTelemetryValue, telemetryPath } from '../shared/security/telemetrySanitizer';

export function sanitizeEvent<T extends Event>(event: T): T {
  if (event.request) event.request = { method: event.request.method, url: telemetryPath(event.request.url) };
  event.user = undefined;
  if (event.message) event.message = redactTelemetryText(event.message);
  event.extra = sanitizeTelemetryValue(event.extra) as Event['extra'];
  event.contexts = sanitizeTelemetryValue(event.contexts) as Event['contexts'];
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message ? redactTelemetryText(breadcrumb.message) : undefined,
    data: sanitizeTelemetryValue(breadcrumb.data) as typeof breadcrumb.data,
  }));
  for (const exception of event.exception?.values || []) {
    if (exception.value) exception.value = redactTelemetryText(exception.value);
    for (const frame of exception.stacktrace?.frames || []) frame.vars = undefined;
  }
  return event;
}

const dsn = import.meta.env.VITE_SENTRY_DSN || '';

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0),
    sendDefaultPii: false,
    beforeSend: sanitizeEvent,
    beforeSendTransaction: sanitizeEvent,
  });
}

export { Sentry };
