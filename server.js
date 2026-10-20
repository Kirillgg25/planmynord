require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fsSync = require("fs");
const fs = require("fs/promises");
const https = require("https");
const path = require("path");
const nodemailer = require("nodemailer");
const { createHmac, createHash, randomUUID, timingSafeEqual } = require("crypto");
const { Provider: OidcProvider } = require("oidc-provider");
const { scheduleDailyR2Backup } = require("./lib/r2-backup");
const { preparePublicSite, publicSiteMiddleware } = require("./lib/public-site");
const PUBLIC_DIR = preparePublicSite(__dirname);
let Database;
let PgPool;

try {
  Database = require("better-sqlite3");
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    try {
      ({ DatabaseSync: Database } = require("node:sqlite"));
    } catch {
      console.error("SQLite package is missing. Run: npm install");
      process.exit(1);
    }
  } else {
    throw error;
  }
}

try {
  ({ Pool: PgPool } = require("pg"));
} catch (error) {
  PgPool = null;
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const useSecureCookies = isProduction && APP_BASE_URL.startsWith("https://");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const DB_FILE = path.join(DATA_DIR, "app.db");
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-before-publishing";
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
);
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_DATA_URL_LENGTH = 2_000_000;
const ALLOWED_TICKET_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_TICKET_BYTES = 5 * 1024 * 1024;
const MAX_TICKETS_PER_USER = 30;
const DEFAULT_HOTEL_NIGHTLY_NOK = 650;
const DEFAULT_CAR_DAILY_NOK = 549;
const VIP_PLAN_NAME = process.env.SUPPORT_PLAN_NAME || "PlanMyNord Support";
const VIP_PRICE_NOK = Math.max(Number(process.env.SUPPORT_PRICE_NOK || process.env.VIP_PRICE_NOK) || 99, 1);
const VIP_DURATION_DAYS = Math.max(Number(process.env.VIP_DURATION_DAYS) || 30, 1);
const VPN_PLAN_NAME = process.env.VPN_PLAN_NAME || "PlanMyNord VPN";
const VPN_PRICE_NOK = 99;
const VPN_DURATION_DAYS = Math.max(Number(process.env.VPN_DURATION_DAYS) || 30, 1);
const VPN_DEVICE_LIMIT = 5;
const XUI_BASE_URL = String(process.env.XUI_BASE_URL || "").trim().replace(/\/+$/, "");
const XUI_API_TOKEN = String(process.env.XUI_API_TOKEN || "").trim();
const XUI_INBOUND_ID = Number(process.env.XUI_INBOUND_ID);
const VPN_SUBSCRIPTION_BASE_URL = String(process.env.VPN_SUBSCRIPTION_BASE_URL || "").trim();
const VPN_PROFILE_DELIVERY_ENABLED = Boolean(XUI_BASE_URL && XUI_API_TOKEN && Number.isSafeInteger(XUI_INBOUND_ID) && XUI_INBOUND_ID > 0 && VPN_SUBSCRIPTION_BASE_URL);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_VIP_PRICE_ID = process.env.STRIPE_VIP_PRICE_ID || "";
const STRIPE_VPN_PRICE_ID = process.env.STRIPE_VPN_PRICE_ID || "";
const VIPPS_CLIENT_ID = process.env.VIPPS_CLIENT_ID || "";
const VIPPS_CLIENT_SECRET = process.env.VIPPS_CLIENT_SECRET || "";
const VIPPS_SUBSCRIPTION_KEY = process.env.VIPPS_SUBSCRIPTION_KEY || "";
const VIPPS_MERCHANT_SERIAL_NUMBER = process.env.VIPPS_MERCHANT_SERIAL_NUMBER || "";
const VIPPS_SYSTEM_NAME = process.env.VIPPS_SYSTEM_NAME || "PlanMyNord";
const VIPPS_SYSTEM_VERSION = process.env.VIPPS_SYSTEM_VERSION || "1.0.0";
const VIPPS_API_BASE_URL = process.env.VIPPS_API_BASE_URL || "https://api.vipps.no";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || `${APP_BASE_URL}/auth/google/callback`;
const GOOGLE_OAUTH_TIMEOUT_MS = 12000;
const googleOAuthConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const OIDC_ISSUER = process.env.OIDC_ISSUER || `${APP_BASE_URL.replace(/\/$/, "")}/oidc`;
const OIDC_JWKS = process.env.OIDC_JWKS || "";
const OIDC_STORAGE_DIR = process.env.OIDC_STORAGE_DIR || "";
const OIDC_CLIENT_ID = process.env.COMMONPLACE_OIDC_CLIENT_ID || "";
const OIDC_CLIENT_SECRET = process.env.COMMONPLACE_OIDC_CLIENT_SECRET || "";
const OIDC_REDIRECT_URI = process.env.COMMONPLACE_OIDC_REDIRECT_URI || "http://127.0.0.1:3100/api/auth/oidc/callback";
const OIDC_DESKTOP_CLIENT_ID = process.env.COMMONPLACE_DESKTOP_CLIENT_ID || "commonplace-desktop";
const OIDC_DESKTOP_REDIRECT_URI = process.env.COMMONPLACE_DESKTOP_REDIRECT_URI || "com.commonplace.finance://oauth2redirect";
let oidcProvider;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const OPENAI_TIMEOUT_MS = 16000;
const POSTGIS_DATABASE_URL = process.env.POSTGIS_DATABASE_URL || "";
const POSTGIS_CACHE_TTL_HOURS = Math.max(Number(process.env.POSTGIS_CACHE_TTL_HOURS) || 168, 1);
let db;
let oidcDb;
let postgisPool;
let postgisReadyPromise;
let postgisDisabledReason = "";
let postgisWarningShown = false;

class SqliteSessionStore extends session.Store {
  constructor({ cleanupIntervalMs = 15 * 60 * 1000 } = {}) {
    super();
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupIntervalMs);

    if (typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  getDatabase() {
    return openDatabase();
  }

  get(sid, callback) {
    try {
      const row = this.getDatabase()
        .prepare("SELECT data_json, expires_at FROM sessions WHERE sid = ?")
        .get(sid);

      if (!row) {
        callback(null, null);
        return;
      }

      if (row.expires_at <= Date.now()) {
        this.destroy(sid, () => callback(null, null));
        return;
      }

      callback(null, JSON.parse(row.data_json));
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sessionData, callback = () => {}) {
    try {
      const expiresAt = getSessionExpiresAt(sessionData);
      this.getDatabase()
        .prepare(`
          INSERT INTO sessions (sid, data_json, expires_at, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(sid) DO UPDATE SET
            data_json = excluded.data_json,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at
        `)
        .run(sid, JSON.stringify(sessionData), expiresAt, new Date().toISOString());
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.getDatabase().prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sessionData, callback = () => {}) {
    try {
      this.getDatabase()
        .prepare("UPDATE sessions SET expires_at = ?, updated_at = ? WHERE sid = ?")
        .run(getSessionExpiresAt(sessionData), new Date().toISOString(), sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  cleanupExpiredSessions() {
    try {
      this.getDatabase().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
    } catch (error) {
      console.error("Session cleanup failed:", error);
    }
  }
}

class SqliteOidcAdapter {
  constructor(model) {
    this.model = model;
  }

  async upsert(id, payload, expiresIn) {
    const expiresAt = typeof expiresIn === "number" ? Date.now() + expiresIn * 1000 : null;
    openOidcDatabase().prepare(`
      INSERT INTO oidc_adapter(model,id,payload_json,expires_at) VALUES(?,?,?,?)
      ON CONFLICT(model,id) DO UPDATE SET payload_json=excluded.payload_json,expires_at=excluded.expires_at
    `).run(this.model, id, JSON.stringify(payload), expiresAt);
  }

  async find(id) {
    const row = openOidcDatabase().prepare(
      "SELECT payload_json,expires_at FROM oidc_adapter WHERE model=? AND id=?"
    ).get(this.model, id);
    if (!row) return undefined;
    if (row.expires_at && row.expires_at <= Date.now()) {
      await this.destroy(id);
      return undefined;
    }
    return JSON.parse(row.payload_json);
  }

  async findByUid(uid) {
    const row = openOidcDatabase().prepare(
      "SELECT id FROM oidc_adapter WHERE model='Session' AND json_extract(payload_json,'$.uid')=? LIMIT 1"
    ).get(uid);
    return row ? this.find(row.id) : undefined;
  }

  async findByUserCode(userCode) {
    const row = openOidcDatabase().prepare(
      "SELECT id FROM oidc_adapter WHERE model=? AND json_extract(payload_json,'$.userCode')=? LIMIT 1"
    ).get(this.model, userCode);
    return row ? this.find(row.id) : undefined;
  }

  async consume(id) {
    const payload = await this.find(id);
    if (payload) {
      payload.consumed = Math.floor(Date.now() / 1000);
      openOidcDatabase().prepare("UPDATE oidc_adapter SET payload_json=? WHERE model=? AND id=?")
        .run(JSON.stringify(payload), this.model, id);
    }
  }

  async destroy(id) {
    openOidcDatabase().prepare("DELETE FROM oidc_adapter WHERE model=? AND id=?").run(this.model, id);
  }

  async revokeByGrantId(grantId) {
    const rows = openOidcDatabase().prepare("SELECT model,id,payload_json FROM oidc_adapter").all();
    const remove = rows.filter((row) => {
      if (!/Token|Code|Request/.test(row.model)) return false;
      try { return JSON.parse(row.payload_json).grantId === grantId; } catch { return false; }
    });
    const deleteRow = openOidcDatabase().prepare("DELETE FROM oidc_adapter WHERE model=? AND id=?");
    const removeGrant = openDatabase().transaction(() => {
      for (const row of remove) deleteRow.run(row.model, row.id);
    });
    removeGrant();
  }
}

function getSessionExpiresAt(sessionData) {
  const expires = sessionData?.cookie?.expires;

  if (expires) {
    const expiresAt = new Date(expires).getTime();

    if (Number.isFinite(expiresAt)) {
      return expiresAt;
    }
  }

  const maxAge = Number(sessionData?.cookie?.maxAge) || 1000 * 60 * 60 * 24 * 7;
  return Date.now() + maxAge;
}

const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
);

const mailTransport = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

app.set("trust proxy", 1);
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
      const stripeSignature = req.headers["stripe-signature"];

      if (!STRIPE_WEBHOOK_SECRET || !isValidStripeSignature(rawBody, stripeSignature)) {
        return res.status(400).json({ error: "Invalid Stripe signature." });
      }

      const event = JSON.parse(rawBody.toString("utf8") || "{}");

      if (event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid") {
        const checkout = event.data.object;
        const stored = openDatabase().prepare("SELECT * FROM payments WHERE id = ?").get(checkout.metadata?.paymentId || "");
        if (!stored || checkout.amount_total !== stored.amount_nok * 100 || String(checkout.currency).toLowerCase() !== "nok") {
          return res.status(400).json({ error: "Payment amount mismatch." });
        }
        await completePaymentFromProvider({
          provider: "stripe",
          providerPaymentId: event.data?.object?.id,
          paymentId: event.data?.object?.metadata?.paymentId,
          userId: event.data?.object?.metadata?.userId
        });
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook failed:", error);
      res.status(500).json({ error: "Stripe webhook failed." });
    }
  }
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://www.googletagmanager.com",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://api.mapbox.com",
          "https://pagead2.googlesyndication.com",
          "https://tpc.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://adservice.google.com",
          "https://www.google.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://api.mapbox.com",
          "https://fonts.googleapis.com",
          "https://www.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "https://*.google-analytics.com",
          "https://www.googletagmanager.com",
          "data:",
          "blob:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.googleusercontent.com",
          "https://pagead2.googlesyndication.com",
          "https://tpc.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://www.google.com",
          "https://api.mapbox.com",
          "https://*.tiles.mapbox.com"
        ],
        connectSrc: [
          "'self'",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://www.googletagmanager.com",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://pagead2.googlesyndication.com",
          "https://tpc.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://www.google.com",
          "https://api.mapbox.com",
          "https://events.mapbox.com",
          "https://*.tiles.mapbox.com",
          "https://api.open-meteo.com"
        ],
        fontSrc: ["'self'", "data:", "https://api.mapbox.com", "https://fonts.gstatic.com"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: [
          "'self'",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com",
          "https://www.google.com"
        ],
        childSrc: [
          "'self'",
          "blob:",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com",
          "https://www.google.com"
        ]
      }
    },
    crossOriginResourcePolicy: false
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "8kb" }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
    res.set("Cache-Control", "no-store");
  }
  next();
});
app.use(
  session({
    store: new SqliteSessionStore(),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: useSecureCookies,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(publicSiteMiddleware(PUBLIC_DIR));

// Private VPN preview: authorize every endpoint, including product and payments.
app.use("/api/vpn", requireAuth, (req, res, next) => {
  if (!canPreviewVpn(req.currentUser)) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: (req) => req.method === "POST" && req.path === "/api/login" &&
    Date.now() < Date.parse(process.env.LOGIN_RATE_LIMIT_PAUSED_UNTIL || ""),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "For mange forsøk. Prøv igjen om 15 minutter." }
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "For mange forespørsler. Prøv igjen senere." }
});

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "For mange endringer på kort tid. Prøv igjen senere." }
});

const estimateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "For mange prisforespørsler på kort tid. Prøv igjen senere." }
});

const supportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "For mange supportmeldinger på kort tid. Prøv igjen senere." }
});

