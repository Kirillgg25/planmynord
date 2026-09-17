const crypto = require("crypto");
const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");
const path = require("path");
const { gzip } = require("zlib");
const { promisify } = require("util");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const gzipAsync = promisify(gzip);

function readR2BackupConfig(environment = process.env) {
  const requestedHour = Number(environment.R2_BACKUP_HOUR_UTC);
  const config = {
    accountId: String(environment.R2_ACCOUNT_ID || "").trim(),
    accessKeyId: String(environment.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(environment.R2_SECRET_ACCESS_KEY || "").trim(),
    bucket: String(environment.R2_BUCKET || "").trim(),
    prefix: String(environment.R2_BACKUP_PREFIX || "sqlite").trim().replace(/^\/+|\/+$/g, ""),
    hourUtc: Number.isFinite(requestedHour)
      ? Math.min(Math.max(Math.trunc(requestedHour), 0), 23)
      : 2
  };
  const missing = [];
  if (!config.accountId) missing.push("R2_ACCOUNT_ID");
  if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!config.bucket) missing.push("R2_BUCKET");
  return { config, missing };
}

function openSqliteDatabase(filePath) {
  try {
    const BetterSqlite3 = require("better-sqlite3");
    return new BetterSqlite3(filePath);
  } catch {
    const { DatabaseSync } = require("node:sqlite");
    return new DatabaseSync(filePath);
  }
}

function escapeSqliteString(value) {
  return String(value).replace(/'/g, "''");
}

function formatTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function createCompressedSqliteSnapshot(databasePath) {
  const resolvedDatabasePath = path.resolve(databasePath);
  if (!fsSync.existsSync(resolvedDatabasePath)) {
    throw new Error(`SQLite database not found: ${resolvedDatabasePath}`);
  }

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "planmynord-backup-"));
  const snapshotPath = path.join(temporaryDirectory, "app.db");
  let sourceDatabase;
  let snapshotDatabase;

  try {
    sourceDatabase = openSqliteDatabase(resolvedDatabasePath);
    sourceDatabase.exec("PRAGMA busy_timeout = 15000;");
    sourceDatabase.exec(`VACUUM INTO '${escapeSqliteString(snapshotPath)}';`);
    sourceDatabase.close();
    sourceDatabase = null;

    snapshotDatabase = openSqliteDatabase(snapshotPath);
    const integrityResult = snapshotDatabase.prepare("PRAGMA integrity_check").get();
    const integrityValue = String(Object.values(integrityResult || {})[0] || "").toLowerCase();
    snapshotDatabase.close();
    snapshotDatabase = null;

    if (integrityValue !== "ok") {
      throw new Error(`SQLite integrity check failed: ${integrityValue || "unknown result"}`);
    }

    const databaseBuffer = await fs.readFile(snapshotPath);
    const compressedBuffer = await gzipAsync(databaseBuffer, { level: 9 });
    return {
      buffer: compressedBuffer,
      originalBytes: databaseBuffer.length,
      compressedBytes: compressedBuffer.length,
      sha256: crypto.createHash("sha256").update(compressedBuffer).digest("hex"),
      cleanup: () => fs.rm(temporaryDirectory, { recursive: true, force: true })
    };
  } catch (error) {
    try {
      sourceDatabase?.close();
      snapshotDatabase?.close();
    } catch {}
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function uploadBackupToR2({ databasePath, environment = process.env, now = new Date() }) {
  const { config, missing } = readR2BackupConfig(environment);
  if (missing.length) {
    throw new Error(`Cloudflare R2 backup is not configured. Missing: ${missing.join(", ")}`);
  }

  const snapshot = await createCompressedSqliteSnapshot(databasePath);
  const objectName = `app-${formatTimestamp(now)}.db.gz`;
  const objectKey = config.prefix ? `${config.prefix}/${objectName}` : objectName;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  try {
    const result = await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: snapshot.buffer,
      ContentType: "application/x-sqlite3",
      ContentEncoding: "gzip",
      Metadata: {
        sha256: snapshot.sha256,
        source: "planmynord",
        created: now.toISOString()
      }
    }));

    return {
      bucket: config.bucket,
      key: objectKey,
      etag: result.ETag || "",
      originalBytes: snapshot.originalBytes,
      compressedBytes: snapshot.compressedBytes,
      sha256: snapshot.sha256
    };
  } finally {
    client.destroy();
    await snapshot.cleanup();
  }
}

function millisecondsUntilNextBackup(hourUtc, now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleDailyR2Backup({ databasePath, environment = process.env, logger = console }) {
  const enabled = String(environment.R2_BACKUP_ENABLED || "").toLowerCase() === "true";
  if (!enabled) return null;

  const { config, missing } = readR2BackupConfig(environment);
  if (missing.length) {
    logger.error(`[backup] R2 backup enabled but missing: ${missing.join(", ")}`);
    return null;
  }

  let timer = null;
  let cancelled = false;

  const scheduleNext = () => {
    if (cancelled) return;
    timer = setTimeout(async () => {
      try {
        const result = await uploadBackupToR2({ databasePath, environment });
        logger.log(`[backup] Uploaded ${result.key} to R2 (${result.compressedBytes} bytes).`);
      } catch (error) {
        logger.error("[backup] Cloudflare R2 backup failed:", error);
      } finally {
        scheduleNext();
      }
    }, millisecondsUntilNextBackup(config.hourUtc));
    timer.unref?.();
  };

  logger.log(`[backup] Daily Cloudflare R2 backup scheduled for ${String(config.hourUtc).padStart(2, "0")}:00 UTC.`);
  scheduleNext();

  return {
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
    }
  };
}

module.exports = {
  createCompressedSqliteSnapshot,
  millisecondsUntilNextBackup,
  readR2BackupConfig,
  scheduleDailyR2Backup,
  uploadBackupToR2
};
