# `admin-services.promotion-settings.present.test.js`

## Overall Purpose

This source contract test prevents the Services & Pricing manager configuration controls from being removed or routed behind the generic service ID route.

## Coverage

- The manager page retains its dedicated promotion panel and all settings inputs.
- The page retains explicit load and save handlers.
- `web-app/api.js` retains the shared API wrappers.
- The manager-only `/promotion-settings` routes occur before `/:id` in `backend/routes/services.js`.
