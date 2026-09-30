import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  InventoryItem,
  ItemRequest,
  MovementTransaction,
  AuditLog,
  NotificationItem,
  DatabaseBackup,
  SystemLocation,
  SystemTeam
} from '../src/types/inventory.js';
import {
  INITIAL_USERS,
  INITIAL_ITEMS,
  INITIAL_REQUESTS,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_LOCATIONS,
  INITIAL_TEAMS
} from './seedData.js';
import { importSparePartsFromExcel } from './excelSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
// User requirement: In the source code, all backup DB files must be stored in the 'backup data' folder
const BACKUPS_DIR = path.resolve(__dirname, '../backup data');
const LEGACY_BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');
const BACKUP_INDEX_FILE = path.resolve(BACKUPS_DIR, 'backups_meta.json');

export interface DatabaseState {
  version: number;
  lastUpdated: string;
  users: User[];
  items: InventoryItem[];
  requests: ItemRequest[];
  transactions: MovementTransaction[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  locations: SystemLocation[];
  teams: SystemTeam[];
  systemSettings: {
    systemName: string;
    organization: string;
    autoBackupIntervalMinutes: number;
    lastSuccessfulBackup?: string;
    lastBackupAttempt?: string;
    backupStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
    backupErrorDetails?: string;
    allowTechnicianRequests: boolean;
  };
}

// Format date and time in Bangladesh Standard Time (Asia/Dhaka, UTC+6) with exact seconds
function getDhakaDateTime(date: Date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => { partMap[p.type] = p.value; });

