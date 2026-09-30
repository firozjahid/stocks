import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Layers,
  Building,
  Key,
  Calendar,
  Clock,
  CheckCircle2,
  Box,
  Wrench,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

export const ProfileView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword.trim()) return;
    try {
      setSaving(true);
      await api.updateUser(user.id, { password: newPassword });
      setMessage('Password updated successfully.');
      setNewPassword('');
      refreshUser();
    } catch (e: any) {
      alert(e?.message || 'Error updating password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Personnel Profile &amp; Governance Credentials
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Official AC Research &amp; Innovation identity card and authorized inventory permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Identity Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden bg-slate-800 shadow-md mb-3 flex items-center justify-center">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-3xl text-white">{user?.name?.charAt(0)}</span>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
          <div className="text-xs text-slate-500 mt-0.5">{user?.designation}</div>

          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {user?.role}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {user?.accountStatus}
            </span>
          </div>

          <div className="w-full mt-6 pt-4 border-t border-slate-100 space-y-2 text-left text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Employee ID:</span>
              <strong className="font-mono text-slate-900">{user?.employeeId}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Department:</span>
              <span className="text-slate-700 font-medium">{user?.department}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Assigned Team:</span>
              <span className="text-blue-600 font-medium">{user?.team}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Lab Section:</span>
              <span className="text-slate-700">{user?.section}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Last Login:</span>
              <span className="font-mono text-slate-600">{user?.lastLogin || 'Current session'}</span>
            </div>
          </div>
        </div>

        {/* Security & Access Rights */}
        <div className="md:col-span-2 space-y-5">
          {/* Permissions Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Role Permissions &amp; Ownership Rules</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Own Inventory Control</span>
                </div>
                <p className="text-slate-500">
                  Authorized to create, edit specifications, and update condition of your own team's items.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Inter-Team Borrowing</span>
                </div>
                <p className="text-slate-500">
                  Authorized to submit digital borrowing requests for available items across any AC R&amp;I team.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Owner Approval Rights</span>
                </div>
                <p className="text-slate-500">
                  Sole authority to approve, partially approve, or reject incoming requests for your own items.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Cross-Team Edit Protection</span>
                </div>
                <p className="text-slate-500">
                  Strictly prevented from modifying or deleting another officer's inventory records.
                </p>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Change Login Password</span>
            </h3>

            {message && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                {message}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="max-w-md space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new account password"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !newPassword}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
