import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN || "";
const environment = process.env.NODE_ENV || "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });
}

export { Sentry };
