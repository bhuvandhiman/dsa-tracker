import { BACKUP_MAX_BYTES, BACKUP_SIZE_ERROR } from '../../shared/backup-limits.js';
import { backupSummary } from './workflow-model.js';

// File.text() cannot be aborted. A new selection invalidates older reads instead.
export function createBackupFileReader() {
  let revision = 0;
  return {
    cancel() { revision++; },
    async read(file) {
      const selection = ++revision;
      try {
        if (file.size > BACKUP_MAX_BYTES) throw new Error(BACKUP_SIZE_ERROR);
        const value = JSON.parse(await file.text());
        const summary = backupSummary(value);
        return selection === revision ? {fileName:file.name,reading:false,value,summary,error:''} : null;
      } catch (failure) {
        return selection === revision ? {fileName:file.name,reading:false,value:null,summary:null,error:failure instanceof SyntaxError ? 'This file is not valid JSON.' : failure.message} : null;
      }
    },
  };
}
