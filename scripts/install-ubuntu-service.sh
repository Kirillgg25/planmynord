#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_APP_DIRECTORY="$(cd "${SCRIPT_DIRECTORY}/.." && pwd)"
APP_DIRECTORY="$(cd "${1:-${DEFAULT_APP_DIRECTORY}}" && pwd)"
APP_USER="${2:-${SUDO_USER:-}}"

if [[ ! "${APP_DIRECTORY}" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "The application path contains characters that are unsafe in a systemd unit: ${APP_DIRECTORY}" >&2
  exit 1
fi

if [[ -z "${APP_USER}" || "${APP_USER}" == "root" ]]; then
  echo "Specify the Linux service user as the second argument." >&2
  echo "Example: sudo bash scripts/install-ubuntu-service.sh /var/www/planmynord planmynord" >&2
  exit 1
fi

if [[ ! "${APP_USER}" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]]; then
  echo "Invalid Linux user name: ${APP_USER}" >&2
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "Linux user does not exist: ${APP_USER}" >&2
  exit 1
fi

if [[ ! -f "${APP_DIRECTORY}/server.js" || ! -f "${APP_DIRECTORY}/package.json" ]]; then
  echo "PlanMyNord was not found in ${APP_DIRECTORY}." >&2
  exit 1
fi

if [[ ! -f "${APP_DIRECTORY}/.env" ]]; then
  echo "Missing ${APP_DIRECTORY}/.env. Create it before installing the service." >&2
  exit 1
fi

NODE_EXECUTABLE="$(command -v node || true)"
if [[ -z "${NODE_EXECUTABLE}" ]]; then
  echo "Node.js is not installed or is not available in PATH." >&2
  exit 1
fi

APP_GROUP="$(id -gn "${APP_USER}")"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${APP_DIRECTORY}/data"

if ! runuser -u "${APP_USER}" -- test -w "${APP_DIRECTORY}"; then
  echo "${APP_USER} cannot write to ${APP_DIRECTORY}. Fix the project ownership first." >&2
  exit 1
fi

runuser -u "${APP_USER}" -- npm ci --omit=dev --prefix "${APP_DIRECTORY}"

TEMPORARY_UNIT="$(mktemp)"
cleanup() {
  rm -f "${TEMPORARY_UNIT}"
}
trap cleanup EXIT

cat >"${TEMPORARY_UNIT}" <<EOF
[Unit]
Description=PlanMyNord web server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_DIRECTORY}
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIRECTORY}/.env
ExecStart=${NODE_EXECUTABLE} ${APP_DIRECTORY}/server.js
Restart=always
RestartSec=5
TimeoutStopSec=20
KillSignal=SIGINT
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

install -m 0644 "${TEMPORARY_UNIT}" /etc/systemd/system/planmynord.service
systemctl daemon-reload
systemctl enable --now planmynord.service

echo "PlanMyNord systemd service installed and started."
systemctl --no-pager --full status planmynord.service
