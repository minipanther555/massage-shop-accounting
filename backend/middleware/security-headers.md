# Security Headers Middleware Specification

## Overall Purpose

The `security-headers.js` middleware module provides comprehensive security protection for the Massage Shop POS application by implementing multiple HTTP security headers. This middleware acts as a security layer that intercepts all HTTP responses and adds protective headers to prevent common web vulnerabilities such as Cross-Site Scripting (XSS), clickjacking, MIME type sniffing, and other security threats. It serves as the primary defense mechanism at the HTTP level, complementing application-level security measures.

## End-to-End Data Flow

When a request flows through the Express.js middleware chain, this security middleware is applied after the request is processed but before the response is sent to the client. The middleware function `securityHeaders()` is called with the standard Express middleware signature (req, res, next). It examines the request path to determine if special cache control headers are needed for sensitive routes (like API endpoints and admin pages), then systematically applies each security header to the response object. After all headers are set, it calls `next()` to continue the middleware chain. The response is then sent to the client with all security headers intact, providing protection at the browser level.

## Module API & Logic Breakdown

### Main Function

#### `securityHeaders(req, res, next)`
- **Purpose:** Apply comprehensive security headers to all HTTP responses
- **Parameters:**
  - `req`: Express request object (object, required)
  - `res`: Express response object (object, required)
  - `next`: Express next function (function, required)
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** This is the main middleware function that gets called for every request. It logs the start of security header application, sets all security headers, applies conditional cache control for sensitive routes, logs successful completion, and calls next() to continue the middleware chain.

### Security Headers Implementation

#### Content Security Policy (CSP)
- **Header:** `Content-Security-Policy`
- **Purpose:** Prevents XSS attacks by controlling which resources can be loaded
- **Value:** Comprehensive policy allowing:
  - `default-src 'self'`: Base policy restricts to same origin
  - `script-src 'self' 'unsafe-inline' https://browser.sentry-cdn.com https://js.sentry-cdn.com`: Allows local scripts, inline scripts, and Sentry CDN
  - `style-src 'self' 'unsafe-inline'`: Allows local and inline styles
  - `img-src 'self' data: https:`: Allows local images, data URIs, and HTTPS images
  - `font-src 'self'`: Allows only local fonts
  - `connect-src 'self' *.sentry.io`: Allows connections to same origin and Sentry services
  - `worker-src 'self' blob:`: Required for Sentry Session Replay functionality
  - `frame-ancestors 'none'`: Prevents embedding in iframes

#### HTTP Strict Transport Security (HSTS)
- **Header:** `Strict-Transport-Security`
- **Purpose:** Forces browsers to use HTTPS for all future requests
- **Value:** `max-age=31536000; includeSubDomains`
- **Logic:** Sets 1-year expiration and applies to all subdomains

#### X-Frame-Options
- **Header:** `X-Frame-Options`
- **Purpose:** Prevents clickjacking attacks by blocking iframe embedding
- **Value:** `DENY`
- **Logic:** Completely blocks any website from embedding this application in an iframe

#### X-Content-Type-Options
- **Header:** `X-Content-Type-Options`
- **Purpose:** Prevents MIME type sniffing attacks
- **Value:** `nosniff`
- **Logic:** Forces browsers to respect the declared Content-Type header

#### X-XSS-Protection
- **Header:** `X-XSS-Protection`
- **Purpose:** Enables browser's built-in XSS protection (legacy support)
- **Value:** `1; mode=block`
- **Logic:** Enables protection and blocks rendering if XSS is detected

#### Referrer Policy
- **Header:** `Referrer-Policy`
- **Purpose:** Controls information sent in referrer headers
- **Value:** `strict-origin-when-cross-origin`
- **Logic:** Sends full referrer to same origin, only origin to different origins

#### Permissions Policy
- **Header:** `Permissions-Policy`
- **Purpose:** Controls access to browser features and APIs
- **Value:** `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- **Logic:** Explicitly denies access to potentially sensitive browser features

#### Cache Control (Conditional)
- **Headers:** `Cache-Control`, `Pragma`, `Expires`
- **Purpose:** Prevents sensitive data from being cached
- **Value:** Applied only to API routes and admin pages
- **Logic:** Checks if request path starts with `/api/` or contains 'admin', then applies strict no-cache headers

## Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** Express.js application (`server.js`) via `app.use(securityHeaders)`
- **Input Data Contracts / Schemas:**
  - Express request object with standard properties (req.path, req.method, etc.)
  - Express response object for header manipulation
  - Express next function for middleware chain continuation

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** None (pure middleware function)
- **Output Data Contracts / Schemas:**
  - HTTP response with security headers applied
  - Console logging for monitoring and debugging
  - Middleware chain continuation via next() call

## Bug & Resolution History

### Bug Summary
The middleware was initially implemented with helmet.js but was replaced with a custom implementation to resolve HSTS redirect issues and provide more granular control over security policies.

### Validated Hypothesis
Custom security headers middleware provides better control and avoids the HSTS redirect problems that were occurring with helmet.js in the development environment.

### Invalidated Hypotheses
- Initial assumption that helmet.js would provide sufficient security coverage was incorrect due to HSTS conflicts
- Belief that security headers would significantly impact performance was unfounded

### Resolution
Replaced helmet.js with custom middleware that provides the same security benefits while avoiding HSTS conflicts and allowing precise control over each security header. The middleware now successfully protects against XSS, clickjacking, and other web vulnerabilities without causing development environment issues.
