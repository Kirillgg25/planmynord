# Commonplace Finance SSO

Servera is the OpenID Connect identity provider. Finance transactions and family membership remain in the Finance database; signing in does not grant membership in another family.

## Servera configuration

Set these values in the Servera service's local secret store, not in Syncthing or a checked-in `.env`:

- `OIDC_ISSUER=https://planmynord.com/oidc`
- `OIDC_JWKS`: output from `npm run oidc:keygen`; preserve it across restarts and backups
- `OIDC_STORAGE_DIR`: an absolute, persistent directory outside Syncthing (for example `/var/lib/planmynord/oidc` on Linux or `C:\ProgramData\PlanMyNord\oidc` on Windows)
- `COMMONPLACE_OIDC_CLIENT_ID=commonplace-finance`
- `COMMONPLACE_OIDC_CLIENT_SECRET`: a unique random secret shared with the Finance server
- `COMMONPLACE_OIDC_REDIRECT_URI=http://127.0.0.1:3100/api/auth/oidc/callback` for the Finance API's server-side client
- `COMMONPLACE_DESKTOP_CLIENT_ID=commonplace-desktop`
- `COMMONPLACE_DESKTOP_REDIRECT_URI=com.commonplace.finance://oauth2redirect` for the Windows desktop client; this is a public native client and has no client secret

The issuer must exactly match the public HTTPS URL and reverse-proxy path. Keep the JWKS private key, OIDC database, and client secret private, persistent, backed up securely, and outside synchronized folders. Never rotate the JWKS on ordinary restarts.

## Finance configuration

Set in the Finance server's local configuration:

- `SERVERA_OIDC_ISSUER=https://planmynord.com/oidc`
- `SERVERA_OIDC_CLIENT_ID=commonplace-finance`
- `SERVERA_OIDC_CLIENT_SECRET`: same random client secret as Servera
- `SERVERA_OIDC_REDIRECT_URI=http://127.0.0.1:3100/api/auth/oidc/callback`

Then run `npm run db:migrate` in the Finance project and restart both services. The Finance API redirect URI must match exactly on both sides. The desktop app authenticates identity through Servera using authorization code + PKCE, but it does not yet synchronize finance records; that requires the Finance API to be deployed and configured.

## Existing Finance accounts

Use the existing Finance password to sign in, then choose **Link Servera**. Linking is accepted only when the verified Servera email exactly matches the Finance account email. A new OIDC identity creates a new Finance user and family; it is not merged into an existing profile based only on email.
