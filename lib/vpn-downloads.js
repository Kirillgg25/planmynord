const fs = require('node:fs');
const path = require('node:path');

const releases = {
  windows: { file: 'PlanMyNord-VPN-Windows-Setup-0.2.0.exe', version: '0.2.0', type: 'exe' },
  android: { file: 'PlanMyNord-VPN-Android-preview.apk', version: '0.1.0', type: 'apk' }
};

function installVpnDownloads(app, { directory }) {
  // Mounted after /api/vpn authorization. Never expose arbitrary release paths.
  app.get('/api/vpn/downloads', (_req, res) => {
    const downloads = Object.entries(releases).map(([platform, release]) => {
      const file = path.join(directory, release.file);
      const stat = fs.existsSync(file) ? fs.statSync(file) : null;
      return { platform, version: release.version, type: release.type,
        available: Boolean(stat?.isFile()), bytes: stat?.size || 0,
        url: stat?.isFile() ? `/api/vpn/downloads/${platform}` : null };
    });
    res.set('Cache-Control', 'no-store').json({ downloads });
  });
  app.get('/api/vpn/downloads/:platform', (req, res) => {
    const release = Object.hasOwn(releases, req.params.platform) ? releases[req.params.platform] : null;
    if (!release) return res.sendStatus(404);
    const file = path.join(directory, release.file);
    if (!fs.existsSync(file)) return res.sendStatus(404);
    res.set('Cache-Control', 'private, no-store');
    res.download(file, release.file, error => {
      if (error && !res.headersSent) res.sendStatus(404);
    });
  });
}

module.exports = { installVpnDownloads };
