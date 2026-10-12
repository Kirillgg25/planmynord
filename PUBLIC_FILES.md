# Public site files

The server serves only `public/`. Edit the HTML, CSS, JavaScript and assets
directly in that directory. No duplicate frontend copies are generated.
Browser URLs remain unchanged. The explicit `PUBLIC_FILES` list in
`lib/public-site.js` limits which files can be requested.

Never add credentials, databases, backups or server modules to that list.
Browser configuration (including `public/js/mapbox-config.js`) must contain only
public browser settings, never server secrets. Deployment must supply
that existing configuration file before startup.

Add new public assets and pages to the list. Unlisted paths return 404 even
if a file was accidentally placed inside `public/`. Clean page aliases also
resolve inside `public/`. API authorization is unchanged.

Commit public source files to Git, except the locally supplied map configuration.
The quarantine directory named `удалить` is excluded from Git and HTTP access.
Run `npm run test:static-security` to verify access restrictions using fake data.
