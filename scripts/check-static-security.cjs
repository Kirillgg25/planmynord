const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { PUBLIC_FILES, preparePublicSite, publicSiteMiddleware } = require("../lib/public-site");

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "planmynord-static-test-"));
  let server;
  try {
    for (const file of [...PUBLIC_FILES, "data/security-test.txt", "data/app.db", ".env", "server.js", "backup.zip"]) {
      const target = path.join(root, PUBLIC_FILES.includes(file) ? "public" : "", file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, PUBLIC_FILES.includes(file) ? `PUBLIC:${file}` : "PRIVATE_TEST_MARKER");
    }
    const publicRoot = preparePublicSite(root);
    assert.equal(fs.existsSync(path.join(publicRoot, "data")), false);
    fs.writeFileSync(path.join(publicRoot, "backup.zip"), "PRIVATE_TEST_MARKER");
    const app = express();
    app.use(publicSiteMiddleware(publicRoot));
    app.get("/api/health", (req, res) => res.json({ ok: true }));
    app.use((req, res) => res.sendStatus(404));
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const request = (url, method = "GET") => new Promise((resolve, reject) => {
      http.request({ host: "127.0.0.1", port: server.address().port, path: url, method }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }).on("error", reject).end();
    });
    for (const file of PUBLIC_FILES) assert.equal((await request(`/${file}?v=test`)).status, 200, file);
    assert.equal((await request("/")).body, "PUBLIC:index.html");
    assert.equal((await request("/api/health")).status, 200);
    const denied = ["/data/security-test.txt", "/data/app.db", "/.env", "/server.js",
      "/backup.zip", "/package.json", "/lib/public-site.js", "/scripts/check-static-security.cjs",
      "/js/../data/app.db", "/js/%2e%2e/data/app.db", "/%64ata/app.db",
      "/js/%2e%2e%2fserver.js", "/assets/..%5cserver.js", "/%252eenv",
      "/docs.html", "/missing", "/js/mapbox-config.js.bak", "/mapbox-lab.html",
      "/js/mapbox-lab.js", "/%D1%83%D0%B4%D0%B0%D0%BB%D0%B8%D1%82%D1%8C/server.js"];
    for (const url of denied) {
      for (const method of ["GET", "HEAD"]) {
        const response = await request(url, method);
        assert.equal(response.status, 404, `${method} ${url}`);
        assert.ok(!response.body.includes("PRIVATE_TEST_MARKER"));
      }
    }
    assert.equal((await request("/%ZZ")).status, 400);
    console.log(`PASS: ${PUBLIC_FILES.length} public files; ${denied.length * 2} denied requests; API, root and malformed URL`);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    const target = path.resolve(root);
    const temp = path.resolve(os.tmpdir());
    if (path.dirname(target) !== temp || !path.basename(target).startsWith("planmynord-static-test-")) throw Error("Unsafe cleanup target");
    fs.rmSync(target, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
