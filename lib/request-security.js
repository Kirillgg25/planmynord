function apiOriginGuard(baseUrl) {
  const allowedOrigin = new URL(baseUrl).origin;
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    // Provider callbacks use their own authentication, not browser sessions.
    if (req.path === '/webhooks/vipps') return next();
    const origin = req.get('Origin');
    if (origin === allowedOrigin) return next();
    // Native clients have no browser Origin/Fetch Metadata. JSON-only requests
    // prevent cross-site HTML forms from using this compatibility path.
    if (!origin && !req.get('Sec-Fetch-Site') && req.is('application/json')) return next();
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  };
}

function validNewPassword(password) {
  return typeof password === 'string' && password.length >= 9 && Buffer.byteLength(password, 'utf8') <= 72;
}

module.exports = { apiOriginGuard, validNewPassword };
