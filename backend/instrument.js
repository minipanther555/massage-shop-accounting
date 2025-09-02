// Safe Sentry init: only activates when SENTRY_DSN is set
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  const Sentry = require("@sentry/node");
  const Tracing = require("@sentry/tracing");

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.0),
    environment: process.env.NODE_ENV || "production",
  });

  module.exports = { Sentry, Tracing, enabled: true };
} else {
  module.exports = { Sentry: null, Tracing: null, enabled: false };
}