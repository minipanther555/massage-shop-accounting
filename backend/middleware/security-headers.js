/**
 * Security Headers Middleware
 *
 * This middleware adds various security headers to protect against common web vulnerabilities.
 * Each header serves a specific security purpose and helps protect your application.
 */

function securityHeaders(req, res, next) {
  console.log('🔒 SECURITY: Applying security headers to request');

  // 1. Content Security Policy (CSP) - Prevents XSS attacks
  // This header tells the browser what resources (scripts, styles, images) are allowed to load
  // It's like a "whitelist" of trusted sources
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", // Only allow resources from same origin
    "script-src 'self' 'unsafe-inline'", // Allow scripts from same origin + inline scripts
    "style-src 'self' 'unsafe-inline'", // Allow styles from same origin + inline styles
    "img-src 'self' data: https:", // Allow images from same origin, data URLs, and HTTPS
    "font-src 'self'", // Allow fonts from same origin
    "connect-src 'self'", // Allow API calls to same origin
    "frame-ancestors 'none'" // Prevent your site from being embedded in iframes
  ].join('; '));

  // 2. HTTP Strict Transport Security (HSTS) - Forces HTTPS
  // This tells browsers to always use HTTPS for your site, even if someone types "http://"
  // It's like saying "never use the insecure version of this website"
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // max-age=31536000 = 1 year
  // includeSubDomains = applies to all subdomains too

  // 3. X-Frame-Options - Prevents clickjacking attacks
  // This prevents other websites from embedding your site in an iframe
  // Clickjacking is when attackers trick users into clicking buttons on your site
  // by overlaying it with a fake interface
  res.setHeader('X-Frame-Options', 'DENY');
  // DENY = never allow this site to be embedded in iframes

  // 4. X-Content-Type-Options - Prevents MIME type sniffing
  // This prevents browsers from guessing file types, which can lead to security issues
  // For example, if someone uploads a file that looks like an image but is actually HTML
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 5. X-XSS-Protection - Additional XSS protection (legacy browsers)
  // This enables the browser's built-in XSS protection
  // Modern browsers have better protection, but this helps with older ones
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 6. Referrer Policy - Controls what information is sent in referrer headers
  // When users click links from your site, this controls how much info is sent
  // 'strict-origin-when-cross-origin' = send full referrer to same origin,
  // send only origin to different origins
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 7. Permissions Policy - Controls browser features
  // This prevents websites from using certain browser features that could be dangerous
  // Like accessing your camera, microphone, or location without permission
  res.setHeader('Permissions-Policy', [
    'camera=()', // No camera access
    'microphone=()', // No microphone access
    'geolocation=()', // No location access
    'payment=()', // No payment API access
    'usb=()' // No USB device access
  ].join(', '));

  // 8. Cache Control - Prevents sensitive data from being cached
  // This ensures that sensitive pages (like admin panels) aren't stored in browser cache
  if (req.path.startsWith('/api/') || req.path.includes('admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  console.log('✅ SECURITY: Security headers applied successfully');
  next();
}

module.exports = securityHeaders;
