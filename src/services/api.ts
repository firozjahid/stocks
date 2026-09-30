import {
  User,
  InventoryItem,
  ItemRequest,
  MovementTransaction,
  AuditLog,
  NotificationItem,
  DatabaseBackup,
  SystemTeam,
  SystemLocation
} from '../types/inventory.js';

class ApiClient {
  private currentEmployeeId: string | null = null;

  constructor() {
    // Restore saved session employee ID from localStorage or null (no auto-login)
    const saved = localStorage.getItem('acri_active_employee_id');
    this.currentEmployeeId = saved || null;
  }

  public setEmployeeId(empId: string | null) {
    this.currentEmployeeId = empId;
    if (empId) {
      localStorage.setItem('acri_active_employee_id', empId);
    } else {
      localStorage.removeItem('acri_active_employee_id');
    }
  }

  public getEmployeeId(): string | null {
    return this.currentEmployeeId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.currentEmployeeId) {
      headers.set('x-employee-id', this.currentEmployeeId);
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(employeeId: string, password: string): Promise<{ user: User }> {
    const res = await this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ employeeId, password }),
    });
    this.setEmployeeId(res.user.employeeId);
    return res;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setEmployeeId(null);
    }
  }

  // Dashboard
  async getDashboardSummary(): Promise<any> {
    return this.request('/dashboard/summary');
  }

  // Inventory
  async getInventory(params: Record<string, string> = {}): Promise<{ items: InventoryItem[] }> {
    const query = new URLSearchParams(params).toString();
    return this.request<{ items: InventoryItem[] }>(`/inventory${query ? `?${query}` : ''}`);
  }

  async getItemDetails(id: string): Promise<{ item: InventoryItem; history: MovementTransaction[]; activeRequests: ItemRequest[] }> {
    return this.request(`/inventory/${id}`);
  }

  async createItem(data: Partial<InventoryItem>): Promise<{ item: InventoryItem }> {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateItem(id: string, data: Partial<InventoryItem> & { conditionRemarks?: string }): Promise<{ item: InventoryItem }> {
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteItem(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  // Requests
  async getRequests(type?: 'my' | 'incoming' | 'all'): Promise<{ requests: ItemRequest[] }> {
    const query = type ? `?type=${type}` : '';
    return this.request(`/requests${query}`);
  }

  async createRequest(data: {
    itemId: string;
    requestedQuantity: number;
    purpose: string;
    requiredFrom: string;
    requiredTo: string;
    requestType?: string;
    remarks?: string;
  }): Promise<{ request: ItemRequest }> {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reviewRequest(id: string, action: 'APPROVE' | 'PARTIAL' | 'REJECT', approvedQuantity?: number, remarks?: string): Promise<{ request: ItemRequest }> {
    return this.request(`/requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, approvedQuantity, remarks }),
    });
  }

  async requestReturn(id: string, returnRemarks?: string): Promise<{ request: ItemRequest }> {
    return this.request(`/requests/${id}/request-return`, {
      method: 'POST',
      body: JSON.stringify({ returnRemarks }),
    });
  }

  async confirmReturn(id: string, returnedCondition: string, returnRemarks?: string): Promise<{ request: ItemRequest; item: InventoryItem }> {
    return this.request(`/requests/${id}/confirm-return`, {
      method: 'POST',
      body: JSON.stringify({ returnedCondition, returnRemarks }),
    });
  }

  // Transactions
  async getTransactions(params: Record<string, string> = {}): Promise<{ transactions: MovementTransaction[] }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }

  // Audit Logs
  async getAuditLogs(params: Record<string, string> = {}): Promise<{ logs: AuditLog[] }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit-logs${query ? `?${query}` : ''}`);
  }

  // Backups
  async getBackups(): Promise<{ backups: DatabaseBackup[]; settings: any }> {
    return this.request('/backups');
  }

  async createBackup(description?: string): Promise<{ backup: DatabaseBackup }> {
    return this.request('/backups', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  }

  async restoreBackup(backupId: string): Promise<{ success: boolean; message: string; safetyBackupId: string }> {
    return this.request('/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ backupId }),
    });
  }

  async uploadRestoreBackup(backupData: any): Promise<{ success: boolean; message: string; safetyBackupId: string }> {
    return this.request('/backups/upload-restore', {
      method: 'POST',
      body: JSON.stringify({ backupData }),
    });
  }

  async downloadBackupFile(filename: string): Promise<void> {
    const empId = this.currentEmployeeId || '';
    const res = await fetch(`/api/backups/${encodeURIComponent(filename)}/download?authId=${encodeURIComponent(empId)}`, {
      headers: empId ? { 'x-employee-id': empId } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Failed to download backup file');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async downloadCurrentDbBackup(): Promise<void> {
    const empId = this.currentEmployeeId || '';
    const res = await fetch(`/api/backups/current/download?authId=${encodeURIComponent(empId)}`, {
      headers: empId ? { 'x-employee-id': empId } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Failed to download active database backup');
    }
    const blob = await res.blob();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ACRI-DATABASE-BACKUP-${timestamp}.json`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async clearAllDummyData(): Promise<{ success: boolean; message: string }> {
    return this.request('/admin/clear-dummy-data', {
      method: 'POST',
    });
  }

  async syncFromExcel(): Promise<{ success: boolean; count: number; message: string }> {
    return this.request('/admin/sync-excel', {
      method: 'POST',
    });
  }

  // Users & Admin
  async getUsers(): Promise<{ users: User[]; teams: SystemTeam[] }> {
    return this.request('/users');
  }

  async createUser(data: Partial<User>): Promise<{ user: User }> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<{ user: User }> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Import
  async importData(type: 'SPARE_PARTS' | 'TOOLS' | 'USERS', records: any[]): Promise<{ summary: any }> {
    return this.request('/import', {
      method: 'POST',
      body: JSON.stringify({ type, records }),
    });
  }

  // Notifications
  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    return this.request('/notifications');
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request('/notifications/mark-all-read', { method: 'PUT' });
  }

  // Metadata
  async getMetadata(): Promise<{ teams: SystemTeam[]; locations: SystemLocation[] }> {
    return this.request('/metadata/teams-locations');
  }
}

export const api = new ApiClient();