  const year = partMap.year || '2026';
  const month = partMap.month || '09';
  const day = partMap.day || '30';
  const hour = partMap.hour || '15';
  const minute = partMap.minute || '00';
  const second = partMap.second || '00';

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}:${second}`;
  const fileTimeStr = `${hour}-${minute}-${second}`;
  
  // Format 12-hour display with seconds: e.g. 03:26:37 PM
  const hNum = parseInt(hour, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = String(hNum % 12 || 12).padStart(2, '0');
  const displayTime12 = `${h12}:${minute}:${second} ${ampm}`;

  let filename = `BKP-${dateStr}_${fileTimeStr}.json`;
  let backupId = `BKP-${year}${month}${day}-${hour}${minute}${second}`;

  // If a file with this exact second already exists, append a millisecond differentiator
  const targetPath = path.resolve(BACKUPS_DIR, filename);
  if (fs.existsSync(targetPath)) {
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    filename = `BKP-${dateStr}_${fileTimeStr}_${millis}.json`;
    backupId = `BKP-${year}${month}${day}-${hour}${minute}${second}-${millis}`;
  }

  return {
    dateStr,
    timeStr,
    displayTime12,
    fileTimeStr,
    backupId,
    filename,
    isoString: date.toISOString()
  };
}

class DatabaseManager {
  private state: DatabaseState | null = null;
  private isWriting = false;

  constructor() {
    this.ensureDirectories();
    this.loadState();
    // NOTE: Per user request, 5-minute interval backup is disabled:
    // "new spre parts & tools add hole auto backup hobe tasara backup hobe na"
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LEGACY_BACKUPS_DIR)) {
      fs.mkdirSync(LEGACY_BACKUPS_DIR, { recursive: true });
    }
  }

  private getDefaultState(): DatabaseState {
    const excelItems = importSparePartsFromExcel();
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      items: excelItems.length > 0 ? excelItems : JSON.parse(JSON.stringify(INITIAL_ITEMS)),
      requests: JSON.parse(JSON.stringify(INITIAL_REQUESTS)),
      transactions: JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS)),
      auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
      notifications: [],
      locations: JSON.parse(JSON.stringify(INITIAL_LOCATIONS)),
      teams: JSON.parse(JSON.stringify(INITIAL_TEAMS)),
      systemSettings: {
        systemName: 'R.A.C R&I Store Center',
        organization: 'Walton Hi-Tech Industries PLC.',
        autoBackupIntervalMinutes: 0,
        lastSuccessfulBackup: new Date().toISOString(),
        lastBackupAttempt: new Date().toISOString(),
        backupStatus: 'HEALTHY',
        allowTechnicianRequests: true,
      }
    };
  }

  private loadState() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);

        // Enforce the master employee database from Excel file
        if (this.state && INITIAL_USERS && INITIAL_USERS.length > 0) {
          this.state.users = JSON.parse(JSON.stringify(INITIAL_USERS));
        }

        if (this.state) {
          // If items array is empty, populate initial items from Excel
          if (!this.state.items || this.state.items.length === 0) {
            const excelItems = importSparePartsFromExcel();
            this.state.items = excelItems;
            this.persistSync();
            console.log(`[DB] Seeded initial ${excelItems.length} items from Spare Parts.xlsx`);
          } else {
            console.log(`[DB] Preserved ${this.state.items.length} items intact from database.json.`);
          }

          if (this.state.systemSettings) {
            this.state.systemSettings.systemName = 'R.A.C R&I Store Center';
            this.state.systemSettings.organization = 'Walton Hi-Tech Industries PLC.';
          }

          console.log(`[DB] Persistent database loaded with ${this.state.users.length} master employees and ${this.state.items.length} items.`);
        }
      } else {
        console.log('[DB] Initializing new database with master seed data...');
        this.state = this.getDefaultState();
        this.persistSync();
        // Create initial backup in 'backup data' folder
        this.createBackup('SYSTEM INITIALIZATION', 'Initial master seed backup');
      }
    } catch (err) {
      console.error('[DB] Error loading database file. Initializing default fallback:', err);
      this.state = this.getDefaultState();
      this.persistSync();
    }
  }

  public persistSync() {
    if (!this.state) return;
    this.state.lastUpdated = new Date().toISOString();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(this.state, null, 2);
    fs.writeFileSync(tempFile, payload, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public async persist(): Promise<void> {
    if (this.isWriting) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    this.isWriting = true;
    try {
      this.persistSync();
    } finally {
      this.isWriting = false;
    }
  }

  public getState(): DatabaseState {
    if (!this.state) {
      this.loadState();
    }
    return this.state!;
  }

  public clearAllDummyData(clearedBy: string, employeeId: string) {
    const state = this.getState();
    state.items = [];
    state.requests = [];
    state.transactions = [];
    state.notifications = [];
    state.auditLogs = [];
    this.persistSync();
    this.logAudit({
      user: clearedBy,
      employeeId: employeeId,
      action: 'UPDATE',
      module: 'SYSTEM',
      details: 'Master inventory cleared. All dummy items, requests, and transactions removed.',
    });
    this.persistSync();
  }

  public syncFromExcel(syncedBy: string, employeeId: string): { count: number; message: string } {
    const excelItems = importSparePartsFromExcel();
    if (excelItems.length === 0) {
      return { count: 0, message: 'No items could be read from Spare Parts.xlsx' };
    }

    const state = this.getState();
    // Preserve custom user-added items created through UI
    const userAddedItems = (state.items || []).filter(item => !item.id.startsWith('ITEM-SP-EXCEL-'));

    state.items = [...excelItems, ...userAddedItems];
    this.persistSync();

    this.logAudit({
      user: syncedBy,
      employeeId: employeeId,
      action: 'IMPORT',
      module: 'SPARE_PARTS',
      details: `Synchronized ${excelItems.length} spare parts directly from Spare Parts.xlsx into authorized officer panels.`,
    });
    this.persistSync();
    return { count: excelItems.length, message: `Successfully synchronized ${excelItems.length} spare parts from Spare Parts.xlsx.` };
  }

  // --- AUDIT LOGGING ---
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    const state = this.getState();
    state.auditLogs.unshift(log);
    // Keep last 5000 logs in active memory
    if (state.auditLogs.length > 5000) {
      state.auditLogs.pop();
    }
    this.persist();
    return log;
  }

  // --- NOTIFICATIONS ---
  public addNotification(userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO', linkUrl?: string) {
    const notif: NotificationItem = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      title,
      message,
      type,
      linkUrl,
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.getState().notifications.unshift(notif);
    this.persist();
  }

  // --- BACKUP MANAGEMENT IN 'backup data' FOLDER ---
  public createBackup(createdBy: string = 'SUPER ADMIN', description: string = 'Database backup snapshot'): DatabaseBackup {
    const state = this.getState();
    const timestamp = new Date();
    const { dateStr, timeStr, displayTime12, backupId, filename, isoString } = getDhakaDateTime(timestamp);
    const targetPath = path.resolve(BACKUPS_DIR, filename);
    const legacyPath = path.resolve(LEGACY_BACKUPS_DIR, filename);

    try {
      state.systemSettings.lastBackupAttempt = isoString;
      const payload = JSON.stringify(state, null, 2);
      
      // Write into source code 'backup data' directory
      fs.writeFileSync(targetPath, payload, 'utf-8');
      try {
        fs.writeFileSync(legacyPath, payload, 'utf-8');
      } catch (e) {}

      const stats = fs.statSync(targetPath);

      const backupRecord: DatabaseBackup = {
        id: backupId,
        date: dateStr,
        time: timeStr,
        displayTime: displayTime12,
        isoTimestamp: isoString,
        sizeBytes: stats.size,
        createdBy,
        status: 'SUCCESS',
        filename,
        description,
        recordCounts: {
          users: state.users.length,
          items: state.items.filter(i => !i.isDeleted).length,
          requests: state.requests.length,
          transactions: state.transactions.length,
          auditLogs: state.auditLogs.length,
        }
      };

      // Update backup metadata index
      const backups = this.getBackups();
      // Remove any duplicate id if it already existed
      const filtered = backups.filter(b => b.id !== backupId);
      filtered.unshift(backupRecord);
      
      // Retention policy: Keep the last 100 backup snapshots
      if (filtered.length > 100) {
        const toPrune = filtered.slice(100);
        for (const old of toPrune) {
          try {
            const oldPath = path.resolve(BACKUPS_DIR, old.filename);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            const oldLegPath = path.resolve(LEGACY_BACKUPS_DIR, old.filename);
            if (fs.existsSync(oldLegPath)) fs.unlinkSync(oldLegPath);
          } catch (e) {
            console.error('Failed to prune old backup:', e);
          }
        }
        filtered.splice(100);
      }

      fs.writeFileSync(BACKUP_INDEX_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      try {
        fs.writeFileSync(path.resolve(LEGACY_BACKUPS_DIR, 'backups_meta.json'), JSON.stringify(filtered, null, 2), 'utf-8');
      } catch (e) {}

      state.systemSettings.lastSuccessfulBackup = timestamp.toISOString();
      state.systemSettings.backupStatus = 'HEALTHY';
      state.systemSettings.backupErrorDetails = undefined;
      this.persistSync();

      this.logAudit({
        user: createdBy,
        employeeId: 'SYS',
        action: 'BACKUP',
        module: 'SYSTEM',
        details: `Database snapshot created in 'backup data': ${filename} (${(stats.size / 1024).toFixed(1)} KB).`,
      });

      return backupRecord;
    } catch (err: any) {
      state.systemSettings.backupStatus = 'ERROR';
      state.systemSettings.backupErrorDetails = err?.message || 'Snapshot write failed';
      this.persistSync();
      throw err;
    }
  }

  public getBackups(): DatabaseBackup[] {
    const list: DatabaseBackup[] = [];
    const seenFiles = new Set<string>();

    try {
      if (fs.existsSync(BACKUP_INDEX_FILE)) {
        const meta: DatabaseBackup[] = JSON.parse(fs.readFileSync(BACKUP_INDEX_FILE, 'utf-8'));
        meta.forEach(b => {
          let displayTime = b.displayTime;
          if (!displayTime && b.time) {
            const parts = b.time.split(':');
            const h = parseInt(parts[0] || '12', 10);
            const m = parts[1] || '00';
            const s = parts[2] || '00';
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = String(h % 12 || 12).padStart(2, '0');
            displayTime = `${h12}:${m}:${s} ${ampm}`;
          }
          list.push({ ...b, displayTime });
          seenFiles.add(b.filename);
        });
      }
    } catch (e) {
      console.error('Error reading backup index:', e);
    }

    // Auto-discover any .json backup files in 'backup data' directory that may have been added manually
    try {
      if (fs.existsSync(BACKUPS_DIR)) {
        const files = fs.readdirSync(BACKUPS_DIR);
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'backups_meta.json' && !seenFiles.has(file)) {
            try {
              const fullPath = path.resolve(BACKUPS_DIR, file);
              const stats = fs.statSync(fullPath);
              let dateStr = stats.mtime.toISOString().split('T')[0];
              let timeStr = stats.mtime.toTimeString().split(' ')[0];
              
              // If filename matches BKP-YYYY-MM-DD_HH-mm-ss, extract exact time
              const match = file.match(/BKP-(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/);
              if (match) {
                dateStr = match[1];
                timeStr = `${match[2]}:${match[3]}:${match[4]}`;
              }

              const parts = timeStr.split(':');
              const h = parseInt(parts[0] || '12', 10);
              const m = parts[1] || '00';
              const s = parts[2] || '00';
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = String(h % 12 || 12).padStart(2, '0');
              const displayTime = `${h12}:${m}:${s} ${ampm}`;

              list.push({
                id: file.replace('.json', ''),
                date: dateStr,
                time: timeStr,
                displayTime,
                sizeBytes: stats.size,
                createdBy: 'SYSTEM SCAN',
                status: 'SUCCESS',
                filename: file,
                description: 'Detected in backup data folder',
                recordCounts: {
                  users: 0,
                  items: 0,
                  requests: 0,
                  transactions: 0,
                  auditLogs: 0,
                }
              });
              seenFiles.add(file);
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      console.error('Error scanning backup directory:', e);
    }

    // Sort descending by date and time (newest backup first)
    list.sort((a, b) => {
      const aKey = `${a.date || ''} ${a.time || ''} ${a.filename || ''}`;
      const bKey = `${b.date || ''} ${b.time || ''} ${b.filename || ''}`;
      return bKey.localeCompare(aKey);
    });

    return list;
  }

  public getBackupFilePath(filename: string): string | null {
    const cleanFilename = path.basename(filename);
    const p1 = path.resolve(BACKUPS_DIR, cleanFilename);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.resolve(LEGACY_BACKUPS_DIR, cleanFilename);
    if (fs.existsSync(p2)) return p2;
    return null;
  }

  // --- RESTORE WITH SAFETY SNAPSHOT FIRST ---
  public restoreBackup(backupId: string, performedBy: string, performedByEmpId: string): { success: boolean; safetyBackupId: string } {
    const backups = this.getBackups();
    const targetMeta = backups.find(b => b.id === backupId || b.filename === backupId || b.filename === `${backupId}.json`);
    
    let targetFile: string | null = null;
    if (targetMeta) {
      targetFile = this.getBackupFilePath(targetMeta.filename);
    } else {
      targetFile = this.getBackupFilePath(backupId) || this.getBackupFilePath(`${backupId}.json`);
    }

    if (!targetFile || !fs.existsSync(targetFile)) {
      throw new Error(`Backup snapshot file for '${backupId}' is missing on disk in 'backup data'.`);
    }

    // MANDATORY SAFETY STEP: Safety snapshot of current database before restoring!
    const safetySnapshot = this.createBackup(
      `SAFETY PRE-RESTORE (${performedBy})`,
      `Safety backup created automatically before restoring snapshot ${backupId}`
    );

    const raw = fs.readFileSync(targetFile, 'utf-8');
    const restoredState: DatabaseState = JSON.parse(raw);

    // Verify minimum structural integrity
    if (!restoredState.users || !restoredState.items) {
      throw new Error('Corrupted or incompatible database snapshot structure.');
    }

    this.state = restoredState;
    this.persistSync();

    this.logAudit({
      user: performedBy,
      employeeId: performedByEmpId,
      action: 'RESTORE',
      module: 'SYSTEM',
      details: `Database restored to snapshot ${backupId}. Pre-restore safety backup: ${safetySnapshot.id}.`,
    });

    return {
      success: true,
      safetyBackupId: safetySnapshot.id,
    };
  }

  // --- RESTORE FROM UPLOADED JSON PAYLOAD ---
  public restoreFromPayload(restoredState: DatabaseState, performedBy: string, performedByEmpId: string): { success: boolean; safetyBackupId: string } {
    if (!restoredState.users || !restoredState.items) {
      throw new Error('Invalid database backup structure: missing users or items.');
    }

    // Safety snapshot of current database
    const safetySnapshot = this.createBackup(
      `SAFETY PRE-UPLOAD-RESTORE (${performedBy})`,
      `Safety backup created automatically before restoring uploaded JSON backup`
    );

    this.state = restoredState;
    this.persistSync();

    this.logAudit({
      user: performedBy,
      employeeId: performedByEmpId,
      action: 'RESTORE',
      module: 'SYSTEM',
      details: `Database restored from uploaded JSON file (${restoredState.items.length} items). Pre-restore safety backup: ${safetySnapshot.id}.`,
    });

    return {
      success: true,
      safetyBackupId: safetySnapshot.id,
    };
  }
}

export const dbManager = new DatabaseManager();
