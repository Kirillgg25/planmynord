# PlanMyNord backup to Cloudflare R2

The live SQLite files are intentionally excluded from Syncthing. Backups are made as verified, compressed snapshots and uploaded to a private Cloudflare R2 bucket.

## Cloudflare setup

1. Create a private R2 bucket, for example `planmynord-backups`.
2. Create an R2 API token with Object Read & Write access limited to that bucket.
3. Copy the Account ID, Access Key ID and Secret Access Key to `.env` using the variables from `.env.example`.
4. Keep the bucket private. Do not expose it through a public development URL or custom domain.
5. Add an object lifecycle rule for the `sqlite/` prefix, for example deletion after 90 days.

## Usage

Run one backup manually:

```powershell
npm run backup:r2
```

For automatic daily backups, set `R2_BACKUP_ENABLED=true`. The server schedules a backup at `R2_BACKUP_HOUR_UTC` while it is running.

## Restore

1. Stop the PlanMyNord server.
2. Download the required `.db.gz` object from the private R2 bucket.
3. Decompress it to a temporary `app.db` file.
4. Run `PRAGMA integrity_check` against the downloaded database.
5. Move the current database aside, place the verified database at `data/app.db`, and start the server.

Never restore over an open database, and never put R2 secrets in browser-side JavaScript.
