import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN || "";

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0,
    ),
  });
}

export { Sentry };
