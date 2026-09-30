import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DatabaseBackup } from '../types/inventory';
import {
  HardDrive,
  Download,
  RotateCcw,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Shield,
  Search,
  Database,
  Calendar,
  Lock
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const { user } = useAuth();
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [downloadingLive, setDownloadingLive] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [restoreConfirmBackup, setRestoreConfirmBackup] = useState<DatabaseBackup | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload restore state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadJsonData, setUploadJsonData] = useState<any>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadingRestore, setUploadingRestore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackups = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getBackups();
      setBackups(res.backups || []);
      setSystemSettings(res.settings || null);
    } catch (err: any) {
      if (!silent) setErrorMsg(err?.message || 'Failed to fetch backups.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
    // Auto-refresh backups every 4 seconds to capture auto-backups generated from data entries
    const interval = setInterval(() => {
      loadBackups(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateManualBackup = async () => {
    try {
      setCreating(true);
      setErrorMsg(null);
      await api.createBackup(`Manual snapshot triggered by ${user?.name || 'User'}`);
      setRestoreSuccessMsg('Backup snapshot created successfully and stored into "backup data" folder.');
      loadBackups();
      setTimeout(() => setRestoreSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create backup.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadLiveDb = async () => {
    try {
      setDownloadingLive(true);
      setErrorMsg(null);
      await api.downloadCurrentDbBackup();
      setRestoreSuccessMsg('Live database downloaded successfully.');
      setTimeout(() => setRestoreSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download live database.');
    } finally {
      setDownloadingLive(false);
    }
  };

  const handleDownloadBackupFile = async (filename: string) => {
    try {
      setDownloadingFile(filename);
      setErrorMsg(null);
      await api.downloadBackupFile(filename);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download backup file.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreConfirmBackup) return;
    try {
      setRestoring(true);
      setErrorMsg(null);
      const res = await api.restoreBackup(restoreConfirmBackup.filename || restoreConfirmBackup.id);
      setRestoreSuccessMsg(res.message || 'Database restored successfully!');
      setRestoreConfirmBackup(null);
      loadBackups();
      setTimeout(() => {
        setRestoreSuccessMsg(null);
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to restore database.');
    } finally {
      setRestoring(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setErrorMsg('Please select a valid JSON database backup file (.json).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.items || !parsed.users) {
          setErrorMsg('Uploaded file is not a valid AC R&I database schema (missing items or users array).');
          return;
        }
        setUploadJsonData(parsed);
        setUploadFileName(file.name);
        setUploadModalOpen(true);
      } catch (parseErr) {
        setErrorMsg('Failed to parse uploaded JSON file. File may be corrupted.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmUploadRestore = async () => {
    if (!uploadJsonData) return;
    try {
      setUploadingRestore(true);
      setErrorMsg(null);
      const res = await api.uploadRestoreBackup(uploadJsonData);
      setRestoreSuccessMsg(res.message || 'Database restored from uploaded file!');
      setUploadModalOpen(false);
      setUploadJsonData(null);
      loadBackups();
      setTimeout(() => {
        setRestoreSuccessMsg(null);
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Restore from file failed.');
    } finally {
      setUploadingRestore(false);
    }
  };

  const filteredBackups = backups.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.filename && b.filename.toLowerCase().includes(q)) ||
      (b.id && b.id.toLowerCase().includes(q)) ||
      (b.date && b.date.toLowerCase().includes(q)) ||
      (b.createdBy && b.createdBy.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      
      {/* Top Banner Header */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl shadow-lg text-white">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  AC R&amp;I Database Backup &amp; Safe Restore
                </h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Auto-Sync on Entry Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Whenever new spare parts or tools are added, an automated backup DB snapshot with exact date, time, and seconds is immediately stored inside the source code folder <strong className="text-emerald-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">./backup data</strong>.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-2">
                <span>Folder: <strong className="text-emerald-400">./backup data</strong></span>
                <span>•</span>
                <span>Total Snapshots: <strong className="text-white">{backups.length}</strong></span>
                <span>•</span>
                <span>System Status: <strong className="text-emerald-400">HEALTHY</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadLiveDb}
              disabled={downloadingLive}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
              title="Download current live database.json directly"
            >
              <Database className="w-4 h-4" />
              <span>{downloadingLive ? 'Exporting...' : 'Download Live DB (.json)'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Restore from an uploaded database JSON file"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Upload &amp; Restore</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={handleCreateManualBackup}
              disabled={creating}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
              title="Take an instant database snapshot right now"
            >
              <HardDrive className="w-4 h-4" />
              <span>{creating ? 'Saving...' : 'New Snapshot'}</span>
            </button>

            <button
              onClick={() => loadBackups()}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
              title="Refresh backup catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {restoreSuccessMsg && (
        <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{restoreSuccessMsg}</span>
          </div>
          <button onClick={() => setRestoreSuccessMsg(null)} className="text-emerald-400 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Snapshots Catalog Table */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        
        {/* Search Bar & Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snapshots by filename, date, trigger..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Showing <strong className="text-white">{filteredBackups.length}</strong> of {backups.length} backup files
          </div>
        </div>

        {/* Snapshots Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Backup Filename</th>
                  <th className="py-3 px-4">Date &amp; Time (Exact Seconds)</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Trigger / User</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredBackups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      {loading ? 'Loading backup records...' : 'No backup snapshots found matching your criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredBackups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                      {/* Filename */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-xs">{b.filename || `${b.id}.json`}</span>
                        </div>
                      </td>

                      {/* Date & Time with Exact Seconds */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{b.date}</div>
                        <div className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{b.displayTime || b.time}</span>
                          <span className="text-[9px] font-sans font-normal text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            BST
                          </span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 text-slate-300">
                        {((b.sizeBytes || 0) / 1024).toFixed(1)} KB
                      </td>

                      {/* Trigger / Created By */}
                      <td className="py-3 px-4 text-slate-200 font-sans font-medium">
                        {b.createdBy || 'SYSTEM'}
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-sans max-w-xs truncate">
                        {b.description || (b.recordCounts ? `${b.recordCounts.items} items • ${b.recordCounts.users} users` : 'Full snapshot')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {b.status || 'SUCCESS'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadBackupFile(b.filename)}
                            disabled={downloadingFile === b.filename}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-700"
                            title="Download this backup file"
                          >
                            <Download className="w-3 h-3 text-blue-400" />
                            <span>{downloadingFile === b.filename ? '...' : 'Download'}</span>
                          </button>

                          <button
                            onClick={() => setRestoreConfirmBackup(b)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                            title="Restore system state to this snapshot"
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
      </div>

      {/* Confirmation Modal: Restore from Catalog */}
      {restoreConfirmBackup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Confirm Point-in-Time Restore</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to restore the entire system to snapshot <strong className="text-amber-400 font-mono">{restoreConfirmBackup.filename}</strong>?
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1 text-xs font-mono text-slate-400">
              <div>Snapshot Date: <strong className="text-white">{restoreConfirmBackup.date}</strong></div>
              <div>Snapshot Time: <strong className="text-emerald-400">{restoreConfirmBackup.displayTime || restoreConfirmBackup.time} BST</strong></div>
              <div>Trigger: <strong className="text-white">{restoreConfirmBackup.createdBy}</strong></div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 text-blue-400" />
              <span>A pre-restore safety snapshot will automatically be archived in <code className="font-mono text-blue-200">./backup data</code> before applying this restore.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRestoreConfirmBackup(null)}
                disabled={restoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2"
              >
                {restoring ? 'Restoring System...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Upload & Restore */}
      {uploadModalOpen && uploadJsonData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Restore from Uploaded JSON</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Verify the contents of uploaded file <strong className="text-emerald-400 font-mono">{uploadFileName}</strong>:
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span>Inventory Items:</span>
                <strong className="text-emerald-400">{(uploadJsonData.items || []).length} items</strong>
              </div>
              <div className="flex justify-between">
                <span>Authorized Users:</span>
                <strong className="text-white">{(uploadJsonData.users || []).length} users</strong>
              </div>
              <div className="flex justify-between">
                <span>Requests History:</span>
                <strong className="text-white">{(uploadJsonData.requests || []).length} records</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadJsonData(null);
                }}
                disabled={uploadingRestore}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUploadRestore}
                disabled={uploadingRestore}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2"
              >
                {uploadingRestore ? 'Restoring...' : 'Apply Uploaded Database'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
