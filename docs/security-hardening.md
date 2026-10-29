# Security hardening: phase 1

Implemented:
- Registration and password reset: at least 9 characters, at most 72 UTF-8
  bytes (bcrypt limit). Existing passwords still work; no accounts were changed.
- Unsafe /api requests reject foreign/null Origin. Requests without Origin
  require JSON and no browser Fetch Metadata, for native clients. Use the
  APP_BASE_URL origin in browsers; alternate domains should redirect there.
- Default JSON limit 64 KB. Only POST /api/avatar and /api/tickets accept 10 MB.
- POSTGIS_SSL=true verifies certificates; optional POSTGIS_CA_FILE supplies a
  private CA. URL SSL options cannot override that verified configuration.
  Configure remote databases with POSTGIS_SSL=true. Local unencrypted PostGIS
  remains supported when explicitly configured without TLS.

Still pending, not claimed solved:
- Administrative MFA/Cloudflare Access, including administrative API routes.
  Requires recovery/access planning before enabling.
- Uniform registration/resend responses and timing, including SMTP failures.
- Rotation of SESSION_SECRET to at least 32 cryptographically random bytes.
  Coordinate server restart and forced logout; do not publish the secret.
- Review payment webhook authentication. Origin checks do not authenticate
  provider webhooks; Vipps is excluded from browser Origin enforcement.

Deploy only after syncing lib/request-security.js, server.js, reset module and
frontend changes. Restart planmynord. Test browser and native sign-in, uploads
and PostGIS connectivity. A private/self-signed PostGIS server needs its CA.
