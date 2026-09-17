# PlanMyNord on Ubuntu

The production server should be managed by `systemd`, not by Windows startup or a terminal session.

## Install or repair automatic startup

From the PlanMyNord project directory on the Ubuntu server, run:

```bash
sudo bash scripts/install-ubuntu-service.sh
```

When the project is installed elsewhere or should run as a dedicated user:

```bash
sudo bash scripts/install-ubuntu-service.sh /var/www/planmynord planmynord
```

The installer requires an existing `.env`, Node.js, and an existing non-root Linux user. It installs `/etc/systemd/system/planmynord.service`, enables startup after reboot, and restarts the server after failures.

## Useful commands

```bash
sudo systemctl status planmynord
sudo systemctl restart planmynord
sudo journalctl -u planmynord -n 100 --no-pager
curl -I http://127.0.0.1:3000/
```

## Cloudflare R2 backups

Set the `R2_*` values from `.env.example` in the server's `.env` and keep `R2_BACKUP_ENABLED=true`. While the service is running, PlanMyNord schedules the verified SQLite backup at `R2_BACKUP_HOUR_UTC` every day.

Test one upload manually before relying on the schedule:

```bash
sudo -u planmynord npm run backup:r2
```

Run the command from the project directory, and replace `planmynord` with the actual service user when different.
