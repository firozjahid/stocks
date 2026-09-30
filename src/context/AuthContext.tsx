import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, InventoryItem, ItemRequest, UserRole } from '../types/inventory.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (employeeId: string) => Promise<void>;
  canManageInventory: boolean;
  canRequestItem: boolean;
  isViewOnly: boolean;
  isSuperAdmin: boolean;
  isOwner: (item: InventoryItem) => boolean;
  canEditItem: (item: InventoryItem) => boolean;
  canDeleteItem: (item: InventoryItem) => boolean;
  canApproveRequest: (request: ItemRequest) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const activeId = api.getEmployeeId();
      if (!activeId) {
        setUser(null);
        return;
      }
      const res = await api.getCurrentUser();
      setUser(res.user);
    } catch (err) {
      console.warn('Session expired or invalid, requiring login');
      api.setEmployeeId(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (employeeId: string, password: string) => {
    const res = await api.login(employeeId, password);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const switchUser = async (employeeId: string) => {
    api.setEmployeeId(employeeId);
    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
    } catch (e) {
      console.error('Failed to switch user:', e);
    }
  };

  // Master Super Admin governance authority (jhfboss / SUPER ADMIN)
  const isSuperAdmin = user?.role === 'SUPER ADMIN' || user?.employeeId?.toLowerCase() === 'jhfboss';

  // Role permissions: ONLY Officer role and Super Admin / jhfboss can entry/add Spare Parts and Tools
  const canManageInventory = !!(user && (user.role === 'OFFICER' || isSuperAdmin));

  // Role permissions: ONLY Officer role and Super Admin / jhfboss can request spare parts and tools
  const canRequestItem = !!(user && (user.role === 'OFFICER' || isSuperAdmin));

  // Strictly View-Only mode for Engineer, HOD, DHOD, In-Charge, Model Manager, Technician, CBO, DCBO, etc.
  const isViewOnly = !canManageInventory && !canRequestItem && !isSuperAdmin;

  const isOwner = (item: InventoryItem) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return item.responsibleEmployeeId === user.employeeId;
  };

  const canEditItem = (item: InventoryItem) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return user.role === 'OFFICER' && item.responsibleEmployeeId === user.employeeId;
  };

  const canDeleteItem = (item: InventoryItem) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return user.role === 'OFFICER' && item.responsibleEmployeeId === user.employeeId;
  };

  const canApproveRequest = (request: ItemRequest) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return request.ownerEmployeeId === user.employeeId;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchUser,
        canManageInventory,
        canRequestItem,
        isViewOnly,
        isSuperAdmin,
        isOwner,
        canEditItem,
        canDeleteItem,
        canApproveRequest,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
