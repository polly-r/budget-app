import { copyFile, mkdir, readdir, unlink } from "fs/promises";
import path from "path";

const DB_PATH    = path.join(process.cwd(), "prisma", "dev.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_KEEP   = 14;

async function backup() {
  try {
    await mkdir(BACKUP_DIR, { recursive: true });

    const now  = new Date();
    const pad  = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const dest  = path.join(BACKUP_DIR, `dev-${stamp}.db`);

    await copyFile(DB_PATH, dest);
    console.log(`[backup] ✓  backups/dev-${stamp}.db`);

    // Prune: keep only the MAX_KEEP most recent files
    const all = (await readdir(BACKUP_DIR))
      .filter(f => f.startsWith("dev-") && f.endsWith(".db"))
      .sort(); // YYYY-MM-DD-HHmm sorts chronologically

    const stale = all.slice(0, Math.max(0, all.length - MAX_KEEP));
    for (const f of stale) {
      await unlink(path.join(BACKUP_DIR, f));
      console.log(`[backup]    removed old backup: ${f}`);
    }
  } catch (err) {
    // Non-fatal: warn so the developer sees it, but don't block startup
    console.warn(`[backup] ⚠  backup failed: ${err instanceof Error ? err.message : err}`);
  }
}

backup();