function openDatabase() {
  if (db) {
    return db;
  }

  fsSync.mkdirSync(DATA_DIR, { recursive: true });
  db = createDatabase(DB_FILE);
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar_url TEXT NOT NULL DEFAULT '',
      oauth_provider TEXT NOT NULL DEFAULT '',
      oauth_subject TEXT NOT NULL DEFAULT '',
      vip_plan TEXT NOT NULL DEFAULT '',
      vip_until TEXT NOT NULL DEFAULT '',
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT NOT NULL DEFAULT '',
      verification_token_expires_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      days INTEGER NOT NULL,
      budget TEXT NOT NULL,
      stops_json TEXT NOT NULL,
      info TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'saved',
      planner_data_json TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS route_ratings (
      route_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (route_id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_payment_id TEXT NOT NULL DEFAULT '',
      amount_nok INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NOK',
      status TEXT NOT NULL DEFAULT 'pending',
      plan TEXT NOT NULL,
      vip_days INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      paid_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      trip_label TEXT NOT NULL DEFAULT '',
      travel_date TEXT NOT NULL DEFAULT '',
      content BLOB NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vpn_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      device_limit INTEGER NOT NULL DEFAULT 3,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vpn_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'other',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL DEFAULT '',
      revoked_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vpn_trial_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL,
      client_email TEXT NOT NULL UNIQUE,
      sub_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (device_id) REFERENCES vpn_devices(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS create_vpn_subscription_after_user_insert
    AFTER INSERT ON users
    BEGIN
      INSERT OR IGNORE INTO vpn_subscriptions (
        id, user_id, plan, status, device_limit, starts_at, ends_at, created_at, updated_at
      ) VALUES (
        lower(hex(randomblob(16))), NEW.id, 'free', 'active', 3,
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), '',
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      );
    END;

    CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_user_created ON tickets(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_vpn_devices_user_status ON vpn_devices(user_id, status);
  `);
  ensureColumn(db, "users", "vip_plan", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "users", "vip_until", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "users", "oauth_provider", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "users", "oauth_subject", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "trips", "published", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "trips", "published_at", "TEXT NOT NULL DEFAULT ''");

  const now = new Date().toISOString();
  const usersWithoutVpn = db.prepare(`
    SELECT users.id
    FROM users
    LEFT JOIN vpn_subscriptions ON vpn_subscriptions.user_id = users.id
    WHERE vpn_subscriptions.user_id IS NULL
  `).all();
  const addVpnSubscription = db.prepare(`
    INSERT INTO vpn_subscriptions (
      id, user_id, plan, status, device_limit, starts_at, ends_at, created_at, updated_at
    ) VALUES (?, ?, 'free', 'active', 3, ?, '', ?, ?)
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    usersWithoutVpn.forEach((user) => addVpnSubscription.run(randomUUID(), user.id, now, now, now));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return db;
}

function openOidcDatabase() {
  if (oidcDb) return oidcDb;
  if (!OIDC_STORAGE_DIR || !path.isAbsolute(OIDC_STORAGE_DIR)) {
    throw new Error("OIDC_STORAGE_DIR must be an absolute directory outside synchronized project folders.");
  }
  fsSync.mkdirSync(OIDC_STORAGE_DIR, { recursive: true });
  oidcDb = createDatabase(path.join(OIDC_STORAGE_DIR, "oidc-provider.db"));
  oidcDb.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS oidc_adapter (
      model TEXT NOT NULL,
      id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      expires_at INTEGER,
      PRIMARY KEY (model, id)
    );
    CREATE INDEX IF NOT EXISTS idx_oidc_adapter_expires_at ON oidc_adapter(expires_at);
  `);
  return oidcDb;
}

function createDatabase(filePath) {
  try {
    return new Database(filePath);
  } catch (error) {
    if (canFallbackToBuiltinSqlite(error)) {
      try {
        ({ DatabaseSync: Database } = require("node:sqlite"));
        return new Database(filePath);
      } catch {
        console.error("SQLite package is missing. Run: npm install");
        process.exit(1);
      }
    }

    throw error;
  }
}

function canFallbackToBuiltinSqlite(error) {
  return (
    error?.code === "MODULE_NOT_FOUND" ||
    error?.code === "ERR_DLOPEN_FAILED" ||
    String(error?.message || "").includes("better_sqlite3.node")
  );
}

function ensureColumn(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  database.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
}

function parseJsonField(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToTrip(row) {
  return {
    id: row.id,
    title: row.title,
    days: Number(row.days),
    budget: row.budget,
    stops: parseJsonField(row.stops_json, []),
    info: row.info,
    kind: row.kind,
    plannerData: parseJsonField(row.planner_data_json, null),
    published: Boolean(row.published),
    publishedAt: row.published_at || "",
    savedAt: row.saved_at
  };
}

function rowToPayment(row) {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerPaymentId: row.provider_payment_id,
    amountNok: Number(row.amount_nok) || 0,
    currency: row.currency,
    status: row.status,
    plan: row.plan,
    vipDays: Number(row.vip_days) || 0,
    createdAt: row.created_at,
    paidAt: row.paid_at
  };
}

function rowToUser(row, trips) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
    trips,
    avatarUrl: row.avatar_url,
    oauthProvider: row.oauth_provider || "",
    oauthSubject: row.oauth_subject || "",
    vipPlan: row.vip_plan || "",
    vipUntil: row.vip_until || "",
    emailVerified: Boolean(row.email_verified),
    verificationToken: row.verification_token,
    verificationTokenExpiresAt: row.verification_token_expires_at
  };
}

function insertUserRecord(database, user) {
  database
    .prepare(
      `INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        avatar_url,
        oauth_provider,
        oauth_subject,
        vip_plan,
        vip_until,
        email_verified,
        verification_token,
        verification_token_expires_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.name,
      normalizeEmail(user.email),
      user.passwordHash,
      user.role === "admin" ? "admin" : "user",
      typeof user.avatarUrl === "string" ? user.avatarUrl : "",
      typeof user.oauthProvider === "string" ? user.oauthProvider : "",
      typeof user.oauthSubject === "string" ? user.oauthSubject : "",
      typeof user.vipPlan === "string" ? user.vipPlan : "",
      typeof user.vipUntil === "string" ? user.vipUntil : "",
      user.emailVerified ? 1 : 0,
      typeof user.verificationToken === "string" ? user.verificationToken : "",
      typeof user.verificationTokenExpiresAt === "string" ? user.verificationTokenExpiresAt : "",
      user.createdAt || new Date().toISOString()
    );

  const insertTrip = database.prepare(
    `INSERT INTO trips (
      id,
      user_id,
      title,
      days,
      budget,
      stops_json,
      info,
      kind,
      planner_data_json,
      published,
      published_at,
      saved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  (Array.isArray(user.trips) ? user.trips : []).forEach((trip) => {
    insertTrip.run(
      trip.id || randomUUID(),
      user.id,
      String(trip.title || ""),
      Number(trip.days) || 1,
      String(trip.budget || ""),
      JSON.stringify(Array.isArray(trip.stops) ? trip.stops : []),
      String(trip.info || ""),
      String(trip.kind || "saved"),
      trip.plannerData ? JSON.stringify(trip.plannerData) : null,
      trip.published ? 1 : 0,
      trip.publishedAt || "",
      trip.savedAt || new Date().toISOString()
    );
  });
}

async function readJsonUsersForMigration() {
  try {
    const content = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(content || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

async function migrateJsonUsersIfDatabaseIsEmpty() {
  const database = openDatabase();
  const { count } = database.prepare("SELECT COUNT(*) AS count FROM users").get();

  if (count > 0) {
    return;
  }

  const users = await readJsonUsersForMigration();

  if (!users.length) {
    return;
  }

  database.exec("BEGIN");

  try {
    users.map(normalizeUser).forEach((user) => insertUserRecord(database, user));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function readUsers() {
  await migrateJsonUsersIfDatabaseIsEmpty();
  const database = openDatabase();
  const userRows = database
    .prepare("SELECT * FROM users ORDER BY datetime(created_at) ASC")
    .all();
  const tripRows = database
    .prepare("SELECT * FROM trips ORDER BY datetime(saved_at) ASC")
    .all();
  const tripsByUserId = new Map();

  tripRows.forEach((row) => {
    const trips = tripsByUserId.get(row.user_id) || [];
    trips.push(rowToTrip(row));
    tripsByUserId.set(row.user_id, trips);
  });

  return userRows.map((row) => rowToUser(row, tripsByUserId.get(row.id) || []));
}

async function saveUsers(users) {
  const database = openDatabase();
  const existingPayments = database.prepare("SELECT * FROM payments").all();
  const existingRatings = database.prepare("SELECT * FROM route_ratings").all();
  const existingVpnSubscriptions = database.prepare("SELECT * FROM vpn_subscriptions").all();
  const existingVpnDevices = database.prepare("SELECT * FROM vpn_devices").all();
  const userIds = new Set(users.map((user) => user.id));
  database.exec("BEGIN");

  try {
    database.prepare("DELETE FROM trips").run();
    database.prepare("DELETE FROM users").run();
    users.map(normalizeUser).forEach((user) => insertUserRecord(database, user));
    database.prepare("DELETE FROM vpn_subscriptions").run();

    const insertVpnSubscription = database.prepare(`
      INSERT INTO vpn_subscriptions (
        id, user_id, plan, status, device_limit, starts_at, ends_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    existingVpnSubscriptions
      .filter((subscription) => userIds.has(subscription.user_id))
      .forEach((subscription) => {
        insertVpnSubscription.run(
          subscription.id,
          subscription.user_id,
          subscription.plan,
          subscription.status,
          subscription.device_limit,
          subscription.starts_at,
          subscription.ends_at,
          subscription.created_at,
          subscription.updated_at
        );
      });

    const usersWithRestoredVpn = new Set(
      existingVpnSubscriptions
        .filter((subscription) => userIds.has(subscription.user_id))
        .map((subscription) => subscription.user_id)
    );
    const now = new Date().toISOString();
    users
      .filter((user) => !usersWithRestoredVpn.has(user.id))
      .forEach((user) => {
        insertVpnSubscription.run(randomUUID(), user.id, "free", "active", 3, now, "", now, now);
      });

    const insertVpnDevice = database.prepare(`
      INSERT INTO vpn_devices (
        id, user_id, name, platform, status, created_at, last_seen_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    existingVpnDevices
      .filter((device) => userIds.has(device.user_id))
      .forEach((device) => {
        insertVpnDevice.run(
          device.id,
          device.user_id,
          device.name,
          device.platform,
          device.status,
          device.created_at,
          device.last_seen_at,
          device.revoked_at
        );
      });

    const insertPayment = database.prepare(
      `INSERT INTO payments (
        id,
        user_id,
        provider,
        provider_payment_id,
        amount_nok,
        currency,
        status,
        plan,
        vip_days,
        created_at,
        paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    existingPayments
      .filter((payment) => userIds.has(payment.user_id))
      .forEach((payment) => {
        insertPayment.run(
          payment.id,
          payment.user_id,
          payment.provider,
          payment.provider_payment_id,
          payment.amount_nok,
          payment.currency,
          payment.status,
          payment.plan,
          payment.vip_days,
          payment.created_at,
          payment.paid_at
        );
      });

    const insertRating = database.prepare(
      `INSERT OR REPLACE INTO route_ratings (
        route_id,
        user_id,
        rating,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)`
    );

    existingRatings
      .filter((rating) => userIds.has(rating.user_id))
      .forEach((rating) => {
        insertRating.run(
          rating.route_id,
          rating.user_id,
          rating.rating,
          rating.created_at,
          rating.updated_at
        );
      });
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function fetchPageText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      "accept-language": "en-US,en;q=0.9,no;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function extractCurrencyCandidates(html) {
  const results = [];
  const patterns = [
    /(?:NOK|kr)\s*([0-9][0-9\s.,]{1,10})/gi,
    /([0-9][0-9\s.,]{1,10})\s*(?:NOK|kr)/gi
  ];

  patterns.forEach((pattern) => {
    for (const match of html.matchAll(pattern)) {
      const raw = String(match[1] || "").trim();
      const digitsOnly = raw.replace(/[^\d]/g, "");
      const amount = Number(digitsOnly);

      if (Number.isFinite(amount) && amount >= 200 && amount <= 50000) {
        results.push(amount);
      }
    }
  });

  return results;
}

function pickReasonablePrice(candidates, fallback, min, max) {
  const filtered = candidates
    .filter((value) => value >= min && value <= max)
    .sort((a, b) => a - b);

  if (!filtered.length) {
    return fallback;
  }

  return filtered[Math.floor(filtered.length / 3)];
}

function getDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1, 1);
}

async function getBookingHotelEstimate({ city, startDate, endDate, people, rooms }) {
  const url =
    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}` +
    `&checkin=${encodeURIComponent(startDate)}` +
    `&checkout=${encodeURIComponent(endDate)}` +
    `&group_adults=${encodeURIComponent(people)}` +
    `&no_rooms=${encodeURIComponent(rooms)}` +
    "&selected_currency=NOK&lang=en-us";

  try {
    const html = await fetchPageText(url);
    const nightlyRateNok = pickReasonablePrice(
      extractCurrencyCandidates(html),
      DEFAULT_HOTEL_NIGHTLY_NOK,
      350,
      8000
    );

    return {
      nightlyRateNok,
      source: url,
      usedFallback: nightlyRateNok === DEFAULT_HOTEL_NIGHTLY_NOK
    };
  } catch {
    return {
      nightlyRateNok: DEFAULT_HOTEL_NIGHTLY_NOK,
      source: url,
      usedFallback: true
    };
  }
}

async function getHyreCarEstimate() {
  const url = "https://www.hyre.no/en/prices/";

  try {
    const html = await fetchPageText(url);
    const dailyRateNok = pickReasonablePrice(
      extractCurrencyCandidates(html),
      DEFAULT_CAR_DAILY_NOK,
      250,
      3000
    );

    return {
      dailyRateNok,
      source: url,
      usedFallback: dailyRateNok === DEFAULT_CAR_DAILY_NOK
    };
  } catch {
    return {
      dailyRateNok: DEFAULT_CAR_DAILY_NOK,
      source: url,
      usedFallback: true
    };
  }
}

function canPreviewVpn(user) {
  return user?.id === "b22e3c94-63ec-4d85-945f-05ec16aad38a" || getVpnAccess(user?.id).active;
}

function getVpnAccess(userId) {
  const row = userId ? openDatabase().prepare("SELECT * FROM vpn_subscriptions WHERE user_id = ?").get(userId) : null;
  return {
    active: Boolean(row && row.plan === "vpn" && row.status === "active" && Date.parse(row.ends_at) > Date.now()),
    until: row?.ends_at || "",
    deviceLimit: VPN_DEVICE_LIMIT
  };
}

function grantVpnAccess(userId, days) {
  if (!Number.isInteger(days) || days < 0 || days > 3650) {
    const error = new Error("VPN duration must be an integer from 0 to 3650 days.");
    error.status = 400;
    throw error;
  }
  const database = openDatabase();
  if (!database.prepare("SELECT id FROM users WHERE id = ?").get(userId)) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }
  const subscription = ensureVpnSubscription(userId);
  const now = Date.now();
  const currentEnd = subscription.plan === "vpn" && subscription.status === "active" ? Date.parse(subscription.ends_at) : 0;
  const until = days ? new Date(Math.max(now, currentEnd || 0) + days * 86400000).toISOString() : "";
  database.prepare(`UPDATE vpn_subscriptions
    SET plan = 'vpn', status = ?, device_limit = ?, starts_at = ?, ends_at = ?, updated_at = ?
    WHERE user_id = ?`).run(days ? "active" : "revoked", VPN_DEVICE_LIMIT,
      subscription.starts_at || new Date(now).toISOString(), until, new Date(now).toISOString(), userId);
  return getVpnAccess(userId);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || "",
    authProvider: user.oauthProvider || "password",
    vpnPreview: canPreviewVpn(user),
    vip: getVipStatus(user),
    emailVerified: Boolean(user.emailVerified)
  };
}

function publicAdminUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    emailVerified: Boolean(user.emailVerified),
    vip: getVipStatus(user),
    tripsCount: Array.isArray(user.trips) ? user.trips.length : 0,
    vpn: getVpnAccess(user.id)
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sameEmail(a, b) {
  return normalizeEmail(a) === normalizeEmail(b);
}

function normalizeUser(user) {
  const email = normalizeEmail(user.email);
  const storedRole = user.role === "admin" ? "admin" : "user";
  const role = ADMIN_EMAILS.has(email) ? "admin" : storedRole;

  return {
    ...user,
    role,
    trips: Array.isArray(user.trips) ? user.trips : [],
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : "",
    oauthProvider: typeof user.oauthProvider === "string" ? user.oauthProvider : "",
    oauthSubject: typeof user.oauthSubject === "string" ? user.oauthSubject : "",
    vipPlan: typeof user.vipPlan === "string" ? user.vipPlan : "",
    vipUntil: typeof user.vipUntil === "string" ? user.vipUntil : "",
    emailVerified: Boolean(user.emailVerified),
    verificationToken: typeof user.verificationToken === "string" ? user.verificationToken : "",
    verificationTokenExpiresAt:
      typeof user.verificationTokenExpiresAt === "string" ? user.verificationTokenExpiresAt : ""
  };
}

function getVipStatus(user) {
  const vipUntil = typeof user.vipUntil === "string" ? user.vipUntil : "";
  const expiresAt = vipUntil ? new Date(vipUntil).getTime() : 0;
  const active = Number.isFinite(expiresAt) && expiresAt > Date.now();

  return {
    active,
    plan: active ? user.vipPlan || "vip" : "",
    until: active ? vipUntil : ""
  };
}

async function getCurrentUserRecord(userId) {
  const users = (await readUsers()).map(normalizeUser);
  const user = users.find((item) => item.id === userId);
  return { users, user };
}

async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  try {
    const { user } = await getCurrentUserRecord(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Brukeren finnes ikke." });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (req.currentUser.role !== "admin") {
      return res.status(403).json({ error: "Bare administratorer kan gjøre dette." });
    }

    next();
  });
}

function flattenSavedRoutes(users) {
  return users.flatMap((user) =>
    user.trips.map((trip) => ({
      ...trip,
      ownerId: user.id,
      ownerName: user.name,
      ownerEmail: user.email
    }))
  );
}

function getRatingsMap(routeIds = [], userId = "") {
  const uniqueRouteIds = [...new Set(routeIds.filter(Boolean))];

  if (!uniqueRouteIds.length) {
    return new Map();
  }

  const database = openDatabase();
  const placeholders = uniqueRouteIds.map(() => "?").join(",");
  const summaryRows = database
    .prepare(
      `SELECT route_id, AVG(rating) AS average, COUNT(*) AS count
       FROM route_ratings
       WHERE route_id IN (${placeholders})
       GROUP BY route_id`
    )
    .all(...uniqueRouteIds);
  const userRows = userId
    ? database
        .prepare(
          `SELECT route_id, rating
           FROM route_ratings
           WHERE user_id = ? AND route_id IN (${placeholders})`
        )
        .all(userId, ...uniqueRouteIds)
    : [];
  const ratings = new Map();

  uniqueRouteIds.forEach((routeId) => {
    ratings.set(routeId, {
      average: 0,
      count: 0,
      myRating: 0
    });
  });

  summaryRows.forEach((row) => {
    ratings.set(row.route_id, {
      ...(ratings.get(row.route_id) || {}),
      average: Number(row.average) || 0,
      count: Number(row.count) || 0
    });
  });

  userRows.forEach((row) => {
    ratings.set(row.route_id, {
      ...(ratings.get(row.route_id) || {}),
      myRating: Number(row.rating) || 0
    });
  });

  return ratings;
}

function publicRouteFromTrip(trip, user) {
  return {
    id: trip.id,
    title: trip.title,
    days: trip.days,
    budget: trip.budget,
    stops: trip.stops,
    info: trip.info,
    kind: "published",
    plannerData: trip.plannerData,
    publishedAt: trip.publishedAt || trip.savedAt || "",
    ownerName: user.name
  };
}

function getAdminPayments() {
  const database = openDatabase();
  const rows = database
    .prepare(
      `SELECT
        payments.*,
        users.name AS user_name,
        users.email AS user_email,
        users.vip_plan AS user_vip_plan,
        users.vip_until AS user_vip_until
      FROM payments
      LEFT JOIN users ON users.id = payments.user_id
      ORDER BY datetime(payments.created_at) DESC`
    )
    .all();

  return rows.map((row) => ({
    ...rowToPayment(row),
    userName: row.user_name || "",
    userEmail: row.user_email || "",
    userVip: getVipStatus({
      vipPlan: row.user_vip_plan || "",
      vipUntil: row.user_vip_until || ""
    })
  }));
}

function createVerificationLink(token) {
  return `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(user) {
  if (!mailTransport) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  const verifyUrl = createVerificationLink(user.verificationToken);

  await mailTransport.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: "Bekreft e-posten din for PlanMyNord",
    text: `Hei ${user.name}!\n\nBekreft e-posten din her: ${verifyUrl}\n\nLenken utløper om 24 timer.`,
    html: `
      <p>Hei ${user.name}!</p>
      <p>Bekreft e-posten din for PlanMyNord ved å trykke på lenken under:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>Lenken utløper om 24 timer.</p>
    `
  });
}

function createGoogleAuthUrl(state) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function exchangeGoogleCode(code) {
  const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  }, GOOGLE_OAUTH_TIMEOUT_MS);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google token exchange failed.");
  }

  return data;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetchWithTimeout("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }, GOOGLE_OAUTH_TIMEOUT_MS);

  const profile = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(profile.error_description || profile.error || "Google profile fetch failed.");
  }

  return profile;
}

