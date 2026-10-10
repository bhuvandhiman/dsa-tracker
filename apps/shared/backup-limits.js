export const BACKUP_MAX_BYTES = 20 * 1024 * 1024;
export const BACKUP_MAX_RECORDS = 200000;
export const BACKUP_SIZE_ERROR = 'Recall backups support up to 20 MB.';

// Measure the same UTF-8, formatted JSON that the website downloads.
export function backupFileText(backup) { return JSON.stringify(backup, null, 2); }

export function backupLimitError(backup) {
  const records = Object.values(backup.tables).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
  if (records > BACKUP_MAX_RECORDS) return 'Backup exceeds 200,000 rows.';
  return new globalThis.TextEncoder().encode(backupFileText(backup)).byteLength > BACKUP_MAX_BYTES ? BACKUP_SIZE_ERROR : '';
}
