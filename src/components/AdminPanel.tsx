import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  HardDrive,
  FileSpreadsheet,
  History,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Search,
  Lock,
  Layers,
  MapPin,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, DatabaseBackup, AuditLog, UserRole } from '../types/inventory.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface AdminPanelProps {
  initialTab?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ initialTab = 'users' }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<string>(initialTab);

  // Users tab state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User form
  const [formEmpId, setFormEmpId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OFFICER');
  const [formTeam, setFormTeam] = useState('R&I Cooling Team');
  const [formDept, setFormDept] = useState('AC Research & Innovation');
  const [formPassword, setFormPassword] = useState('');

  // Backups tab state
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [backupSettings, setBackupSettings] = useState<any>(null);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadingLive, setDownloadingLive] = useState(false);
  const [restoreConfirmBackup, setRestoreConfirmBackup] = useState<DatabaseBackup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);
  const [uploadingBackupFile, setUploadingBackupFile] = useState(false);
  const [clearingDummyData, setClearingDummyData] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  const handleClearDummyData = async () => {
    try {
      setClearingDummyData(true);
      const res = await api.clearAllDummyData();
      setClearSuccessMsg(res.message || 'All dummy data successfully cleared.');
      loadBackups();
    } catch (e: any) {
      console.error(e);
    } finally {
      setClearingDummyData(false);
    }
  };

  // Import tab state
  const [importType, setImportType] = useState<'SPARE_PARTS' | 'TOOLS' | 'USERS'>('SPARE_PARTS');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [syncingLiveExcel, setSyncingLiveExcel] = useState(false);
  const [syncLiveResult, setSyncLiveResult] = useState<{ count: number; message: string } | null>(null);
  const [syncLiveError, setSyncLiveError] = useState<string | null>(null);

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Users password view state
  // Requirement: "super admin theke seta view kore dekhte parbe ki password dise"
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'audit') loadAuditLogs();
    if (tab === 'backup') {
      loadBackups();
      // Auto-poll backups every 3 seconds so auto-backups from officer entries appear live
      const interval = setInterval(() => {
        loadBackups();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [tab]);

  // Loaders
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await api.getBackups();
      setBackups(res.backups || []);
      setBackupSettings(res.settings || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getAuditLogs({ search: logSearch });
      setLogs(res.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // User Actions
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name: formName,
          designation: formDesignation,
          role: formRole,
          team: formTeam,
          department: formDept,
          password: formPassword || undefined,
        });
      } else {
        await api.createUser({
          employeeId: formEmpId,
          name: formName,
          designation: formDesignation,
          role: formRole,
          team: formTeam,
          department: formDept,
          password: formPassword || 'acri123',
        });
      }
      setUserModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to save user.');
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setFormEmpId('');
    setFormName('');
    setFormDesignation('Officer');
    setFormRole('OFFICER');
    setFormTeam('R&I Cooling Team');
    setFormDept('AC Research & Innovation');
    setFormPassword('');
    setUserModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setFormEmpId(u.employeeId);
    setFormName(u.name);
    setFormDesignation(u.designation);
    setFormRole(u.role);
    setFormTeam(u.team);
    setFormDept(u.department);
    setFormPassword('');
    setUserModalOpen(true);
  };

  const toggleUserStatus = async (u: User) => {
    const nextStatus = u.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateUser(u.id, { accountStatus: nextStatus });
      loadUsers();
    } catch (e: any) {
      alert(e?.message);
    }
  };

  // Backup Actions
  const handleCreateManualBackup = async () => {
    try {
      setCreatingBackup(true);
      await api.createBackup('Manual database snapshot');
      setRestoreSuccessMsg('Backup snapshot created successfully in backup data folder.');
      setTimeout(() => setRestoreSuccessMsg(null), 4000);
      loadBackups();
    } catch (err: any) {
      setRestoreErrorMsg(err?.message || 'Failed to trigger backup.');
      setTimeout(() => setRestoreErrorMsg(null), 5000);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackupFile = async (filename: string) => {
    try {
      setDownloadingFile(filename);
      await api.downloadBackupFile(filename);
    } catch (err: any) {
      alert(err?.message || 'Download failed');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDownloadLiveDb = async () => {
    try {
      setDownloadingLive(true);
      await api.downloadCurrentDbBackup();
    } catch (err: any) {
      alert(err?.message || 'Failed to download active database backup');
    } finally {
      setDownloadingLive(false);
    }
  };

  const handleRestore = async (b: DatabaseBackup) => {
    try {
      setRestoring(true);
      setRestoreErrorMsg(null);
      const res = await api.restoreBackup(b.id);
      setRestoreSuccessMsg(`${res.message} (Safety Backup: ${res.safetyBackupId})`);
      setRestoreConfirmBackup(null);
      loadBackups();
    } catch (err: any) {
      setRestoreErrorMsg(err?.message || 'Restore procedure failed.');
    } finally {
      setRestoring(false);
    }
  };

  const handleUploadJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setUploadingBackupFile(true);
        setRestoreErrorMsg(null);
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.items || !parsed.users) {
          throw new Error('Invalid database backup structure: missing users or items.');
        }

        const confirmRestore = window.confirm(
          `Are you sure you want to restore from uploaded backup '${file.name}' (${parsed.items.length} items)? A safety backup will be created first.`
        );
        if (!confirmRestore) return;

        const res = await api.uploadRestoreBackup(parsed);
        setRestoreSuccessMsg(res.message);
        loadBackups();
      } catch (err: any) {
        setRestoreErrorMsg(err?.message || 'Failed to parse or restore uploaded JSON backup file.');
      } finally {
        setUploadingBackupFile(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Excel File Parsing with SheetJS (XLSX)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedRows(data);
      } catch (err) {
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    try {
      setImporting(true);
      const res = await api.importData(importType, parsedRows);
      setImportSummary(res.summary);
      setParsedRows([]);
    } catch (err: any) {
      alert(err?.message || 'Import operation failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleLiveExcelSync = async () => {
    try {
      setSyncingLiveExcel(true);
      setSyncLiveResult(null);
      setSyncLiveError(null);
      const res = await api.syncFromExcel();
      setSyncLiveResult({ count: res.count, message: res.message });
    } catch (err: any) {
      setSyncLiveError(err?.message || 'Failed to sync data from Spare Parts.xlsx');
    } finally {
      setSyncingLiveExcel(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {user?.role === 'SUPER ADMIN' ? 'Super Admin Governance Suite' : 'Database Backup & Storage Suite'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Event-triggered auto-backups, persistent database snapshots, Excel migration, and audit trails.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {user?.role === 'SUPER ADMIN' && (
            <button
              onClick={() => setTab('users')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                tab === 'users' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users &amp; Roles</span>
            </button>
          )}

          <button
            onClick={() => setTab('backup')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'backup' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Backup &amp; DB Storage</span>
          </button>

          {user?.role === 'SUPER ADMIN' && (
            <>
              <button
                onClick={() => setTab('import')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  tab === 'import' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel Migration</span>
              </button>
              <button
                onClick={() => setTab('audit')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  tab === 'audit' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Users & Roles */}
      {tab === 'users' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Authorized Personnel Database</h2>
              <p className="text-xs text-slate-500">Only authorized employees can access the platform.</p>
            </div>
            <button
              onClick={openAddUser}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3.5">Employee ID</th>
                  <th className="py-3 px-3.5">Name</th>
                  <th className="py-3 px-3.5">Designation</th>
                  <th className="py-3 px-3.5">Role</th>
                  <th className="py-3 px-3.5">Team</th>
                  <th className="py-3 px-3.5">Password</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Last Login</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">{u.employeeId}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-2.5 px-3.5 text-slate-600">{u.designation}</td>
                    <td className="py-2.5 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'SUPER ADMIN'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : u.role === 'HOD' || u.role === 'MODEL MANAGER'
                          ? 'bg-purple-100 text-purple-900'
                          : u.role === 'ENGINEER' || u.role === 'IN-CHARGE'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-blue-600 font-medium">{u.team}</td>
                    
                    {/* Password View Column for Super Admin */}
                    {/* User requirement: "super admin theke seta view kore dekhte parbe ki password dise" */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          revealedPasswords[u.id]
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-xs'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {revealedPasswords[u.id] ? (u.password || u.employeeId) : '••••••••'}
                        </span>
                        <button
                          onClick={() => setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded transition"
                          title={revealedPasswords[u.id] ? 'Hide Password' : 'Click to View Password'}
                        >
                          {revealedPasswords[u.id] ? (
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.accountStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">{u.lastLogin || 'Never'}</td>
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            const newPass = prompt(`Reset password for ${u.name} (${u.employeeId}):`, u.employeeId);
                            if (newPass && newPass.trim().length >= 3) {
                              try {
                                await api.resetUserPassword(u.id, newPass.trim());
                                alert(`Password updated successfully for ${u.name}!`);
                                loadUsers();
                              } catch (e: any) {
                                alert(e?.message || 'Failed to reset password.');
                              }
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditUser(u)}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            u.accountStatus === 'ACTIVE'
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Event-Triggered Backup & Safe Restore */}
      {tab === 'backup' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Health & Engine Status Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <HardDrive className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Automated Event Backup &amp; Live Storage</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Auto Backup on Data Entry
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Whenever new spare parts or tools are added, a backup DB file is automatically saved into the source code folder <strong className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">backup data</strong>. Changes persist directly to <span className="font-mono text-emerald-700">database.json</span>.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono mt-2">
                  <span>Storage: <strong className="text-emerald-700">./backup data</strong></span>
                  <span>•</span>
                  <span>Total Snapshots: <strong>{backups.length}</strong></span>
                  <span>•</span>
                  <span>Status: <strong className="text-emerald-600">HEALTHY</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadLiveDb}
                disabled={downloadingLive}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                title="Download the full current live database.json file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingLive ? 'Downloading...' : 'Download Current DB Backup (JSON)'}</span>
              </button>

              <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-xs">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{uploadingBackupFile ? 'Validating...' : 'Upload & Restore DB File'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleUploadJsonBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleCreateManualBackup}
                disabled={creatingBackup}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{creatingBackup ? 'Saving...' : 'Create Snapshot'}</span>
              </button>

              <button
                onClick={loadBackups}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {restoreSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{restoreSuccessMsg}</span>
              </div>
              <button onClick={() => setRestoreSuccessMsg(null)} className="text-emerald-700 font-bold text-xs hover:underline">Dismiss</button>
            </div>
          )}

          {restoreErrorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{restoreErrorMsg}</span>
              </div>
              <button onClick={() => setRestoreErrorMsg(null)} className="text-rose-700 font-bold text-xs hover:underline">Dismiss</button>
            </div>
          )}

          {clearSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{clearSuccessMsg}</span>
              </div>
              <button onClick={() => setClearSuccessMsg(null)} className="text-emerald-700 font-bold text-xs hover:underline">Dismiss</button>
            </div>
          )}

          {/* Backup Snapshots Catalog */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  'backup data' Snapshot Catalog ({backups.length} Snapshots)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Stored inside the source code folder <code className="bg-slate-200 px-1 rounded text-slate-700 font-mono">./backup data</code>. Download anytime or safely restore.
                </p>
              </div>
              <button
                onClick={handleClearDummyData}
                disabled={clearingDummyData}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-semibold flex items-center gap-1 self-start sm:self-auto transition"
                title="Wipes dummy spare parts and mock transactions"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>{clearingDummyData ? 'Clearing...' : 'Clear All Dummy Data'}</span>
              </button>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3.5">Backup ID / File</th>
                  <th className="py-2.5 px-3.5">Date &amp; Time</th>
                  <th className="py-2.5 px-3.5">Size</th>
                  <th className="py-2.5 px-3.5">Trigger / Created By</th>
                  <th className="py-2.5 px-3.5">Contents Summary</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No backups in 'backup data' folder yet. They will automatically be generated when new spare parts or tools are added.
                    </td>
                  </tr>
                ) : (
                  backups.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                        {b.filename || `${b.id}.json`}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">
                        <div className="font-semibold text-slate-800">{b.date}</div>
                        <div className="text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{b.displayTime || b.time}</span>
                          <span className="text-[9px] font-sans font-normal text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                            BST
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-600">
                        {(b.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700 font-medium">{b.createdBy}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                        {b.recordCounts ? (
                          <span>
                            {b.recordCounts.items} items • {b.recordCounts.users} users • {b.recordCounts.requests || 0} reqs
                          </span>
                        ) : (
                          b.description || 'System snapshot'
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadBackupFile(b.filename)}
                            disabled={downloadingFile === b.filename}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                            title="Download this backup .json file"
                          >
                            <Download className="w-3 h-3 text-blue-600" />
                            <span>{downloadingFile === b.filename ? '...' : 'Download'}</span>
                          </button>
                          <button
                            onClick={() => setRestoreConfirmBackup(b)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                            title="Restore database to this point in time (creates safety snapshot first)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Excel Migration & Import */}
      {tab === 'import' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Superadmin Dedicated Excel Sync Card */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/40 rounded-xl p-5 shadow-sm text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Walton AC R&amp;I Master Excel Direct Synchronization
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Superadmin Exclusive
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Synchronize all master spare parts directly from the system's official <span className="font-mono text-cyan-300 font-semibold">Spare Parts.xlsx</span> workbook into the live database. Automatic matching for code, name, category, concern, and storage location.
                </p>
              </div>

              <button
                onClick={handleLiveExcelSync}
                disabled={syncingLiveExcel}
                className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${syncingLiveExcel ? 'animate-spin' : ''}`} />
                <span>{syncingLiveExcel ? 'Synchronizing Excel...' : 'Sync Excel Now'}</span>
              </button>
            </div>

            {/* Sync Feedback */}
            {syncLiveResult && (
              <div className="mt-4 p-3 bg-emerald-900/60 border border-emerald-400/40 rounded-lg flex items-center gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Success:</strong> {syncLiveResult.message} ({syncLiveResult.count} items synchronized).
                </span>
              </div>
            )}

            {syncLiveError && (
              <div className="mt-4 p-3 bg-rose-950/80 border border-rose-500/40 rounded-lg flex items-center gap-2.5 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Sync Error:</strong> {syncLiveError}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Custom Spreadsheet Data Migration (.xlsx, .csv)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload any custom Excel or CSV spreadsheet to migrate users, spare parts, or tools into the database.
              </p>
            </div>

            {/* Import Type Switcher */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Target Module:</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setImportType('SPARE_PARTS')}
                  className={`px-3 py-1 rounded-md transition ${
                    importType === 'SPARE_PARTS' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Spare Parts
                </button>
                <button
                  onClick={() => setImportType('TOOLS')}
                  className={`px-3 py-1 rounded-md transition ${
                    importType === 'TOOLS' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tools &amp; Equipment
                </button>
                <button
                  onClick={() => setImportType('USERS')}
                  className={`px-3 py-1 rounded-md transition ${
                    importType === 'USERS' ? 'bg-white text-indigo-800 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Users / Employees
                </button>
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition relative">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">
                {fileName ? fileName : 'Select or drop Excel (.xlsx, .xls, .csv) file'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automatic column matching for Item Code, Name, Quantity, Rack, Shelf, Owner, etc.
              </p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">
                    Previewing {parsedRows.length} Rows from spreadsheet
                  </div>
                  <button
                    onClick={handleExecuteImport}
                    disabled={importing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    {importing ? 'Importing Data...' : `Execute Migration (${parsedRows.length} Records)`}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[11px] sticky top-0">
                      <tr>
                        {Object.keys(parsedRows[0] || {}).slice(0, 8).map(k => (
                          <th key={k} className="p-2 border-b border-slate-200">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          {Object.values(r).slice(0, 8).map((val: any, vi) => (
                            <td key={vi} className="p-2 text-slate-700 max-w-[150px] truncate">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Summary Results */}
            {importSummary && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Migration Execution Completed</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">IMPORTED</span>
                    <strong className="text-emerald-700 text-sm">{importSummary.imported}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">UPDATED</span>
                    <strong className="text-blue-700 text-sm">{importSummary.updated}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">FAILED</span>
                    <strong className="text-rose-700 text-sm">{importSummary.failed}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    <span className="text-[10px] text-slate-500 block">TOTAL</span>
                    <strong className="text-slate-800 text-sm">{importSummary.total}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Permanent Audit Logs */}
      {tab === 'audit' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">System Audit Trail &amp; Compliance</h2>
              <p className="text-xs text-slate-500">Immutable permanent activity log of every operation.</p>
            </div>
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadAuditLogs()}
                placeholder="Search user, action, record ID..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User &amp; ID</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500">{log.timestamp}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {log.user} (#{log.employeeId})
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                        log.action === 'APPROVE' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'RESTORE' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{log.module}</td>
                    <td className="py-2 px-3 font-sans text-slate-700 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Add / Edit Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingUser ? `Edit Employee: ${editingUser.name}` : 'Add New AC R&I Employee'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={formEmpId}
                  onChange={e => setFormEmpId(e.target.value)}
                  placeholder="e.g. 38250"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Jahid Hasan"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={formDesignation}
                  onChange={e => setFormDesignation(e.target.value)}
                  placeholder="e.g. Senior Lead Engineer"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Role</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="SUPER ADMIN">SUPER ADMIN</option>
                    <option value="HOD">HOD</option>
                    <option value="MODEL MANAGER">MODEL MANAGER</option>
                    <option value="IN-CHARGE">IN-CHARGE</option>
                    <option value="ENGINEER">ENGINEER</option>
                    <option value="OFFICER">OFFICER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Team</label>
                  <input
                    type="text"
                    required
                    value={formTeam}
                    onChange={e => setFormTeam(e.target.value)}
                    placeholder="e.g. R&I Cooling Team"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Leave blank to preserve current' : 'Initial login password'}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Safety Confirmation Modal Before Restore */}
      {restoreConfirmBackup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Safety Snapshot &amp; Database Restoration</span>
            </h3>

            <p className="text-xs text-slate-700 leading-relaxed">
              This operation will restore the selected database snapshot: <strong className="font-mono">{restoreConfirmBackup.id}</strong> ({restoreConfirmBackup.date} {restoreConfirmBackup.time}).
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mandatory Safety Backup Enforced</span>
              </div>
              <p>
                A complete safety snapshot of the live database will be created automatically immediately before restoration occurs. Nothing will be silently lost.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRestoreConfirmBackup(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={() => handleRestore(restoreConfirmBackup)}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
              >
                {restoring ? 'Creating Safety Snapshot & Restoring...' : 'Confirm Safe Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
