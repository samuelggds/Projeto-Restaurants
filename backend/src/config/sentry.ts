import * as Sentry from '@sentry/node';
import type { Event } from '@sentry/node';
import {
  redactTelemetryText,
  sanitizeTelemetryValue,
  telemetryPath,
} from '../services/telemetrySanitizer.js';

const dsn = process.env.SENTRY_DSN || '';
const environment = process.env.NODE_ENV || 'development';

function sanitizeEvent<T extends Event>(event: T): T {
  if (event.request) {
    event.request.url = telemetryPath(event.request.url);
    event.request.query_string = undefined;
    event.request.cookies = undefined;
    event.request.headers = sanitizeTelemetryValue(
      event.request.headers,
    ) as NonNullable<Event['request']>['headers'];
    event.request.data = sanitizeTelemetryValue(event.request.data);
  }

  if (event.user) {
    event.user = event.user.id === undefined ? undefined : { id: String(event.user.id) };
  }

  if (event.message) event.message = redactTelemetryText(event.message);
  event.extra = sanitizeTelemetryValue(event.extra) as Event['extra'];
  event.contexts = sanitizeTelemetryValue(event.contexts) as Event['contexts'];
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message ? redactTelemetryText(breadcrumb.message) : breadcrumb.message,
    data: sanitizeTelemetryValue(breadcrumb.data) as typeof breadcrumb.data,
  }));

  for (const exception of event.exception?.values || []) {
    if (exception.value) exception.value = redactTelemetryText(exception.value);
    for (const frame of exception.stacktrace?.frames || []) {
      frame.vars = sanitizeTelemetryValue(frame.vars) as typeof frame.vars;
    }
  }

  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    sendDefaultPii: false,
    beforeSend: sanitizeEvent,
    beforeSendTransaction: sanitizeEvent,
  });
}

export { sanitizeEvent, Sentry };
