require("dotenv").config();

const path = require("path");
const { readR2BackupConfig, uploadBackupToR2 } = require("../lib/r2-backup");

async function main() {
  const databasePath = path.join(__dirname, "..", "data", "app.db");
  const { missing } = readR2BackupConfig();

  if (missing.length) {
    console.error(`Cloudflare R2 is not configured. Add these values to .env: ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log("Creating a verified SQLite snapshot...");
  const result = await uploadBackupToR2({ databasePath });
  console.log(`Backup uploaded: r2://${result.bucket}/${result.key}`);
  console.log(`Compressed size: ${result.compressedBytes} bytes`);
  console.log(`SHA-256: ${result.sha256}`);
}

main().catch((error) => {
  console.error("Cloudflare R2 backup failed:", error.message || error);
  process.exitCode = 1;
});
