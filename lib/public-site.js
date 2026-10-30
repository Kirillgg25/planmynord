const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const PUBLIC_FILES = [
  "js/vendor/zxcvbn.js", "js/vendor/zxcvbn-LICENSE.txt",
  "assets/icons/eye.svg", "assets/icons/eye-off.svg", "assets/icons/lucide-LICENSE",
  "vpn.css", "js/vpn-page.js",
  "support.html", "support.css", "js/support-page.js", "js/profile-vpn.js",
  "me.html", "me.css",
    "about.html", "account.html", "admin.html", "cookies.html", "index.html",
  "payment-cancel.html", "payment-success.html", "planner.html",
  "privacy.html", "profile.html", "refund.html", "routes.html", "terms.html",
  "things.html", "tickets.html", "about.css", "style.css", "style.min.css", "home.css", "home.min.css", "tickets.css",
  "ads.txt", "llms.txt", "robots.txt", "sitemap.xml",
  "assets/logo.svg", "assets/norway-route-card-v2.webp", "assets/norway-social-card-1200x630.webp", "assets/home-route-425.webp", "assets/home-route-850.webp",
  ...[
    "account", "admin", "auth", "building-style", "currency", "data", "date-picker",
    "home-page", "html-utils", "i18n", "i18n.min", "itinerary", "legal", "main", "map-engine",
    "map", "mapbox-config", "planner-date-picker", "planner-transfer",
    "planner", "popup-controller", "profile", "ready-routes-data", "recommendations",
    "routes-page", "routes", "select-menu", "site-page", "support-chat", "things-page",
    "tickets-page", "ui"
  ].map((name) => `js/${name}.js`)
];

function preparePublicSite(projectRoot) {
  const publicRoot = path.join(projectRoot, "public");
  for (const file of PUBLIC_FILES) {
    if (!fs.statSync(path.join(publicRoot, file)).isFile()) {
      throw new Error(`Missing public site file: ${file}`);
    }
  }
  return publicRoot;
}

function publicSiteMiddleware(publicRoot) {
  const allowedPaths = new Set(PUBLIC_FILES.map((file) => `/${file}`));
  const serve = express.static(publicRoot, {
    dotfiles: "deny",
    redirect: false,
    maxAge: "1y",
    immutable: true
  });
  return (req, res, next) => {
    let pathname;
    try { pathname = decodeURIComponent(req.path); }
    catch { return res.sendStatus(400); }
    // Extra files and stale build artifacts must remain inaccessible.
    if (pathname !== "/" && !allowedPaths.has(pathname)) return next();
    if (pathname === "/" || pathname.endsWith(".html")) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    } else if (!new URL(req.originalUrl, "http://localhost").searchParams.has("v")) {
      res.setHeader("Cache-Control", "public, max-age=604800");
    }
    return serve(req, res, next);
  };
}

module.exports = { PUBLIC_FILES, preparePublicSite, publicSiteMiddleware };
