// backend/instrument.js
const Sentry = require('@sentry/node');

// This must be called before any other modules are required.
Sentry.init({
  dsn: 'https://d4242c087cd79901c4b3010987399915@o4509874071404544.ingest.de.sentry.io/4509891783163984',
  sendDefaultPii: true,
  tracesSampleRate: 1.0
  // Per the official documentation for v8+, Express and HTTP integrations
  // are enabled automatically. They do not need to be added here.
});