async function createAiSupportReply({ message, language, history }) {
  const input = [
    ...history.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "").slice(0, 500)
    })),
    {
      role: "user",
      content: `Language: ${language}\nQuestion: ${message}`
    }
  ];
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions:
        "You are PlanMyNord support. Answer briefly and practically. Help users with planning trips in Norway, accounts, Google login, saved routes, traffic lights, maps, payments as optional support, and admin access. Do not ask for passwords, secrets, OAuth codes, API keys, or payment card data. If the issue needs private account access, ask the user to contact kyrylojobb@gmail.com.",
      input,
      max_output_tokens: 450
    })
  }, OPENAI_TIMEOUT_MS);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI support request failed.");
  }

  return getOpenAIOutputText(data) || createLocalSupportReply(message, language);
}

function getOpenAIOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  return (Array.isArray(response.output) ? response.output : [])
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

function createLocalSupportReply(message, language = "ru") {
  const lowerMessage = message.toLowerCase();
  const isEnglish = language.startsWith("en");
  const isNorwegian = language.startsWith("no");

  if (/google|gmail|oauth|вход|логин|login|redirect|403|400/.test(lowerMessage)) {
    if (isEnglish) {
      return "For Google login, check that the app is External in Google Cloud and that Authorized redirect URI is exactly https://planmynord.com/auth/google/callback. Then restart the server and try again from the account page.";
    }
    if (isNorwegian) {
      return "For Google-innlogging: sjekk at appen er External i Google Cloud og at Authorized redirect URI er nøyaktig https://planmynord.com/auth/google/callback. Start serveren på nytt etter endringen.";
    }
    return "Для Google-входа проверь в Google Cloud: приложение должно быть External, а Authorized redirect URI должен быть точно https://planmynord.com/auth/google/callback. После изменения перезапусти сервер.";
  }

  if (/светофор|traffic|signal|trafikklys/.test(lowerMessage)) {
    if (isEnglish) {
      return "Traffic lights are loaded from OpenStreetMap through the server. Build a route first, then press Load traffic lights. On long routes the app loads them in smaller parts.";
    }
    if (isNorwegian) {
      return "Trafikklys hentes fra OpenStreetMap via serveren. Lag en rute først, og trykk Hent trafikklys. Lange ruter deles i mindre forespørsler.";
    }
    return "Светофоры загружаются из OpenStreetMap через сервер. Сначала создай маршрут, потом нажми «Загрузить светофоры». Длинные маршруты делятся на маленькие запросы.";
  }

  if (/билет|аэропорт|airport|flight|ticket|fly|billett|iata/.test(lowerMessage)) {
    if (isEnglish) {
      return "Open Flights, enter a departure city or IATA airport code from any country, for example WAW, BER or IST, choose a Norwegian airport such as OSL, BGO or TRD, then prepare the search.";
    }
    if (isNorwegian) {
      return "Åpne Flybilletter, skriv avreiseby eller IATA-kode fra et annet land, for eksempel WAW, BER eller IST, velg norsk flyplass som OSL, BGO eller TRD, og lag søket.";
    }
    return "Открой «Билеты», введи город или IATA-код вылета из любой страны, например WAW, BER или IST, выбери аэропорт в Норвегии с кодом OSL, BGO или TRD и нажми «Подготовить поиск».";
  }

  if (/маршрут|route|reise|rute|save|сохран/.test(lowerMessage)) {
    if (isEnglish) {
      return "Create a route in the planner, then use Save route. Saved and published routes are available from Profile and Ready routes.";
    }
    if (isNorwegian) {
      return "Lag en rute i planleggeren, og bruk Lagre rute. Lagrede og publiserte ruter finner du i Profil og Ferdige ruter.";
    }
    return "Создай маршрут в планировщике и нажми «Сохранить маршрут». Сохранённые и опубликованные маршруты будут в «Профиль» и «Готовые маршруты».";
  }

  if (/admin|админ|роль|role/.test(lowerMessage)) {
    if (isEnglish) {
      return "Admin access is controlled by the ADMIN_EMAILS value in .env. Add the email, restart the server, then log in with that account.";
    }
    if (isNorwegian) {
      return "Admin-tilgang styres av ADMIN_EMAILS i .env. Legg til e-posten, start serveren på nytt, og logg inn med den kontoen.";
    }
    return "Админ-доступ задаётся через ADMIN_EMAILS в .env. Добавь почту, перезапусти сервер и войди через этот аккаунт.";
  }

  if (isEnglish) {
    return "I can help with routes, Google login, saved trips, traffic lights, accounts, and support payments. Tell me what happened and what page you are on.";
  }
  if (isNorwegian) {
    return "Jeg kan hjelpe med ruter, Google-innlogging, lagrede turer, trafikklys, konto og støttebetaling. Skriv hva som skjedde og hvilken side du er på.";
  }
  return "Я могу помочь с маршрутами, Google-входом, сохранёнными поездками, светофорами, аккаунтом и поддержкой проекта. Напиши, что случилось и на какой ты странице.";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function findOrCreateGoogleUser(profile) {
  const email = normalizeEmail(profile.email);

  if (!email || !profile.sub || !profile.email_verified) {
    throw new Error("Google account must have a verified email.");
  }

  const users = (await readUsers()).map(normalizeUser);
  const existingUser = users.find((user) => (
    user.oauthProvider === "google" && user.oauthSubject === profile.sub
  )) || users.find((user) => sameEmail(user.email, email));

  if (existingUser) {
    const updatedUser = {
      ...existingUser,
      name: existingUser.name || profile.name || email,
      avatarUrl: existingUser.avatarUrl || profile.picture || "",
      emailVerified: true,
      oauthProvider: "google",
      oauthSubject: profile.sub,
      verificationToken: "",
      verificationTokenExpiresAt: ""
    };

    const updatedUsers = users.map((user) => (user.id === existingUser.id ? updatedUser : user));
    await saveUsers(updatedUsers);
    return updatedUser;
  }

  const user = {
    id: randomUUID(),
    name: profile.name || email,
    email,
    role: "user",
    passwordHash: await bcrypt.hash(randomUUID(), 10),
    createdAt: new Date().toISOString(),
    trips: [],
    avatarUrl: profile.picture || "",
    oauthProvider: "google",
    oauthSubject: profile.sub,
    vipPlan: "",
    vipUntil: "",
    emailVerified: true,
    verificationToken: "",
    verificationTokenExpiresAt: ""
  };

  users.push(user);
  await saveUsers(users);
  return user;
}

function verificationExpired(user) {
  if (!user.verificationTokenExpiresAt) {
    return true;
  }

  return Date.now() > new Date(user.verificationTokenExpiresAt).getTime();
}

function validateAvatarDataUrl(avatarUrl) {
  if (!avatarUrl.startsWith("data:image/")) {
    return "Velg et gyldig bilde.";
  }

  if (avatarUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
    return "Bildet er for stort.";
  }

  const match = avatarUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = match?.[1] || "";

  if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
    return "Bare JPG, PNG eller WEBP er tillatt.";
  }

  return "";
}

function parseTicketDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([a-zA-Z0-9.+/-]+);base64,([a-zA-Z0-9+/=\r\n]+)$/);
  if (!match || !ALLOWED_TICKET_MIME_TYPES.has(match[1])) {
    return { error: "Bare PDF, JPG, PNG eller WEBP er tillatt." };
  }

  const content = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!content.length || content.length > MAX_TICKET_BYTES) {
    return { error: "Billetten må være mellom 1 byte og 5 MB." };
  }

  return { mimeType: match[1], content };
}

function safeDownloadName(value) {
  const cleaned = String(value || "ticket")
    .replace(/[\r\n"\\/<>:*?|]+/g, "_")
    .trim()
    .slice(0, 120);
  return cleaned || "ticket";
}

function getVipProduct() {
  return {
    name: VIP_PLAN_NAME,
    priceNok: VIP_PRICE_NOK,
    durationDays: VIP_DURATION_DAYS
  };
}

function getVpnProduct() {
  return { name: VPN_PLAN_NAME, priceNok: VPN_PRICE_NOK, durationDays: VPN_DURATION_DAYS, deviceLimit: VPN_DEVICE_LIMIT };
}

function createPaymentRecord({ userId, provider, providerPaymentId = "", amountNok = VIP_PRICE_NOK, plan = "vip" }) {
  const database = openDatabase();
  const payment = {
    id: randomUUID(),
    userId,
    provider,
    providerPaymentId,
    amountNok,
    currency: "NOK",
    status: "pending",
    plan,
    vipDays: plan === "support" ? 0 : VIP_DURATION_DAYS,
    createdAt: new Date().toISOString()
  };

  database
    .prepare(
      `INSERT INTO payments (
        id,
        user_id,
        provider,
        provider_payment_id,
        amount_nok,
        currency,
        status,
        plan,
        vip_days,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payment.id,
      payment.userId,
      payment.provider,
      payment.providerPaymentId,
      payment.amountNok,
      payment.currency,
      payment.status,
      payment.plan,
      payment.vipDays,
      payment.createdAt
    );

  return payment;
}

function updatePaymentProviderId(paymentId, providerPaymentId) {
  openDatabase()
    .prepare("UPDATE payments SET provider_payment_id = ? WHERE id = ?")
    .run(String(providerPaymentId || ""), paymentId);
}

async function completePaymentFromProvider({ provider, providerPaymentId, paymentId, userId }) {
  const database = openDatabase();
  const payment = paymentId
    ? database.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId)
    : database
        .prepare("SELECT * FROM payments WHERE provider = ? AND provider_payment_id = ?")
        .get(provider, providerPaymentId || "");

  if (!payment || payment.status === "paid") {
    return;
  }

  if (payment.provider !== provider || (payment.provider_payment_id && payment.provider_payment_id !== providerPaymentId)) {
    throw new Error("Payment provider mismatch.");
  }

  if (userId && payment.user_id !== userId) {
    throw new Error("Payment user mismatch.");
  }

  const currentUser = database.prepare("SELECT vip_until FROM users WHERE id = ?").get(payment.user_id);

  if (!currentUser) {
    throw new Error("Payment user not found.");
  }

  const now = Date.now();
  const currentVipUntil = currentUser.vip_until ? new Date(currentUser.vip_until).getTime() : 0;
  const startsAt = Number.isFinite(currentVipUntil) && currentVipUntil > now ? currentVipUntil : now;
  const vipUntil = new Date(startsAt + payment.vip_days * 24 * 60 * 60 * 1000).toISOString();
  const paidAt = new Date().toISOString();

  database.exec("BEGIN");

  try {
    database
      .prepare(
        `UPDATE payments
         SET status = 'paid', provider_payment_id = ?, paid_at = ?
         WHERE id = ?`
      )
      .run(providerPaymentId || payment.provider_payment_id || "", paidAt, payment.id);
    if (payment.plan === "vpn") {
      const currentVpn = database.prepare("SELECT ends_at FROM vpn_subscriptions WHERE user_id = ?").get(payment.user_id);
      const currentVpnEnd = currentVpn?.ends_at ? new Date(currentVpn.ends_at).getTime() : 0;
      const vpnStart = Number.isFinite(currentVpnEnd) && currentVpnEnd > now ? currentVpnEnd : now;
      const vpnEnd = new Date(vpnStart + payment.vip_days * 24 * 60 * 60 * 1000).toISOString();
      database.prepare(`
        UPDATE vpn_subscriptions
        SET plan = 'vpn', status = 'active', device_limit = ?, starts_at = ?, ends_at = ?, updated_at = ?
        WHERE user_id = ?
      `).run(VPN_DEVICE_LIMIT, paidAt, vpnEnd, paidAt, payment.user_id);
    } else if (payment.plan !== "support") {
      database.prepare("UPDATE users SET vip_plan = ?, vip_until = ? WHERE id = ?")
        .run(payment.plan, vipUntil, payment.user_id);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function isValidStripeSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !STRIPE_WEBHOOK_SECRET) {
    return false;
  }

  const parts = String(signatureHeader)
    .split(",")
    .map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestamp || !signatures.length) {
    return false;
  }

  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, "hex");
    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  });
}

function postFormJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const bodyText = body instanceof URLSearchParams ? body.toString() : String(body || "");
    const request = https.request(
      {
        method: "POST",
        hostname: parsedUrl.hostname,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(bodyText)
        }
      },
      (response) => {
        let responseText = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseText += chunk;
        });
        response.on("end", () => {
          let data = {};

          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            data = { raw: responseText };
          }

          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            data
          });
        });
      }
    );

    request.on("error", reject);
    request.write(bodyText);
    request.end();
  });
}

function isValidBounds(bounds) {
  return (
    Number.isFinite(bounds.south) &&
    Number.isFinite(bounds.west) &&
    Number.isFinite(bounds.north) &&
    Number.isFinite(bounds.east) &&
    bounds.south >= -90 &&
    bounds.north <= 90 &&
    bounds.west >= -180 &&
    bounds.east <= 180 &&
    bounds.south < bounds.north &&
    bounds.west < bounds.east
  );
}

function createOverpassPointQuery(tagKey, tagValue, bounds, limitClause = "") {
  return `
    [out:json][timeout:18];
    node["${tagKey}"="${tagValue}"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    out body${limitClause};
  `;
}

async function fetchOverpassElements(query, userAgent) {
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": userAgent
    },
    body: new URLSearchParams({ data: query })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.remark || "Overpass svarte ikke akkurat nå.");
    error.status = response.status;
    throw error;
  }

  return Array.isArray(data.elements) ? data.elements : [];
}

function getPostgisPool() {
  if (!POSTGIS_DATABASE_URL || !PgPool) {
    return null;
  }

  if (!postgisPool) {
    postgisPool = new PgPool({
      connectionString: POSTGIS_DATABASE_URL,
      max: Number(process.env.POSTGIS_POOL_SIZE) || 4,
      ssl: String(process.env.POSTGIS_SSL || "").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return postgisPool;
}

async function ensurePostgis() {
  const pool = getPostgisPool();

  if (!pool) {
    return null;
  }

  if (!postgisReadyPromise) {
    postgisReadyPromise = pool
      .query(`
        CREATE EXTENSION IF NOT EXISTS postgis;

        CREATE TABLE IF NOT EXISTS geo_points (
          id BIGSERIAL PRIMARY KEY,
          source TEXT NOT NULL,
          source_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          tags_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          geom geometry(Point, 4326) NOT NULL,
          fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (source, source_id)
        );

        CREATE INDEX IF NOT EXISTS idx_geo_points_geom ON geo_points USING GIST (geom);
        CREATE INDEX IF NOT EXISTS idx_geo_points_kind ON geo_points (source, kind);

        CREATE TABLE IF NOT EXISTS geo_bbox_cache (
          id BIGSERIAL PRIMARY KEY,
          source TEXT NOT NULL,
          kind TEXT NOT NULL,
          south DOUBLE PRECISION NOT NULL,
          west DOUBLE PRECISION NOT NULL,
          north DOUBLE PRECISION NOT NULL,
          east DOUBLE PRECISION NOT NULL,
          geom geometry(Polygon, 4326) NOT NULL,
          fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_geo_bbox_cache_geom ON geo_bbox_cache USING GIST (geom);
        CREATE INDEX IF NOT EXISTS idx_geo_bbox_cache_kind ON geo_bbox_cache (source, kind, fetched_at);
      `)
      .then(() => pool)
      .catch((error) => {
        postgisDisabledReason = error.message;
        postgisReadyPromise = null;
        return null;
      });
  }

  const readyPool = await postgisReadyPromise;

  if (!readyPool && postgisDisabledReason && !postgisWarningShown) {
    postgisWarningShown = true;
    console.warn(`PostGIS disabled: ${postgisDisabledReason}`);
  }

  return readyPool;
}

async function readCachedGeoPoints(kind, bounds) {
  const pool = await ensurePostgis();

  if (!pool) {
    return null;
  }

  const area = await pool.query(
    `
      SELECT 1
      FROM geo_bbox_cache
      WHERE source = 'overpass'
        AND kind = $1
        AND fetched_at > now() - ($2::text || ' hours')::interval
        AND ST_Covers(geom, ST_MakeEnvelope($3, $4, $5, $6, 4326))
      LIMIT 1
    `,
    [kind, POSTGIS_CACHE_TTL_HOURS, bounds.west, bounds.south, bounds.east, bounds.north]
  );

  if (!area.rowCount) {
    return null;
  }

  const rows = await pool.query(
    `
      SELECT source_id, tags_json, ST_Y(geom) AS lat, ST_X(geom) AS lon
      FROM geo_points
      WHERE source = 'overpass'
        AND kind = $1
        AND geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)
    `,
    [kind, bounds.west, bounds.south, bounds.east, bounds.north]
  );

  return rows.rows.map((row) => ({
    type: "node",
    id: Number(row.source_id) || row.source_id,
    lat: Number(row.lat),
    lon: Number(row.lon),
    tags: row.tags_json || {}
  }));
}

async function writeCachedGeoPoints(kind, bounds, elements) {
  const pool = await ensurePostgis();

  if (!pool) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const element of elements) {
      const lat = Number(element.lat);
      const lon = Number(element.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue;
      }

      const tags = element.tags && typeof element.tags === "object" ? element.tags : {};
      const name = String(tags.name || tags.brand || "");

      await client.query(
        `
          INSERT INTO geo_points (source, source_id, kind, name, tags_json, geom, fetched_at)
          VALUES ('overpass', $1, $2, $3, $4::jsonb, ST_SetSRID(ST_MakePoint($5, $6), 4326), now())
          ON CONFLICT (source, source_id) DO UPDATE SET
            kind = excluded.kind,
            name = excluded.name,
            tags_json = excluded.tags_json,
            geom = excluded.geom,
            fetched_at = excluded.fetched_at
        `,
        [String(element.id), kind, name, JSON.stringify(tags), lon, lat]
      );
    }

    await client.query(
      `
        INSERT INTO geo_bbox_cache (source, kind, south, west, north, east, geom, fetched_at)
        VALUES ('overpass', $1, $2, $3, $4, $5, ST_MakeEnvelope($3, $2, $5, $4, 4326), now())
      `,
      [kind, bounds.south, bounds.west, bounds.north, bounds.east]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.warn(`PostGIS cache write failed for ${kind}:`, error.message);
  } finally {
    client.release();
  }
}

async function getOverpassGeoElements({ kind, bounds, tagKey, tagValue, limitClause = "", userAgent }) {
  const cachedElements = await readCachedGeoPoints(kind, bounds).catch((error) => {
    console.warn(`PostGIS cache read failed for ${kind}:`, error.message);
    return null;
  });

  if (cachedElements) {
    return { elements: cachedElements, source: "postgis-cache" };
  }

  const query = createOverpassPointQuery(tagKey, tagValue, bounds, limitClause);
  const elements = await fetchOverpassElements(query, userAgent);
  await writeCachedGeoPoints(kind, bounds, elements);
  return { elements, source: "overpass" };
}

async function createStripeCheckoutSession(user, payment) {
  const successUrl = `${APP_BASE_URL}/payment-success.html`;
  const cancelUrl = `${APP_BASE_URL}/payment-cancel.html`;
  const params = new URLSearchParams({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[paymentId]": payment.id,
    "metadata[userId]": user.id,
    "metadata[plan]": payment.plan,
    "payment_method_types[0]": "card"
  });

  const configuredStripePriceId = payment.plan === "support" ? "" : payment.plan === "vpn" ? STRIPE_VPN_PRICE_ID : STRIPE_VIP_PRICE_ID;
  if (configuredStripePriceId) {
    params.set("line_items[0][price]", configuredStripePriceId);
  } else {
    params.set("line_items[0][price_data][currency]", "nok");
    params.set("line_items[0][price_data][product_data][name]", payment.plan === "vpn" ? VPN_PLAN_NAME : VIP_PLAN_NAME);
    params.set("line_items[0][price_data][unit_amount]", String(payment.amountNok * 100));
  }

  params.set("line_items[0][quantity]", "1");

  const response = await postFormJson(
    "https://api.stripe.com/v1/checkout/sessions",
    params,
    {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  );
  const data = response.data || {};

  if (!response.ok || !data.url) {
    throw new Error(data.error?.message || "Stripe checkout failed.");
  }

  updatePaymentProviderId(payment.id, data.id);
  return data.url;
}

async function getVippsAccessToken() {
  const response = await fetch(`${VIPPS_API_BASE_URL}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: VIPPS_CLIENT_ID,
      client_secret: VIPPS_CLIENT_SECRET,
      "Ocp-Apim-Subscription-Key": VIPPS_SUBSCRIPTION_KEY,
      "Merchant-Serial-Number": VIPPS_MERCHANT_SERIAL_NUMBER
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.message || "Vipps token failed.");
  }

  return data.access_token;
}

async function createVippsPayment(user, payment) {
  const accessToken = await getVippsAccessToken();
  const reference = payment.id.replace(/-/g, "");
  const response = await fetch(`${VIPPS_API_BASE_URL}/epayment/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": VIPPS_SUBSCRIPTION_KEY,
      "Merchant-Serial-Number": VIPPS_MERCHANT_SERIAL_NUMBER,
      "Vipps-System-Name": VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": VIPPS_SYSTEM_VERSION
    },
    body: JSON.stringify({
      amount: {
        currency: "NOK",
        value: payment.amountNok * 100
      },
      paymentMethod: {
        type: "WALLET"
      },
      reference,
      returnUrl: `${APP_BASE_URL}/payment-success.html`,
      userFlow: "WEB_REDIRECT",
      paymentDescription: payment.plan === "vpn" ? VPN_PLAN_NAME : VIP_PLAN_NAME,
      metadata: {
        paymentId: payment.id,
        userId: user.id
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  const redirectUrl = data.redirectUrl || data.url || data.paymentUrl;

  if (!response.ok || !redirectUrl) {
    throw new Error(data.detail || data.message || "Vipps payment failed.");
  }

  updatePaymentProviderId(payment.id, reference);
  return redirectUrl;
}

app.get("/api/support/product", (req, res) => {
  res.json({ amounts: [10, 50, 100, 200, 500, 1000], currency: "NOK",
    providers: { stripe: Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET) } });
});

app.post("/api/support/payment", requireAuth, writeLimiter, async (req, res) => {
  const amount = req.body.amountNok;
  if (!Number.isSafeInteger(amount) || amount < 10 || amount > 10000 || req.body.consent !== true) {
    return res.status(400).json({ error: "Invalid amount or missing consent." });
  }
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Card payments are not configured." });
  }
  try {
    const payment = createPaymentRecord({ userId: req.currentUser.id, provider: "stripe", amountNok: amount, plan: "support" });
    const url = await createStripeCheckoutSession(req.currentUser, payment);
    res.status(201).json({ url });
  } catch (error) {
    console.error("Support checkout failed:", error.code || error.name);
    res.status(502).json({ error: "Could not start payment." });
  }
});

app.get("/api/vip/product", (req, res) => {
  res.json({
    product: getVipProduct(),
    providers: {
      stripe: Boolean(STRIPE_SECRET_KEY),
      vipps: Boolean(
        VIPPS_CLIENT_ID &&
          VIPPS_CLIENT_SECRET &&
          VIPPS_SUBSCRIPTION_KEY &&
          VIPPS_MERCHANT_SERIAL_NUMBER
      )
    }
  });
});

app.get("/api/vpn/product", (req, res) => {
  res.json({
    product: getVpnProduct(),
    configured: VPN_PROFILE_DELIVERY_ENABLED,
    providers: {
      stripe: Boolean(STRIPE_SECRET_KEY),
      vipps: Boolean(VIPPS_CLIENT_ID && VIPPS_CLIENT_SECRET && VIPPS_SUBSCRIPTION_KEY && VIPPS_MERCHANT_SERIAL_NUMBER)
    }
  });
});

function createVpnPaymentRecord({ userId, provider }) {
  const payment = {
    id: randomUUID(), userId, provider, providerPaymentId: "", amountNok: VPN_PRICE_NOK,
    currency: "NOK", status: "pending", plan: "vpn", vipDays: VPN_DURATION_DAYS,
    createdAt: new Date().toISOString()
  };
  openDatabase().prepare(`
    INSERT INTO payments (id,user_id,provider,provider_payment_id,amount_nok,currency,status,plan,vip_days,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(payment.id, payment.userId, payment.provider, "", payment.amountNok, payment.currency,
    payment.status, payment.plan, payment.vipDays, payment.createdAt);
  return payment;
}

app.post("/api/vpn/payment/card/create", requireAuth, writeLimiter, async (req, res) => {
  if (!VPN_PROFILE_DELIVERY_ENABLED) return res.status(503).json({ error: "Оплата VPN включится после настройки выдачи VPN-профилей." });
  if (!STRIPE_SECRET_KEY) return res.status(503).json({ error: "Stripe er ikke satt opp på serveren ennå." });
  try {
    const payment = createVpnPaymentRecord({ userId: req.currentUser.id, provider: "stripe" });
    const url = await createStripeCheckoutSession(req.currentUser, payment);
    res.status(201).json({ url });
  } catch (error) {
    console.error("VPN card payment creation failed:", error);
    res.status(500).json({ error: "Не удалось начать оплату VPN." });
  }
});

app.post("/api/vpn/payment/vipps/create", requireAuth, writeLimiter, async (req, res) => {
  if (!VPN_PROFILE_DELIVERY_ENABLED) return res.status(503).json({ error: "Оплата VPN включится после настройки выдачи VPN-профилей." });
  if (!(VIPPS_CLIENT_ID && VIPPS_CLIENT_SECRET && VIPPS_SUBSCRIPTION_KEY && VIPPS_MERCHANT_SERIAL_NUMBER)) {
    return res.status(503).json({ error: "Vipps er ikke satt opp på serveren ennå." });
  }
  try {
    const payment = createVpnPaymentRecord({ userId: req.currentUser.id, provider: "vipps" });
    const url = await createVippsPayment(req.currentUser, payment);
    res.status(201).json({ url });
  } catch (error) {
    console.error("VPN Vipps payment creation failed:", error);
    res.status(500).json({ error: "Не удалось начать оплату VPN." });
  }
});

const TRAFFIC_SIGNAL_NVDB_TYPE_ID = 90;
const TRAFFIC_SIGNAL_NVDB_TIMEOUT_MS = 9000;
const TRAFFIC_SIGNAL_OVERPASS_TIMEOUT_MS = 9000;

async function fetchNvdbTrafficSignals(bounds) {
  const url = new URL(
    `https://nvdbapiles.atlas.vegvesen.no/vegobjekter/api/v4/vegobjekter/${TRAFFIC_SIGNAL_NVDB_TYPE_ID}`
  );
  url.searchParams.set("kartutsnitt", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  url.searchParams.set("srid", "4326");
  url.searchParams.set("inkluder", "metadata,geometri,lokasjon");
  url.searchParams.set("antall", "100");
  url.searchParams.set("inkluderAntall", "false");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRAFFIC_SIGNAL_NVDB_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Client": "TripPlanner/1.0",
        "User-Agent": "TripPlanner/1.0 (nvdb-traffic-signals)"
      },
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || data.title || "NVDB svarte ikke akkurat nå.");
    }

    return (Array.isArray(data.objekter) ? data.objekter : [])
      .map((object) => {
        const coordinates = parseNvdbPointWkt(object.geometri?.wkt || object.lokasjon?.geometri?.wkt);

        if (!coordinates) {
          return null;
        }

        return {
          id: `nvdb-${object.id}`,
          lon: coordinates[0],
          lat: coordinates[1],
          tags: {
            source: "NVDB",
            type: object.metadata?.type?.navn || "Signalpunkt"
          }
        };
      })
      .filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

function parseNvdbPointWkt(wkt) {
  const match = String(wkt || "").match(/POINT(?:\s+Z)?\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i);

  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  // NVDB returns WGS84 point WKT as lat lon for these objects.
  if (first >= 57 && first <= 72 && second >= 4 && second <= 32) {
    return [second, first];
  }

  return [first, second];
}

async function fetchOverpassTrafficSignals(bounds) {
  const query = `
    [out:json][timeout:8];
    node["highway"="traffic_signals"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    out body;
  `;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRAFFIC_SIGNAL_OVERPASS_TIMEOUT_MS);

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "TripPlanner/1.0 (traffic-signals)"
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.remark || "Overpass svarte ikke akkurat nå.");
    }

    return Array.isArray(data.elements) ? data.elements : [];
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/traffic-signals", estimateLimiter, async (req, res) => {
  const bounds = {
    south: Number(req.query.south),
    west: Number(req.query.west),
    north: Number(req.query.north),
    east: Number(req.query.east)
  };

  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east) ||
    bounds.south >= bounds.north ||
    bounds.west >= bounds.east
  ) {
    return res.status(400).json({ error: "Ugyldig kartområde." });
  }

  if ((bounds.north - bounds.south) * (bounds.east - bounds.west) > 2.5) {
    return res.status(400).json({ error: "Kartområdet er for stort." });
  }

  try {
    const nvdbElements = await fetchNvdbTrafficSignals(bounds);

    if (nvdbElements.length) {
      return res.json({ elements: nvdbElements, source: "nvdb" });
    }

    const overpassElements = await fetchOverpassTrafficSignals(bounds);
    return res.json({ elements: overpassElements, source: "overpass" });
  } catch (nvdbError) {
    console.warn("NVDB traffic signals lookup failed, trying Overpass:", nvdbError);

    try {
      const overpassElements = await fetchOverpassTrafficSignals(bounds);
      return res.json({ elements: overpassElements, source: "overpass" });
    } catch (overpassError) {
      console.error("Traffic signals lookup failed:", overpassError);
      return res.status(502).json({ error: "Kunne ikke hente trafikklys akkurat nå." });
    }
  }
});

