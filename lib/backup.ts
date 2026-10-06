import { exec } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export async function triggerBackup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = "/app/backups";
  const outFile = path.join(backupDir, `acdefense-event-${stamp}.dump`);

  try {
    await mkdir(backupDir, { recursive: true });
    await execAsync(`pg_dump "${dbUrl}" -Fc -f "${outFile}"`, { timeout: 30000 });
  } catch (err) {
    // Never throw — backup failure must not affect request
    console.error("[backup] event backup failed:", err);
  }
}
