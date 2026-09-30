import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { InventoryView } from './components/InventoryView.js';
import { RequestsView } from './components/RequestsView.js';
import { TransactionsView } from './components/TransactionsView.js';
import { ReportsView } from './components/ReportsView.js';
import { AdminPanel } from './components/AdminPanel.js';
import { BackupRestoreView } from './components/BackupRestoreView.js';
import { ProfileView } from './components/ProfileView.js';
import { LoginView } from './components/LoginView.js';
import { ItemDetailsModal } from './components/ItemDetailsModal.js';
import { ItemFormModal } from './components/ItemFormModal.js';
import { RequestItemModal } from './components/RequestItemModal.js';
import { ReturnModal } from './components/ReturnModal.js';
import { GlobalSearchModal } from './components/GlobalSearchModal.js';
import { ThemeModal } from './components/ThemeModal.js';
import { ChangePasswordModal } from './components/ChangePasswordModal.js';
import { InventoryItem } from './types/inventory.js';
import { api } from './services/api.js';
import { HardDrive, CheckCircle2, Clock, X } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [currentFilter, setCurrentFilter] = useState<any>({});
  const [incomingPendingCount, setIncomingPendingCount] = useState<number>(0);

  // Modals
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [requestModalItem, setRequestModalItem] = useState<InventoryItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'SPARE_PART' | 'TOOL_EQUIPMENT'>('SPARE_PART');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [returnItem, setReturnItem] = useState<InventoryItem | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [backupToast, setBackupToast] = useState<{
    id: string;
    filename: string;
    time: string;
    date: string;
    description?: string;
  } | null>(null);

  // Refresh pending requests badge count periodically
  const fetchPendingCounts = async () => {
    if (!user) return;
    try {
      const res = await api.getRequests('incoming');
      const count = (res.requests || []).filter(r => r.status === 'PENDING').length;
      setIncomingPendingCount(count);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (view: string, filter: any = {}) => {
    setCurrentView(view);
    setCurrentFilter(filter);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleOpenRequest = (item: InventoryItem) => {
    setRequestModalItem(item);
  };

  const handleOpenCreate = (type: 'SPARE_PART' | 'TOOL_EQUIPMENT') => {
    setCreateModalType(type);
    setEditItem(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditItem(item);
    setCreateModalType(item.type);
    setCreateModalOpen(true);
  };

  const handleOpenReturn = (item: InventoryItem) => {
    setReturnItem(item);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Starting AC R&amp;I Management System...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      {/* Top Enterprise Header */}
      <Navbar
        onOpenSearch={() => setSearchModalOpen(true)}
        onNavigate={handleNavigate}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          currentFilter={currentFilter}
          onNavigate={handleNavigate}
          incomingPendingCount={incomingPendingCount}
          onOpenChangePassword={() => setChangePasswordModalOpen(true)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View Switcher Content */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={handleNavigate}
                onOpenCreate={handleOpenCreate}
                onSelectItem={handleSelectItem}
              />
            )}

            {currentView === 'inventory' && (
              <InventoryView
                key={`inventory-${inventoryRefreshKey}`}
                initialFilter={currentFilter}
                onSelectItem={handleSelectItem}
                onRequestItem={handleOpenRequest}
                onOpenCreate={handleOpenCreate}
                onOpenEdit={handleOpenEdit}
                onOpenReturn={handleOpenReturn}
              />
            )}

            {currentView === 'search' && (
              <InventoryView
                key={`search-${inventoryRefreshKey}`}
                initialFilter={{}}
                onSelectItem={handleSelectItem}
                onRequestItem={handleOpenRequest}
                onOpenCreate={handleOpenCreate}
                onOpenEdit={handleOpenEdit}
                onOpenReturn={handleOpenReturn}
              />
            )}

            {currentView === 'requests' && (
              <RequestsView initialTab={currentFilter?.tab || 'incoming'} />
            )}

            {currentView === 'transactions' && (
              <TransactionsView initialFilter={currentFilter} />
            )}

            {currentView === 'reports' && <ReportsView />}

            {currentView === 'backup' && <BackupRestoreView />}

            {currentView === 'admin' && (
              <AdminPanel initialTab={currentFilter?.tab || 'users'} />
            )}

            {currentView === 'profile' && <ProfileView />}
          </main>

          {/* App Bottom Footer */}
          <footer className="py-2 px-4 sm:px-6 bg-slate-900 border-t border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 z-20">
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-200">Walton AC R&amp;I</span>
              <span className="text-slate-600">|</span>
              <span>Spare Parts &amp; Tools Management System</span>
            </div>
            <div className="font-semibold text-cyan-400 tracking-wide flex items-center gap-2 bg-slate-950 px-3.5 py-1 rounded-md border border-cyan-500/30 text-[11px] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Software Development by Jahid AC R&amp;I (ID-38250)</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Modals */}
      {selectedItem && (
        <ItemDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRequestItem={handleOpenRequest}
          onOpenReturn={handleOpenReturn}
        />
      )}

      {requestModalItem && (
        <RequestItemModal
          item={requestModalItem}
          onClose={() => setRequestModalItem(null)}
          onRequestSubmitted={() => {
            fetchPendingCounts();
            handleNavigate('requests', { tab: 'my' });
          }}
        />
      )}

      {createModalOpen && (
        <ItemFormModal
          initialType={createModalType}
          editItem={editItem}
          onClose={() => {
            setCreateModalOpen(false);
            setEditItem(null);
          }}
          onSaved={(autoBackupInfo) => {
            // Trigger instant inventory refresh and navigation
            setInventoryRefreshKey(k => k + 1);
            if (autoBackupInfo) {
              setBackupToast({
                id: autoBackupInfo.id,
                filename: autoBackupInfo.filename,
                time: autoBackupInfo.displayTime || autoBackupInfo.time,
                date: autoBackupInfo.date,
                description: autoBackupInfo.description,
              });
              setTimeout(() => setBackupToast(null), 10000);
            }
            handleNavigate('inventory', currentFilter);
          }}
        />
      )}

      {/* Floating Auto-Backup Notification Toast */}
      {backupToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/80 shadow-2xl rounded-2xl p-4 max-w-md w-full animate-pop-in text-white flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/30">
            <HardDrive className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-emerald-400 tracking-wide uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-Backup Saved</span>
              </h4>
              <span className="text-[10px] text-slate-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-emerald-400" />
                {backupToast.time} BST
              </span>
            </div>
            <p className="text-xs text-slate-100 mt-1.5 font-mono truncate font-semibold">
              {backupToast.filename}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Snapshot stored into source code <code className="text-emerald-300 font-bold bg-slate-800/80 px-1 rounded">./backup data</code>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setBackupToast(null);
                  handleNavigate('admin', { tab: 'backup' });
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                View in Backups
              </button>
              <button
                onClick={() => setBackupToast(null)}
                className="px-2.5 py-1 text-slate-400 hover:text-white text-xs transition"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setBackupToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {returnItem && (
        <ReturnModal
          item={returnItem}
          mode="INITIATE_RETURN"
          onClose={() => setReturnItem(null)}
          onCompleted={() => {
            handleNavigate('requests', { tab: 'my' });
          }}
        />
      )}

      {searchModalOpen && (
        <GlobalSearchModal
          onClose={() => setSearchModalOpen(false)}
          onSelectItem={handleSelectItem}
          onRequestItem={handleOpenRequest}
        />
      )}

      {/* Themes & Wallpaper Modal */}
      <ThemeModal />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