app.get("/api/map-trees", estimateLimiter, async (req, res) => {
  const bounds = {
    south: Number(req.query.south),
    west: Number(req.query.west),
    north: Number(req.query.north),
    east: Number(req.query.east)
  };

  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east) ||
    bounds.south >= bounds.north ||
    bounds.west >= bounds.east
  ) {
    return res.status(400).json({ error: "Ugyldig kartområde." });
  }

  if ((bounds.north - bounds.south) * (bounds.east - bounds.west) > 0.55) {
    return res.status(400).json({ error: "Kartområdet er for stort." });
  }

  const query = `
    [out:json][timeout:16];
    node["natural"="tree"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    out body 240;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "TripPlanner/1.0 (map-trees)"
      },
      body: new URLSearchParams({ data: query })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        error: data.remark || "Overpass svarte ikke akkurat nå."
      });
    }

    res.json({
      elements: Array.isArray(data.elements) ? data.elements : []
    });
  } catch (error) {
    console.error("Tree lookup failed:", error);
    res.status(502).json({ error: "Kunne ikke hente trær akkurat nå." });
  }
});

app.get("/api/weather", estimateLimiter, async (req, res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({ error: "Ugyldige koordinater." });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "TripPlanner/1.0 (weather)"
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        error: data.reason || "Været svarte ikke akkurat nå."
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Weather lookup failed:", error);
    res.status(502).json({ error: "Kunne ikke hente vær akkurat nå." });
  }
});

app.post("/api/support/chat", supportLimiter, async (req, res) => {
  const message = String(req.body.message || "").trim().slice(0, 700);
  const language = String(req.body.language || "ru").trim().slice(0, 8);
  const history = Array.isArray(req.body.history) ? req.body.history.slice(-6) : [];

  if (!message) {
    return res.status(400).json({ error: "Melding mangler." });
  }

  try {
    if (OPENAI_API_KEY) {
      const reply = await createAiSupportReply({ message, language, history });
      return res.json({ reply, mode: "ai" });
    }

    res.json({
      reply: createLocalSupportReply(message, language),
      mode: "local"
    });
  } catch (error) {
    console.error("AI support failed:", error);
    res.json({
      reply: createLocalSupportReply(message, language),
      mode: "local"
    });
  }
});

app.post("/api/payments/card/create", requireAuth, writeLimiter, async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Stripe er ikke satt opp på serveren ennå." });
  }

  try {
    const payment = createPaymentRecord({
      userId: req.currentUser.id,
      provider: "stripe"
    });
    const url = await createStripeCheckoutSession(req.currentUser, payment);
    res.status(201).json({ url });
  } catch (error) {
    console.error("Stripe payment creation failed:", error);
    res.status(500).json({
      error: `Kunne ikke starte kortbetaling: ${error.message || "ukjent Stripe-feil."}`
    });
  }
});

app.post("/api/payments/vipps/create", requireAuth, writeLimiter, async (req, res) => {
  const vippsConfigured = Boolean(
    VIPPS_CLIENT_ID &&
      VIPPS_CLIENT_SECRET &&
      VIPPS_SUBSCRIPTION_KEY &&
      VIPPS_MERCHANT_SERIAL_NUMBER
  );

  if (!vippsConfigured) {
    return res.status(503).json({ error: "Vipps er ikke satt opp på serveren ennå." });
  }

  try {
    const payment = createPaymentRecord({
      userId: req.currentUser.id,
      provider: "vipps"
    });
    const url = await createVippsPayment(req.currentUser, payment);
    res.status(201).json({ url });
  } catch (error) {
    console.error("Vipps payment creation failed:", error);
    res.status(500).json({
      error: `Kunne ikke starte Vipps-betaling: ${error.message || "ukjent Vipps-feil."}`
    });
  }
});

app.post("/api/webhooks/vipps", async (req, res) => {
  try {
    const state = String(req.body.state || req.body.status || "").toUpperCase();
    const reference = String(req.body.reference || req.body.paymentReference || "").trim();
    const paymentId = String(req.body.metadata?.paymentId || "").trim();
    const userId = String(req.body.metadata?.userId || "").trim();
    const paidStates = new Set(["AUTHORIZED", "CAPTURED", "COMPLETED", "RESERVED"]);

    if (paidStates.has(state)) {
      await completePaymentFromProvider({
        provider: "vipps",
        providerPaymentId: reference,
        paymentId,
        userId
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Vipps webhook failed:", error);
    res.status(500).json({ error: "Vipps webhook failed." });
  }
});

app.post("/api/budget-estimate", estimateLimiter, async (req, res) => {
  try {
    const city = String(req.body.city || "").trim();
    const startDate = String(req.body.startDate || "").trim();
    const endDate = String(req.body.endDate || "").trim();
    const people = Math.max(Number(req.body.people) || 1, 1);
    const carRentalEnabled = Boolean(req.body.carRentalEnabled);

    if (!city || !startDate || !endDate) {
      return res.status(400).json({ error: "Mangler by eller datoer." });
    }

    const days = getDaysBetween(startDate, endDate);
    const nights = Math.max(days - 1, 1);
    const rooms = Math.max(Math.ceil(people / 2), 1);

    const hotelEstimate = await getBookingHotelEstimate({
      city,
      startDate,
      endDate,
      people,
      rooms
    });

    const carEstimate = carRentalEnabled
      ? await getHyreCarEstimate()
      : {
          dailyRateNok: 0,
          source: "",
          usedFallback: false
        };

    res.json({
      city,
      people,
      days,
      nights,
      rooms,
      hotelNightlyNok: hotelEstimate.nightlyRateNok,
      hotelTotalNok: hotelEstimate.nightlyRateNok * nights * rooms,
      hotelSource: hotelEstimate.source,
      carDailyNok: carEstimate.dailyRateNok,
      carTotalNok: carEstimate.dailyRateNok * days,
      carSource: carEstimate.source,
      fallbackUsed: hotelEstimate.usedFallback || carEstimate.usedFallback
    });
  } catch (error) {
    console.error("Budget estimate failed:", error);
    res.status(500).json({ error: "Prisestimat feilet på serveren." });
  }
});

app.get("/api/auth/providers", (req, res) => {
  res.json({
    google: {
      enabled: googleOAuthConfigured
    }
  });
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

app.get("/auth/google", googleAuthLimiter, (req, res) => {
  if (!googleOAuthConfigured) {
    return res.redirect("/account.html?oauth=google_unconfigured");
  }

  const state = randomUUID();
  req.session.oauthState = state;
  req.session.save((error) => {
    if (error) {
      console.error("Google OAuth state save failed:", error.code || error.name);
      return res.redirect("/account.html?oauth=session");
    }
    res.redirect(createGoogleAuthUrl(state));
  });
});

app.get("/auth/google/callback", googleAuthLimiter, async (req, res) => {
  try {
    const error = String(req.query.error || "");
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    if (error) {
      return res.redirect("/account.html?oauth=cancelled");
    }

    if (!code || !state || state !== req.session.oauthState) {
      return res.redirect("/account.html?oauth=invalid");
    }

    delete req.session.oauthState;
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const user = await findOrCreateGoogleUser(profile);

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Google login session failed:", sessionError);
        return res.redirect("/account.html?oauth=session");
      }

      req.session.userId = user.id;
      req.session.save((saveError) => {
        if (saveError) {
          console.error("Google login session save failed:", saveError.code || saveError.name);
          return res.redirect("/account.html?oauth=session");
        }
        res.redirect("/profile.html");
      });
    });
  } catch (error) {
    console.error("Google OAuth failed:", error);
    res.redirect(`/account.html?oauth=${error?.name === "AbortError" ? "timeout" : "failed"}`);
  }
});

app.post("/api/register", authLimiter, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fyll ut alle feltene." });
  }

  if (!email.includes("@") || !email.includes(".")) {
    return res.status(400).json({ error: "Skriv inn en gyldig e-postadresse." });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "Passordet må ha minst 4 tegn." });
  }

  if (!smtpConfigured) {
    return res.status(500).json({ error: "E-postoppsett mangler på serveren." });
  }

  const users = (await readUsers()).map(normalizeUser);
  const exists = users.some((user) => sameEmail(user.email, email));

  if (exists) {
    return res.status(409).json({ error: "Det finnes allerede en bruker med denne e-posten." });
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    role: "user",
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
    trips: [],
    avatarUrl: "",
    emailVerified: false,
    verificationToken: randomUUID(),
    verificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
  };

  await sendVerificationEmail(user);
  users.push(user);
  await saveUsers(users);

  res.status(201).json({
    message: "Kontoen ble opprettet. Sjekk e-posten din og trykk på bekreftelseslenken."
  });
});

app.get("/verify-email", async (req, res) => {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.redirect("/account.html?verified=missing");
  }

  const users = (await readUsers()).map(normalizeUser);
  const user = users.find((item) => item.verificationToken === token);

  if (!user) {
    return res.redirect("/account.html?verified=invalid");
  }

  if (verificationExpired(user)) {
    return res.redirect("/account.html?verified=expired");
  }

  const updatedUsers = users.map((item) => {
    if (item.id !== user.id) {
      return item;
    }

    return {
      ...item,
      emailVerified: true,
      verificationToken: "",
      verificationTokenExpiresAt: ""
    };
  });

  await saveUsers(updatedUsers);
  res.redirect("/account.html?verified=success");
});

app.post("/api/resend-verification", resendLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({ error: "Skriv inn e-postadressen din." });
  }

  if (!smtpConfigured) {
    return res.status(500).json({ error: "E-postoppsett mangler på serveren." });
  }

  const users = (await readUsers()).map(normalizeUser);
  const user = users.find((item) => sameEmail(item.email, email));

  if (!user) {
    return res.status(404).json({ error: "Fant ingen bruker med denne e-posten." });
  }

  if (user.emailVerified) {
    return res.status(400).json({ error: "Denne e-posten er allerede bekreftet." });
  }

  const updatedUser = {
    ...user,
    verificationToken: randomUUID(),
    verificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
  };

  const updatedUsers = users.map((item) => (item.id === user.id ? updatedUser : item));
  await sendVerificationEmail(updatedUser);
  await saveUsers(updatedUsers);

  res.json({ message: "En ny bekreftelseslenke ble sendt." });
});

app.post("/api/login", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const users = (await readUsers()).map(normalizeUser);
  const user = users.find((item) => sameEmail(item.email, email));
  let passwordMatches = false;

  if (user) {
    try {
      passwordMatches = await bcrypt.compare(password, user.passwordHash);
    } catch {
      passwordMatches = false;
    }
  }

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: "Feil e-post eller passord." });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: "Bekreft e-posten din før du logger inn." });
  }

  req.session.regenerate((error) => {
    if (error) {
      return res.status(500).json({ error: "Kunne ikke starte en trygg session." });
    }

    req.session.userId = user.id;
    req.session.save((saveError) => {
      if (saveError) {
        console.error("Password login session save failed:", saveError.code || saveError.name);
        return res.status(503).json({ error: "Kunne ikke lagre innloggingen. Prøv igjen senere." });
      }
      res.json({ user: publicUser(user) });
    });
  });
});

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ user: null });
  }

  const { user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ user: null });
  }

  res.json({ user: publicUser(user) });
});

function ensureVpnSubscription(userId) {
  const database = openDatabase();
  let subscription = database.prepare("SELECT * FROM vpn_subscriptions WHERE user_id = ?").get(userId);

  if (!subscription) {
    const now = new Date().toISOString();
    const id = randomUUID();
    database.prepare(`
      INSERT INTO vpn_subscriptions (
        id, user_id, plan, status, device_limit, starts_at, ends_at, created_at, updated_at
      ) VALUES (?, ?, 'free', 'active', 3, ?, '', ?, ?)
    `).run(id, userId, now, now, now);
    subscription = database.prepare("SELECT * FROM vpn_subscriptions WHERE id = ?").get(id);
  }

  if (subscription.device_limit !== VPN_DEVICE_LIMIT) {
    database.prepare("UPDATE vpn_subscriptions SET device_limit = ? WHERE id = ?").run(VPN_DEVICE_LIMIT, subscription.id);
    subscription.device_limit = VPN_DEVICE_LIMIT;
  }
  return subscription;
}

function publicVpnSubscription(row) {
  return {
    id: row.id,
    plan: row.plan,
    status: row.status,
    deviceLimit: Number(row.device_limit),
    startsAt: row.starts_at,
    endsAt: row.ends_at
  };
}

function publicVpnDevice(row) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    status: row.status,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at
  };
}

app.get("/api/vpn/account", requireAuth, (req, res) => {
  const database = openDatabase();
  const subscription = ensureVpnSubscription(req.currentUser.id);
  const devices = database.prepare(`
    SELECT * FROM vpn_devices
    WHERE user_id = ? AND status = 'active'
    ORDER BY datetime(created_at) DESC
  `).all(req.currentUser.id).map(publicVpnDevice);
  const trial = database.prepare("SELECT status, ends_at FROM vpn_trial_profiles WHERE user_id = ?").get(req.currentUser.id);
  const trialProfile = trial ? { active: trial.status === "active" && Date.parse(trial.ends_at) > Date.now(), endsAt: trial.ends_at } : null;

  res.json({ subscription: publicVpnSubscription(subscription), devices, trialProfile });
});

async function callXuiApi(endpoint, { method = "GET", body } = {}) {
  if (!VPN_PROFILE_DELIVERY_ENABLED) throw new Error("Выдача VPN-профилей не настроена на сервере.");
  const base = new URL(XUI_BASE_URL);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) throw new Error("Панель VPN должна использовать HTTPS.");
  const url = new URL(`panel/api/${endpoint.replace(/^\/+/, "")}`, base.href.endsWith("/") ? base : `${base.href}/`);
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${XUI_API_TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) throw new Error(data.msg || `Панель VPN ответила HTTP ${response.status}.`);
  return data;
}

function vpnSubscriptionUrl(subId) {
  const url = new URL(VPN_SUBSCRIPTION_BASE_URL);
  if (url.protocol !== "https:") throw new Error("Ссылка VPN-подписки должна использовать HTTPS.");
  const prefix = url.pathname.replace(/\/+$/, "");
  // Keep custom multi-segment subscription paths intact and append only the
  // generated client subId. A bare origin uses the default /sub/<subId> path.
  url.pathname = prefix
    ? `${prefix}/${encodeURIComponent(subId)}`
    : `/sub/${encodeURIComponent(subId)}`;
  return url.toString();
}

app.post("/api/vpn/client-token", requireAuth, writeLimiter, async (req, res) => {
  const deviceId = String(req.body.deviceId || "").trim();
  if (!deviceId) return res.status(400).json({ error: "Устройство не указано." });
  const database = openDatabase();
  const device = database.prepare(`SELECT id FROM vpn_devices WHERE id = ? AND user_id = ? AND status = 'active'`).get(deviceId, req.currentUser.id);
  if (!device) return res.status(404).json({ error: "Активное устройство не найдено." });
  if (!VPN_PROFILE_DELIVERY_ENABLED) return res.status(503).json({ error: "Выдача VPN-профилей не настроена на сервере." });
  try {
    const now = new Date();
    const existing = database.prepare("SELECT * FROM vpn_trial_profiles WHERE user_id = ?").get(req.currentUser.id);
    if (existing?.status === "active" && Date.parse(existing.ends_at) > now.getTime()) return res.json({ subscriptionUrl: vpnSubscriptionUrl(existing.sub_id), endsAt: existing.ends_at, alreadyActive: true });
    const id = randomUUID();
    const subId = randomUUID().replace(/-/g, "");
    const clientEmail = `pm-${createHash("sha256").update(req.currentUser.id).digest("hex").slice(0, 20)}-${id.slice(0, 8)}@planmynord`;
    const endsAt = new Date(now.getTime() + VPN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const inboundResponse = await callXuiApi("inbounds/get/" + XUI_INBOUND_ID);
    const inbound = inboundResponse.obj;
    if (!inbound || inbound.enable === false) throw new Error("Выбранный inbound отсутствует или выключен в панели VPN.");
    let inboundSettings = inbound.settings || {};
    if (typeof inboundSettings === "string") { try { inboundSettings = JSON.parse(inboundSettings); } catch { inboundSettings = {}; } }
    const sampleFlow = Array.isArray(inboundSettings.clients) ? inboundSettings.clients.find((client) => client?.flow)?.flow : "";
    await callXuiApi("clients/add", { method: "POST", body: { client: { email: clientEmail, subId, enable: true, expiryTime: Date.parse(endsAt), totalGB: 0, limitIp: 0, ...(sampleFlow ? { flow: sampleFlow } : {}) }, inboundIds: [XUI_INBOUND_ID] } });
    database.prepare(`INSERT INTO vpn_trial_profiles (id,user_id,device_id,client_email,sub_id,status,ends_at,created_at) VALUES (?,?,?,?,?,'active',?,?) ON CONFLICT(user_id) DO UPDATE SET device_id=excluded.device_id, client_email=excluded.client_email, sub_id=excluded.sub_id, status='active', ends_at=excluded.ends_at, created_at=excluded.created_at`).run(id, req.currentUser.id, deviceId, clientEmail, subId, endsAt, now.toISOString());
    res.status(201).json({ subscriptionUrl: vpnSubscriptionUrl(subId), endsAt });
  } catch (error) { console.error("VPN profile provisioning failed:", error.message); res.status(502).json({ error: error.message || "Не удалось создать VPN-профиль." }); }
});

app.post("/api/vpn/client-token/revoke", requireAuth, writeLimiter, async (req, res) => {
  const deviceId = String(req.body.deviceId || "").trim();
  if (!deviceId) return res.status(400).json({ error: "Устройство не указано." });
  const database = openDatabase();
  const trial = database.prepare("SELECT * FROM vpn_trial_profiles WHERE user_id = ? AND status = 'active'").get(req.currentUser.id);
  if (!trial) return res.status(404).json({ error: "Активный пробный VPN-профиль не найден." });
  try {
    await callXuiApi(`clients/del/${encodeURIComponent(trial.client_email)}`, { method: "POST" });
    const now = new Date().toISOString();
    database.prepare("UPDATE vpn_trial_profiles SET status='revoked', ends_at=? WHERE id=?").run(now, trial.id);
    res.json({ success: true, message: "Пробный VPN-доступ отменён." });
  } catch (error) { console.error("VPN trial revocation failed:", error.message); res.status(502).json({ error: error.message || "Не удалось отменить VPN-доступ." }); }
});

app.get("/api/vpn/client-profile", writeLimiter, (req, res) => {
  res.set("Cache-Control", "no-store").status(503).json({ error: "Профили VPN пока не выдаются: сервер VPN не подключён." });
});

app.post("/api/vpn/devices", requireAuth, writeLimiter, (req, res) => {
  const database = openDatabase();
  const subscription = ensureVpnSubscription(req.currentUser.id);
  const name = String(req.body.name || "").trim().slice(0, 60);
  const allowedPlatforms = new Set(["android", "windows", "ios", "macos", "linux", "other"]);
  const requestedPlatform = String(req.body.platform || "other").trim().toLowerCase();
  const platform = allowedPlatforms.has(requestedPlatform) ? requestedPlatform : "other";

  if (name.length < 2) {
    return res.status(400).json({ error: "Укажи название устройства." });
  }

  const activeCount = Number(database.prepare(`
    SELECT COUNT(*) AS count FROM vpn_devices WHERE user_id = ? AND status = 'active'
  `).get(req.currentUser.id).count);

  if (activeCount >= Number(subscription.device_limit)) {
    return res.status(409).json({ error: "Достигнут лимит устройств для этого тарифа." });
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  database.prepare(`
    INSERT INTO vpn_devices (id, user_id, name, platform, status, created_at)
    VALUES (?, ?, ?, ?, 'active', ?)
  `).run(id, req.currentUser.id, name, platform, now);

  const saved = database.prepare("SELECT * FROM vpn_devices WHERE id = ?").get(id);
  res.status(201).json({ device: publicVpnDevice(saved) });
});

app.patch("/api/vpn/devices/:deviceId", requireAuth, writeLimiter, (req, res) => {
  const database = openDatabase();
  const name = String(req.body.name || "").trim().slice(0, 60);

  if (name.length < 2) {
    return res.status(400).json({ error: "Укажи название устройства." });
  }

  const result = database.prepare(`
    UPDATE vpn_devices SET name = ?
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).run(name, req.params.deviceId, req.currentUser.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Устройство не найдено." });
  }

  const device = database.prepare("SELECT * FROM vpn_devices WHERE id = ?").get(req.params.deviceId);
  res.json({ device: publicVpnDevice(device) });
});

