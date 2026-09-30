// Type definitions for AC R&I Spare Parts & Tools Management System

export type UserRole =
  | 'SUPER ADMIN'
  | 'CBO'
  | 'DCBO'
  | 'DHOD'
  | 'HOD'
  | 'MODEL MANAGER'
  | 'IN-CHARGE'
  | 'ENGINEER'
  | 'OFFICER'
  | 'TECHNICIAN';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string; // Employee ID or UUID
  employeeId: string;
  username?: string;
  name: string;
  designation: string;
  role: UserRole;
  team: string;
  department: string;
  section: string;
  passwordHash?: string;
  password?: string;
  accountStatus: AccountStatus;
  profilePhoto?: string;
  email?: string;
  phone?: string;
  createdDate: string;
  lastLogin?: string;
  lastActivity?: string;
}

export type ItemType = 'SPARE_PART' | 'TOOL_EQUIPMENT';

export type ItemCondition =
  | 'NEW'
  | 'EXCELLENT'
  | 'GOOD'
  | 'USED'
  | 'FAIR'
  | 'DAMAGED'
  | 'UNDER REPAIR'
  | 'OUT OF ORDER'
  | 'SCRAPPED';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'PARTIALLY AVAILABLE'
  | 'BORROWED'
  | 'RESERVED'
  | 'UNDER MAINTENANCE'
  | 'OUT OF STOCK';

export interface ConditionHistoryEntry {
  id: string;
  date: string;
  condition: ItemCondition;
  remarks: string;
  recordedBy: string;
  recordedByEmployeeId: string;
}

export interface InventoryItem {
  id: string;
  type: ItemType;
  itemCode: string; // e.g. SP-487122 or TL-20091
  itemName: string;
  description: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  tonCapacity?: string; // e.g., 1.5 Ton, 2.0 Ton, 3.0 Ton
  unit: string; // Pcs, Set, Box, Roll, Kg, Meter
  
  // Quantities
  totalQuantity: number;
  availableQuantity: number;
  borrowedQuantity: number;
  
  // Team specific sub-quantities (from old spreadsheet migration)
  etTeamQuantity?: number;
  coolingTeamQuantity?: number;
  designTeamQuantity?: number;
  chemicalTeamQuantity?: number;
  commonTeamQuantity?: number;
  
  // Ownership & Team
  responsiblePerson: string;
  responsibleEmployeeId: string;
  responsibleDesignation?: string;
  team: string; // Owner Team
  concern?: string; // Stored concern / Project
  
  // Current custody if borrowed or held elsewhere
  currentHolderPerson?: string;
  currentHolderEmployeeId?: string;
  currentHolderTeam?: string;
  
  // Location
  storageLocation: string; // Building / Lab
  rack: string;
  shelf: string; // Row / Shelf Name
  carton: string; // Column / Carton Number
  storedType: string; // Bulk, Tray, Box, ESD, Tool Rack, Heavy
  
  // Sharing Permissions
  transferable: boolean;
  givable: boolean;
  exchangeable: boolean;
  
  // Status
  condition: ItemCondition;
  previousCondition?: ItemCondition;
  conditionHistory: ConditionHistoryEntry[];
  availability: AvailabilityStatus;
  
  // Dates & Info
  purchaseReceivedDate?: string;
  issuedDate?: string;
  usedDuration?: string;
  remarks: string;
  imageUrl?: string;
  
  // Audit & Soft Delete
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export type RequestType = 'TEMPORARY_BORROW' | 'PERMANENT_TRANSFER' | 'EXCHANGE' | 'GIVABLE';

export type RequestStatus =
  | 'PENDING'
  | 'UNDER REVIEW'
  | 'APPROVED'
  | 'PARTIALLY APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'BORROWED'
  | 'RETURN REQUESTED'
  | 'RETURNED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'OVERDUE';

export interface ItemRequest {
  id: string; // REQ-YYYYMMDD-XXXXX
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: ItemType;
  
  requestedQuantity: number;
  approvedQuantity?: number;
  
  // Requester
  requesterId: string;
  requesterName: string;
  requesterEmployeeId: string;
  requesterTeam: string;
  requesterDesignation?: string;
  
  // Target Owner
  ownerId: string;
  ownerName: string;
  ownerEmployeeId: string;
  ownerTeam: string;
  
  requestType: RequestType;
  purpose: string;
  requiredFrom: string;
  requiredTo: string;
  remarks?: string;
  ownerRemarks?: string;
  status: RequestStatus;
  
  // Workflow timestamps
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  issuedAt?: string;
  returnRequestedAt?: string;
  returnConfirmedAt?: string;
  returnedCondition?: ItemCondition;
  returnRemarks?: string;
}

export type TransactionType = 'BORROW' | 'TRANSFER' | 'RETURN' | 'EXCHANGE' | 'QUANTITY_ADJUST';

export interface MovementTransaction {
  id: string; // TRN-YYYYMMDD-XXXXX / BRW- / RET-
  transactionType: TransactionType;
  requestId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  
  fromPerson: string;
  fromEmployeeId: string;
  fromTeam: string;
  
  toPerson: string;
  toEmployeeId: string;
  toTeam: string;
  
  purpose: string;
  date: string;
  dueDate?: string;
  returnedDate?: string;
  conditionBefore?: ItemCondition;
  conditionAfter?: ItemCondition;
  remarks?: string;
  recordedBy: string;
}

export interface AuditLog {
  id: string;
  user: string;
  employeeId: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'REQUEST'
    | 'APPROVE'
    | 'REJECT'
    | 'TRANSFER'
    | 'BORROW'
    | 'RETURN'
    | 'BACKUP'
    | 'RESTORE'
    | 'IMPORT';
  module: 'AUTH' | 'SPARE_PARTS' | 'TOOLS' | 'REQUESTS' | 'SYSTEM' | 'USERS' | 'LOCATION';
  recordId?: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // target user
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface DatabaseBackup {
  id: string;
  date: string;
  time: string;
  displayTime?: string;
  isoTimestamp?: string;
  sizeBytes: number;
  createdBy: string;
  status: 'SUCCESS' | 'FAILED';
  filename: string;
  description?: string;
  recordCounts: {
    users: number;
    items: number;
    requests: number;
    transactions: number;
    auditLogs: number;
  };
}

export interface SystemLocation {
  id: string;
  building: string;
  room: string;
  rack: string;
  shelf: string;
  carton: string;
  description?: string;
}

export interface SystemTeam {
  id: string;
  name: string;
  code: string;
  department: string;
  inChargeEmployeeId: string;
  inChargeName: string;
}
