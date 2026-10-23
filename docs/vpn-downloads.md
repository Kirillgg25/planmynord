# VPN preview downloads

`/vpn.html` and `/api/vpn/downloads` require existing VPN preview access.
The profile links to the page inside its private VPN section.
Only exact filenames in lib/vpn-downloads.js are served from releases/vpn.

## Artifacts

- Windows: PlanMyNord-VPN-Windows-Setup-0.2.0.exe, NSIS x64 installer built
  from C:/Syncthing/VPN/Windows. Unsigned; no publisher certificate configured.
- Android: PlanMyNord-VPN-Android-preview.apk, copied from the existing
  Android/app/build/outputs/apk/debug/app-debug.apk (2026-10-18).
  Version 0.1.0, Android 10+, debug build. Not rebuilt or production-signed.

Installer execution and live VPN connectivity have not been verified here.
Public release needs signing/update planning, device tests, DNS/IPv6 leak
tests and review of bundled cores' redistribution/source obligations.
Windows core licenses and source references are in the vendor resources.
No iOS, macOS or Linux package is provided.

## Deploy

Sync server.js, lib/vpn-downloads.js, lib/public-site.js, the new frontend
files and releases/vpn/ to Ubuntu, then restart planmynord.
Releases are excluded from Git, not from Syncthing. Build intermediates in
releases/vpn-build are excluded from Syncthing. Downloads consume server
disk space and bandwidth. Missing artifacts show unavailable download states.

Update filenames/version in lib/vpn-downloads.js when replacing a release.
Never put credentials, keystores or user profiles in the download directory.