app.delete("/api/vpn/devices/:deviceId", requireAuth, writeLimiter, (req, res) => {
  const now = new Date().toISOString();
  const result = openDatabase().prepare(`
    UPDATE vpn_devices SET status = 'revoked', revoked_at = ?
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).run(now, req.params.deviceId, req.currentUser.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Устройство не найдено." });
  }

  res.json({ ok: true });
});

app.get("/api/tickets", requireAuth, (req, res) => {
  const tickets = openDatabase()
    .prepare(`
      SELECT id, file_name, mime_type, file_size, trip_label, travel_date, created_at
      FROM tickets
      WHERE user_id = ?
      ORDER BY CASE WHEN travel_date = '' THEN 1 ELSE 0 END, travel_date ASC, datetime(created_at) DESC
    `)
    .all(req.currentUser.id)
    .map((ticket) => ({
      id: ticket.id,
      fileName: ticket.file_name,
      mimeType: ticket.mime_type,
      fileSize: Number(ticket.file_size),
      tripLabel: ticket.trip_label,
      travelDate: ticket.travel_date,
      createdAt: ticket.created_at,
      downloadUrl: `/api/tickets/${encodeURIComponent(ticket.id)}/file`
    }));
  res.json({ tickets });
});

app.post("/api/tickets", requireAuth, writeLimiter, (req, res) => {
  const fileName = safeDownloadName(req.body.fileName);
  const tripLabel = String(req.body.tripLabel || "").trim().slice(0, 80);
  const travelDate = String(req.body.travelDate || "").trim();
  const parsed = parseTicketDataUrl(req.body.dataUrl);

  if (parsed.error) return res.status(400).json({ error: parsed.error });
  if (travelDate && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    return res.status(400).json({ error: "Ugyldig reisedato." });
  }

  const database = openDatabase();
  const row = database.prepare("SELECT COUNT(*) AS count FROM tickets WHERE user_id = ?").get(req.currentUser.id);
  if (Number(row?.count) >= MAX_TICKETS_PER_USER) {
    return res.status(400).json({ error: `Du kan lagre opptil ${MAX_TICKETS_PER_USER} billetter.` });
  }

  const ticket = {
    id: randomUUID(),
    userId: req.currentUser.id,
    fileName,
    mimeType: parsed.mimeType,
    fileSize: parsed.content.length,
    tripLabel,
    travelDate,
    createdAt: new Date().toISOString()
  };
  database.prepare(`
    INSERT INTO tickets (id, user_id, file_name, mime_type, file_size, trip_label, travel_date, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ticket.id, ticket.userId, ticket.fileName, ticket.mimeType, ticket.fileSize, ticket.tripLabel, ticket.travelDate, parsed.content, ticket.createdAt);
  res.status(201).json({ ticket: { ...ticket, userId: undefined, downloadUrl: `/api/tickets/${ticket.id}/file` } });
});

app.get("/api/tickets/:ticketId/file", requireAuth, (req, res) => {
  const ticket = openDatabase()
    .prepare("SELECT file_name, mime_type, content FROM tickets WHERE id = ? AND user_id = ?")
    .get(String(req.params.ticketId || ""), req.currentUser.id);
  if (!ticket) return res.status(404).json({ error: "Billetten finnes ikke." });

  const fileName = safeDownloadName(ticket.file_name);
  res.setHeader("Content-Type", ticket.mime_type);
  res.setHeader("Content-Disposition", `attachment; filename="ticket"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(Buffer.from(ticket.content));
});

app.delete("/api/tickets/:ticketId", requireAuth, writeLimiter, (req, res) => {
  const result = openDatabase()
    .prepare("DELETE FROM tickets WHERE id = ? AND user_id = ?")
    .run(String(req.params.ticketId || ""), req.currentUser.id);
  if (!result.changes) return res.status(404).json({ error: "Billetten finnes ikke." });
  res.json({ ok: true });
});

app.get("/api/trips", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const { user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Brukeren finnes ikke." });
  }

  res.json({ trips: user.trips });
});

app.get("/api/public-routes", async (req, res) => {
  const users = (await readUsers()).map(normalizeUser);
  const routes = users.flatMap((user) =>
    user.trips
      .filter((trip) => trip.published)
      .map((trip) => publicRouteFromTrip(trip, user))
  );
  const ratings = getRatingsMap(routes.map((route) => route.id), req.session.userId || "");

  res.json({
    routes: routes
      .map((route) => ({
        ...route,
        rating: ratings.get(route.id) || { average: 0, count: 0, myRating: 0 }
      }))
      .sort((first, second) => String(second.publishedAt || "").localeCompare(String(first.publishedAt || "")))
  });
});

app.get("/api/route-ratings", async (req, res) => {
  const routeIds = String(req.query.routeIds || "")
    .split(",")
    .map((routeId) => routeId.trim())
    .filter(Boolean)
    .slice(0, 100);
  const ratings = getRatingsMap(routeIds, req.session.userId || "");

  res.json({
    ratings: Object.fromEntries(ratings.entries())
  });
});

app.post("/api/trips", writeLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const title = String(req.body.title || "").trim();
  const days = Number(req.body.days);
  const budget = String(req.body.budget || "").trim();
  const stops = Array.isArray(req.body.stops) ? req.body.stops : [];
  const info = String(req.body.info || "").trim();
  const kind = String(req.body.kind || "saved").trim();
  const plannerData = req.body.plannerData && typeof req.body.plannerData === "object"
    ? req.body.plannerData
    : null;

  if (!title || !Number.isFinite(days) || !budget || !stops.length || !info) {
    return res.status(400).json({ error: "Ugyldig rute." });
  }

  const { users, user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Brukeren finnes ikke." });
  }

  const alreadySaved = user.trips.some((trip) => trip.title === title && trip.info === info);

  if (alreadySaved) {
    return res.status(409).json({ error: "Denne ruten er allerede lagret." });
  }

  const trip = {
    id: randomUUID(),
    title,
    days,
    budget,
    stops,
    info,
    kind,
    plannerData,
    published: false,
    publishedAt: "",
    savedAt: new Date().toISOString()
  };

  const updatedUsers = users.map((item) => {
    if (item.id !== user.id) {
      return item;
    }

    return {
      ...item,
      trips: [...item.trips, trip]
    };
  });

  await saveUsers(updatedUsers);
  res.status(201).json({ trip });
});

app.patch("/api/trips/:tripId/publication", writeLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const tripId = String(req.params.tripId || "").trim();
  const published = Boolean(req.body.published);
  const { users, user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Brukeren finnes ikke." });
  }

  let updatedTrip = null;
  const updatedUsers = users.map((item) => {
    if (item.id !== user.id) {
      return item;
    }

    return {
      ...item,
      trips: item.trips.map((trip) => {
        if (trip.id !== tripId) {
          return trip;
        }

        updatedTrip = {
          ...trip,
          published,
          publishedAt: published ? trip.publishedAt || new Date().toISOString() : ""
        };
        return updatedTrip;
      })
    };
  });

  if (!updatedTrip) {
    return res.status(404).json({ error: "Ruten finnes ikke." });
  }

  await saveUsers(updatedUsers);
  res.json({ trip: updatedTrip });
});

app.post("/api/route-ratings", writeLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const routeId = String(req.body.routeId || "").trim();
  const rating = Number(req.body.rating);

  if (!routeId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Ugyldig vurdering." });
  }

  const now = new Date().toISOString();
  openDatabase()
    .prepare(
      `INSERT INTO route_ratings (route_id, user_id, rating, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(route_id, user_id)
       DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at`
    )
    .run(routeId, req.session.userId, rating, now, now);

  const ratings = getRatingsMap([routeId], req.session.userId);
  res.json({ rating: ratings.get(routeId) || { average: rating, count: 1, myRating: rating } });
});

app.delete("/api/trips/:tripId", writeLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const tripId = String(req.params.tripId || "").trim();
  const { users, user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Brukeren finnes ikke." });
  }

  const exists = user.trips.some((trip) => trip.id === tripId);

  if (!exists) {
    return res.status(404).json({ error: "Ruten finnes ikke." });
  }

  const updatedUsers = users.map((item) => {
    if (item.id !== user.id) {
      return item;
    }

    return {
      ...item,
      trips: item.trips.filter((trip) => trip.id !== tripId)
    };
  });

  await saveUsers(updatedUsers);
  res.json({ ok: true });
});

app.post("/api/avatar", writeLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const avatarUrl = String(req.body.avatarUrl || "").trim();
  const avatarError = validateAvatarDataUrl(avatarUrl);

  if (avatarError) {
    return res.status(400).json({ error: avatarError });
  }

  const { users, user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Brukeren finnes ikke." });
  }

  const updatedUsers = users.map((item) => {
    if (item.id !== user.id) {
      return item;
    }

    return {
      ...item,
      avatarUrl
    };
  });

  await saveUsers(updatedUsers);
  res.json({ avatarUrl });
});

app.delete("/api/avatar", writeLimiter, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Logg inn først." });
  }

  const { users, user } = await getCurrentUserRecord(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Brukeren finnes ikke." });
  }

  const updatedUsers = users.map((item) => {
    if (item.id !== user.id) {
      return item;
    }

    return {
      ...item,
      avatarUrl: ""
    };
  });

  await saveUsers(updatedUsers);
  res.json({ ok: true });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const users = (await readUsers()).map(normalizeUser);
  res.json({ users: users.map(publicAdminUser) });
});

app.delete("/api/admin/users/:id", requireAdmin, writeLimiter, async (req, res) => {
  const userId = String(req.params.id || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "Mangler bruker-id." });
  }

  if (userId === req.currentUser.id) {
    return res.status(400).json({ error: "Du kan ikke slette din egen admin-bruker." });
  }

  const users = (await readUsers()).map(normalizeUser);
  const exists = users.some((user) => user.id === userId);

  if (!exists) {
    return res.status(404).json({ error: "Brukeren finnes ikke." });
  }

  await saveUsers(users.filter((user) => user.id !== userId));
  res.json({ ok: true });
});

app.patch("/api/admin/users/:id/role", requireAdmin, writeLimiter, async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const role = String(req.body.role || "").trim();

  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Ugyldig rolle." });
  }

  if (!userId) {
    return res.status(400).json({ error: "Mangler bruker-id." });
  }

  if (userId === req.currentUser.id && role !== "admin") {
    return res.status(400).json({ error: "Du kan ikke fjerne admin fra deg selv." });
  }

  const users = (await readUsers()).map(normalizeUser);
  const exists = users.some((user) => user.id === userId);

  if (!exists) {
    return res.status(404).json({ error: "Brukeren finnes ikke." });
  }

  const updatedUsers = users.map((user) => (user.id === userId ? { ...user, role } : user));
  await saveUsers(updatedUsers);
  res.json({ ok: true });
});

app.patch("/api/admin/users/:id/vpn", requireAdmin, writeLimiter, (req, res) => {
  try {
    const vpn = grantVpnAccess(String(req.params.id), req.body.days);
    res.json({ ok: true, vpn });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error("Admin VPN grant failed:", error.code || error.name);
    res.status(500).json({ error: "Could not update VPN access." });
  }
});

app.patch("/api/admin/users/:id/vip", requireAdmin, writeLimiter, async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const days = Number(req.body.days);

  if (!userId) {
    return res.status(400).json({ error: "Mangler bruker-id." });
  }

  if (!Number.isFinite(days) || days < 0 || days > 3650) {
    return res.status(400).json({ error: "Velg mellom 0 og 3650 støtte-dager." });
  }

  const users = (await readUsers()).map(normalizeUser);
  const exists = users.some((user) => user.id === userId);

  if (!exists) {
    return res.status(404).json({ error: "Brukeren finnes ikke." });
  }

  const now = Date.now();
  const vipUntil = days > 0
    ? new Date(now + days * 24 * 60 * 60 * 1000).toISOString()
    : "";
  const updatedUsers = users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    return {
      ...user,
      vipPlan: days > 0 ? "admin-grant" : "",
      vipUntil
    };
  });

  await saveUsers(updatedUsers);
  res.json({ ok: true, vip: getVipStatus({ vipPlan: "admin-grant", vipUntil }) });
});

app.get("/api/admin/routes", requireAdmin, async (req, res) => {
  const users = (await readUsers()).map(normalizeUser);
  res.json({ routes: flattenSavedRoutes(users) });
});

app.get("/api/admin/payments", requireAdmin, async (req, res) => {
  res.json({ payments: getAdminPayments() });
});

app.delete("/api/admin/routes/:id", requireAdmin, writeLimiter, async (req, res) => {
  const routeId = String(req.params.id || "").trim();

  if (!routeId) {
    return res.status(400).json({ error: "Mangler rute-id." });
  }

  const users = (await readUsers()).map(normalizeUser);
  let deleted = false;

  const updatedUsers = users.map((user) => {
    const trips = user.trips.filter((trip) => trip.id !== routeId);

    if (trips.length !== user.trips.length) {
      deleted = true;
    }

    return { ...user, trips };
  });

  if (!deleted) {
    return res.status(404).json({ error: "Ruten finnes ikke." });
  }

  await saveUsers(updatedUsers);
  res.json({ ok: true });
});

app.post("/api/logout", writeLimiter, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

const cleanPageRoutes = {
  "/me": "me.html",
  "/about": "about.html",
  "/planner": "planner.html",
  "/routes": "routes.html",
  "/things": "things.html",
  "/tickets": "tickets.html",
  "/account": "account.html",
  "/profile": "profile.html",
  "/terms": "terms.html",
  "/privacy": "privacy.html",
  "/cookies": "cookies.html",
  "/refund": "refund.html"
};

Object.entries(cleanPageRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(PUBLIC_DIR, file)));
});

function initializeOidcProvider() {
  if (!OIDC_JWKS || !OIDC_STORAGE_DIR || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_REDIRECT_URI) return null;
  if (isProduction && (!OIDC_ISSUER.startsWith("https://") || !APP_BASE_URL.startsWith("https://"))) {
    throw new Error("OIDC requires HTTPS issuer and APP_BASE_URL in production.");
  }
  if (isProduction && SESSION_SECRET === "change-this-secret-before-publishing") {
    throw new Error("OIDC requires a unique SESSION_SECRET in production.");
  }

  let jwks;
  try {
    jwks = JSON.parse(OIDC_JWKS);
  } catch {
    throw new Error("OIDC_JWKS must contain valid JSON Web Key Set JSON.");
  }
  if (!Array.isArray(jwks?.keys) || !jwks.keys.some((key) => key.d && key.kid)) {
    throw new Error("OIDC_JWKS must contain a persistent private signing key with kid.");
  }
  if (!path.isAbsolute(OIDC_STORAGE_DIR)) throw new Error("OIDC_STORAGE_DIR must be an absolute, non-synchronized path.");
  openOidcDatabase();

  return new OidcProvider(OIDC_ISSUER, {
    adapter: SqliteOidcAdapter,
    jwks,
    clients: [{
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      redirect_uris: [OIDC_REDIRECT_URI],
      response_types: ["code"],
      grant_types: ["authorization_code"],
      token_endpoint_auth_method: "client_secret_basic"
    }, {
      client_id: OIDC_DESKTOP_CLIENT_ID,
      application_type: "native",
      redirect_uris: [OIDC_DESKTOP_REDIRECT_URI],
      response_types: ["code"],
      grant_types: ["authorization_code"],
      token_endpoint_auth_method: "none"
    }],
    cookies: { keys: [SESSION_SECRET] },
    claims: {
      openid: ["sub"],
      email: ["email", "email_verified"],
      profile: ["name"]
    },
    scopes: ["openid", "email", "profile"],
    findAccount: async (_ctx, accountId) => {
      const user = (await readUsers()).map(normalizeUser).find((item) => item.id === accountId && item.emailVerified);
      if (!user) return undefined;
      return {
        accountId: user.id,
        claims: async () => ({
          sub: user.id,
          email: user.email,
          email_verified: true,
          name: user.name
        })
      };
    },
    interactions: {
      url: (_ctx, interaction) => `/oidc/interaction/${interaction.uid}`
    },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: false },
      registrationManagement: { enabled: false }
    }
  });
}

function renderOidcInteraction({ title, description, uid, csrf, form, error = "" }) {
  const errorMarkup = error ? `<p role="alert" style="color:#b42318">${error}</p>` : "";
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><main style="font:16px system-ui;max-width:420px;margin:10vh auto;padding:24px"><h1>${title}</h1><p>${description}</p>${errorMarkup}<form method="post" action="/oidc/interaction/${encodeURIComponent(uid)}/${form}"><input type="hidden" name="csrf" value="${csrf}">${form === "login" ? '<label>Email<br><input name="email" type="email" autocomplete="username" required style="width:100%;padding:10px;margin:6px 0 14px"></label><label>Password<br><input name="password" type="password" autocomplete="current-password" required style="width:100%;padding:10px;margin:6px 0 14px"></label><button type="submit" style="padding:10px 18px">Войти и продолжить</button>' : '<button name="approve" value="yes" type="submit" style="padding:10px 18px">Разрешить</button> <button name="approve" value="no" type="submit" style="padding:10px 18px">Отказать</button>'}</form></main></html>`;
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

oidcProvider = initializeOidcProvider();

app.get("/oidc/interaction/:uid", authLimiter, async (req, res, next) => {
  if (!oidcProvider) return res.status(503).send("Servera sign-in is not configured.");
  try {
    const details = await oidcProvider.interactionDetails(req, res);
    if (details.prompt.name === "login" && req.session.userId) {
      const user = (await readUsers()).map(normalizeUser).find((item) => item.id === req.session.userId && item.emailVerified);
      if (user) {
        await oidcProvider.interactionFinished(req, res, {
          login: { accountId: user.id, acr: "urn:pwd", remember: true, ts: Math.floor(Date.now() / 1000) }
        });
        return;
      }
    }
    const csrf = randomUUID();
    req.session.oidcInteractionCsrf = csrf;
    if (details.prompt.name === "login") {
      return res.type("html").send(renderOidcInteraction({
        title: "Вход в PlanMyNord",
        description: "Войди в подтверждённый аккаунт Servera, чтобы продолжить в Commonplace Finance.",
        uid: req.params.uid,
        csrf,
        form: "login"
      }));
    }
    if (details.prompt.name === "consent") {
      return res.type("html").send(renderOidcInteraction({
        title: "Доступ к профилю",
        description: "Commonplace Finance запрашивает подтверждённый email и имя вашего аккаунта.",
        uid: req.params.uid,
        csrf,
        form: "consent"
      }));
    }
    return res.status(400).send("Unsupported sign-in step.");
  } catch (error) { next(error); }
});

app.post("/oidc/interaction/:uid/login", authLimiter, async (req, res, next) => {
  if (!oidcProvider) return res.status(503).send("Servera sign-in is not configured.");
  try {
    if (!constantTimeEqual(req.body.csrf, req.session.oidcInteractionCsrf)) return res.status(403).send("Invalid sign-in form. Restart the sign-in flow.");
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = (await readUsers()).map(normalizeUser).find((item) => sameEmail(item.email, email));
    let passwordMatches = false;
    if (user) {
      try { passwordMatches = await bcrypt.compare(password, user.passwordHash); } catch { passwordMatches = false; }
    }
    if (!user || !passwordMatches || !user.emailVerified) {
      return res.status(401).type("html").send(renderOidcInteraction({
        title: "Вход не выполнен",
        description: "Проверь email, пароль и подтверждение адреса, затем попробуй снова.",
        uid: req.params.uid,
        csrf: req.session.oidcInteractionCsrf,
        form: "login",
        error: "Не удалось проверить аккаунт."
      }));
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.save(async (saveError) => {
        if (saveError) return next(saveError);
        try {
          await oidcProvider.interactionFinished(req, res, {
            login: { accountId: user.id, acr: "urn:pwd", remember: true, ts: Math.floor(Date.now() / 1000) }
          });
        } catch (finishError) { next(finishError); }
      });
    });
  } catch (error) { next(error); }
});

app.post("/oidc/interaction/:uid/consent", authLimiter, async (req, res, next) => {
  if (!oidcProvider) return res.status(503).send("Servera sign-in is not configured.");
  try {
    if (!constantTimeEqual(req.body.csrf, req.session.oidcInteractionCsrf)) return res.status(403).send("Invalid consent form. Restart the sign-in flow.");
    const details = await oidcProvider.interactionDetails(req, res);
    if (req.body.approve !== "yes") {
      await oidcProvider.interactionFinished(req, res, { error: "access_denied", error_description: "The user denied profile access." });
      return;
    }
    const grant = new oidcProvider.Grant({ accountId: details.session.accountId, clientId: details.params.client_id });
    const scopes = details.prompt.details.missingOIDCScope;
    if (Array.isArray(scopes) && scopes.length) grant.addOIDCScope(scopes.join(" "));
    const claims = details.prompt.details.missingOIDCClaims;
    if (Array.isArray(claims) && claims.length) grant.addOIDCClaims(claims);
    await oidcProvider.interactionFinished(req, res, { consent: { grantId: await grant.save() } });
  } catch (error) { next(error); }
});

if (oidcProvider) app.use("/oidc", oidcProvider.callback());

app.use((req, res) => {
  res.status(404).type("text").send("Not found");
});

app.listen(PORT, () => {
  console.log(`PlanMyNord server running on http://localhost:${PORT}`);
  scheduleDailyR2Backup({ databasePath: DB_FILE });
});

