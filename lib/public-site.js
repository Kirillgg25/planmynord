const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const PUBLIC_FILES = [
  "support.html", "support.css", "js/support-page.js", "js/profile-vpn.js",
  "me.html", "me.css",
    "about.html", "account.html", "admin.html", "cookies.html", "index.html",
  "payment-cancel.html", "payment-success.html", "planner.html",
  "privacy.html", "profile.html", "refund.html", "routes.html", "terms.html",
  "things.html", "tickets.html", "about.css", "style.css", "tickets.css",
  "ads.txt", "llms.txt", "robots.txt", "sitemap.xml",
  "assets/logo.svg", "assets/norway-route-card-v2.webp",
  ...[
    "account", "admin", "auth", "building-style", "currency", "data", "date-picker",
    "home-page", "html-utils", "i18n", "itinerary", "legal", "main", "map-engine",
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
  const serve = express.static(publicRoot, { dotfiles: "deny", redirect: false });
  return (req, res, next) => {
    let pathname;
    try { pathname = decodeURIComponent(req.path); }
    catch { return res.sendStatus(400); }
    // Extra files and stale build artifacts must remain inaccessible.
    if (pathname !== "/" && !allowedPaths.has(pathname)) return next();
    return serve(req, res, next);
  };
}

module.exports = { PUBLIC_FILES, preparePublicSite, publicSiteMiddleware };
