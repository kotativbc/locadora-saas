import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_ROOT } from '../common/storage';

const BACKUPS_DIR = path.join(DATA_ROOT, 'backups');
// backup.sh roda 1x/dia (03:01) — considera atrasado depois de 30h sem novo backup.
const STALE_AFTER_HOURS = 30;

interface BackupRun {
  timestamp: string;
  createdAt: string;
  dbFile: { name: string; sizeBytes: number } | null;
  uploadsFile: { name: string; sizeBytes: number } | null;
}

@Injectable()
export class BackupsService {
  async getStatus() {
    let files: string[] = [];
    try {
      files = await fs.readdir(BACKUPS_DIR);
    } catch {
      // pasta ainda não existe — nenhum backup rodou ainda
      return { status: 'never', lastBackupAt: null, hoursSinceLastBackup: null, runs: [] as BackupRun[] };
    }

    const runsByTimestamp = new Map<string, BackupRun>();

    for (const filename of files) {
      const match = filename.match(/^(db|uploads)-(\d{8}-\d{6})\.(dump|tar\.gz)$/);
      if (!match) continue;
      const [, kind, timestamp] = match;

      const stat = await fs.stat(path.join(BACKUPS_DIR, filename));
      const entry = runsByTimestamp.get(timestamp) ?? {
        timestamp,
        createdAt: stat.mtime.toISOString(),
        dbFile: null,
        uploadsFile: null,
      };

      const fileInfo = { name: filename, sizeBytes: stat.size };
      if (kind === 'db') entry.dbFile = fileInfo;
      else entry.uploadsFile = fileInfo;
      if (stat.mtime.toISOString() > entry.createdAt) entry.createdAt = stat.mtime.toISOString();

      runsByTimestamp.set(timestamp, entry);
    }

    const runs = Array.from(runsByTimestamp.values()).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    if (runs.length === 0) {
      return { status: 'never', lastBackupAt: null, hoursSinceLastBackup: null, runs: [] };
    }

    const lastBackupAt = runs[0].createdAt;
    const hoursSinceLastBackup = (Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60);
    const status = hoursSinceLastBackup > STALE_AFTER_HOURS ? 'stale' : 'ok';

    return { status, lastBackupAt, hoursSinceLastBackup: Math.round(hoursSinceLastBackup * 10) / 10, runs: runs.slice(0, 30) };
  }
}
