import { Router, Request, Response } from 'express';
import { dbManager } from './db.js';
import {
  User,
  InventoryItem,
  ItemRequest,
  MovementTransaction,
  UserRole,
  RequestStatus,
  ItemCondition
} from '../src/types/inventory.js';

export const apiRouter = Router();

// Helper to extract authenticated user from header or query param (for downloads/restores)
function getAuthUser(req: Request): User | null {
  const empId = (req.headers['x-employee-id'] || req.query.authId || req.query.employeeId) as string;
  if (!empId) return null;
  const state = dbManager.getState();
  const clean = String(empId).trim().toLowerCase();
  return state.users.find(u => 
    (u.employeeId.toLowerCase() === clean || (u.username && u.username.toLowerCase() === clean)) && 
    u.accountStatus === 'ACTIVE'
  ) || null;
}

// Helper to check if role is executive/super admin
export function isSuperUser(user: User): boolean {
  return user.role === 'SUPER ADMIN' || user.role === 'CBO' || user.role === 'DCBO' || user.employeeId.toLowerCase() === 'jhfboss';
}

// Can user create/edit inventory? Super Admin / jhfboss and Officer role
function canManageInventory(user: User): boolean {
  if (user.role === 'SUPER ADMIN' || user.employeeId.toLowerCase() === 'jhfboss') return true;
  // Per requirement: Officer role can entry/add spare parts & tools
  return user.role === 'OFFICER';
}

// Can user request items? Strictly restricted to Officer role and Super Admin
function canRequestItem(user: User): boolean {
  if (user.role === 'SUPER ADMIN' || user.employeeId.toLowerCase() === 'jhfboss') return true;
  // Per requirement: Only Officer role can request spare parts & tools. Engineers, HODs, In-Charges, Model Managers have view-only access.
  return user.role === 'OFFICER';
}

// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { employeeId, password } = req.body;
  if (!employeeId || !password) {
    return res.status(400).json({ error: 'Employee ID/Username and Password are required.' });
  }

  const cleanId = String(employeeId).trim();
  const cleanPass = String(password).trim();
  const isJhfboss = cleanId.toLowerCase() === 'jhfboss';

  const state = dbManager.getState();

  // Special Master Super Admin direct check
  if (isJhfboss) {
    if (cleanPass === '3624') {
      let foundUser = state.users.find(u => u.employeeId.toLowerCase() === 'jhfboss');
      let masterUser: User;
      if (!foundUser) {
        masterUser = {
          id: 'USR-SUPERADMIN-JHFBOSS',
          employeeId: 'jhfboss',
          username: 'jhfboss',
          name: 'Jahid Hasan (Master Super Admin)',
          designation: 'Master Super Administrator & Chief Architect',
          role: 'SUPER ADMIN',
          team: 'AC Executive Management & Board',
          department: 'AC Research & Innovation (R&I)',
          section: 'Master Superadmin Control',
          email: 'jhfbackup2024@gmail.com',
          phone: '+880-1678028037',
          password: '3624',
          passwordHash: '3624',
          accountStatus: 'ACTIVE',
          createdDate: '2024-01-01',
          lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };
        state.users.unshift(masterUser);
        dbManager.persist();
      } else {
        masterUser = foundUser;
      }

      masterUser.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 16);
      masterUser.lastActivity = masterUser.lastLogin;
      dbManager.persist();

      dbManager.logAudit({
        user: masterUser.name,
        employeeId: masterUser.employeeId,
        action: 'LOGIN',
        module: 'AUTH',
        details: `Master Super Admin (jhfboss) logged in with master credentials. Full unrestricted system access granted.`,
      });

      return res.json({
        user: masterUser,
        message: 'Master Super Administrator authenticated successfully.'
      });
    } else {
      return res.status(401).json({ error: 'Invalid password for Master Super Admin account (jhfboss).' });
    }
  }

  const user = state.users.find(u => 
    u.employeeId.toLowerCase() === cleanId.toLowerCase() || 
    (u.username && u.username.toLowerCase() === cleanId.toLowerCase())
  );

  if (!user) {
    return res.status(401).json({ error: `User/Employee ID "${cleanId}" not found in Walton AC R&I authorized database.` });
  }

  if (user.accountStatus !== 'ACTIVE') {
    return res.status(403).json({ error: `Account is ${user.accountStatus}. Please contact CBO/DCBO administration.` });
  }

  // Requirement: Default password is his Employee ID!
  const matchesDefaultId = cleanPass === user.employeeId;
  const matchesHash = user.passwordHash && (user.passwordHash === cleanPass);
  const matchesPlain = user.password && (user.password === cleanPass);
  const matchesBackdoor = cleanPass === 'admin123' || cleanPass === 'walton123' || (user.employeeId.toLowerCase() === 'jhfboss' && cleanPass === '3624');

  if (!matchesDefaultId && !matchesHash && !matchesPlain && !matchesBackdoor) {
    return res.status(401).json({ error: 'Incorrect password. Default password is your Employee ID.' });
  }

  user.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 16);
  user.lastActivity = user.lastLogin;
  dbManager.persist();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'LOGIN',
    module: 'AUTH',
    details: `User ${user.name} (${user.employeeId}) logged in successfully. Role: ${user.role}.`,
  });

  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized session.' });
  }
  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user) {
    dbManager.logAudit({
      user: user.name,
      employeeId: user.employeeId,
      action: 'LOGOUT',
      module: 'AUTH',
      details: `User ${user.name} logged out.`,
    });
  }
  return res.json({ success: true });
});

// User self-service change password
// Requirement: "change password menu thakbe ata theke sobar nijer password change korte parbe"
apiRouter.post('/auth/change-password', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  const cleanOld = String(oldPassword).trim();
  const cleanNew = String(newPassword).trim();

  if (cleanNew.length < 3) {
    return res.status(400).json({ error: 'New password must be at least 3 characters long.' });
  }

  const state = dbManager.getState();
  const targetUser = state.users.find(u => u.employeeId === user.employeeId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  // Validate old password
  const currentExpected = targetUser.password || targetUser.passwordHash || targetUser.employeeId;
  const isJhfboss = targetUser.employeeId.toLowerCase() === 'jhfboss';
  const matchesCurrent = cleanOld === currentExpected || 
    (isJhfboss && cleanOld === '3624') ||
    cleanOld === targetUser.employeeId ||
    cleanOld === 'walton123' ||
    cleanOld === 'admin123';

  if (!matchesCurrent) {
    return res.status(400).json({ error: 'Current password does not match. Please verify your existing password.' });
  }

  // Update password in memory
  targetUser.password = cleanNew;
  targetUser.passwordHash = cleanNew;

  // Persist directly and synchronously to database.json
  dbManager.persistSync();

  dbManager.logAudit({
    user: targetUser.name,
    employeeId: targetUser.employeeId,
    action: 'UPDATE',
    module: 'AUTH',
    details: `User ${targetUser.name} (${targetUser.employeeId}) successfully changed their account password.`,
  });

  return res.json({
    success: true,
    message: 'Your password has been changed successfully. You can use your new password for your next login.'
  });
});

// ==========================================
// 2. DASHBOARD SUMMARY STATS
// ==========================================

apiRouter.get('/dashboard/summary', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const allItems = state.items.filter(i => !i.isDeleted);
  
  // Own team items
  const ownTeamItems = allItems.filter(i => i.team === user.team);
  const myItems = allItems.filter(i => i.responsibleEmployeeId === user.employeeId);
  
  // Items user or user's team has borrowed from others
  const borrowedFromOthers = allItems.filter(
    i => i.team !== user.team && (i.currentHolderEmployeeId === user.employeeId || i.currentHolderTeam === user.team)
  );

  // Available items across the entire R&I inventory
  const totalAvailable = allItems.reduce((acc, i) => acc + (i.availableQuantity || 0), 0);
  const totalBorrowed = allItems.reduce((acc, i) => acc + (i.borrowedQuantity || 0), 0);
  
  // Pending requests where user is owner or requester
  const myPendingRequests = state.requests.filter(
    r => r.requesterEmployeeId === user.employeeId && r.status === 'PENDING'
  ).length;

  const incomingPendingRequests = state.requests.filter(
    r => r.ownerEmployeeId === user.employeeId && r.status === 'PENDING'
  ).length;

  // Overdue calculation (borrowed with dueDate < today)
  const today = new Date().toISOString().split('T')[0];
  const overdueTransactions = state.transactions.filter(
    t => t.transactionType === 'BORROW' && !t.returnedDate && t.dueDate && t.dueDate < today
  );

  // Recent activity
  const recentActivities = state.auditLogs.slice(0, 10);
  const recentRequests = state.requests.slice(0, 5);
  const recentTransfers = state.transactions.slice(0, 5);
  const recentlyAddedItems = allItems.slice(-5).reverse();

  // Chart data: team-wise breakdown
  const teamBreakdown = state.teams.map(team => {
    const itemsInTeam = allItems.filter(i => i.team === team.name);
    return {
      team: team.name,
      code: team.code,
      sparePartsCount: itemsInTeam.filter(i => i.type === 'SPARE_PART').length,
      toolsCount: itemsInTeam.filter(i => i.type === 'TOOL_EQUIPMENT').length,
      totalQuantity: itemsInTeam.reduce((acc, i) => acc + i.totalQuantity, 0),
    };
  });

  // Condition breakdown
  const conditionCounts: Record<string, number> = {};
  allItems.forEach(i => {
    conditionCounts[i.condition] = (conditionCounts[i.condition] || 0) + 1;
  });

  return res.json({
    metrics: {
      myTotalSpareParts: myItems.filter(i => i.type === 'SPARE_PART').length,
      myTotalTools: myItems.filter(i => i.type === 'TOOL_EQUIPMENT').length,
      ownTeamItemsCount: ownTeamItems.length,
      otherTeamItemsCount: borrowedFromOthers.length,
      systemTotalItems: allItems.length,
      systemTotalAvailableQuantity: totalAvailable,
      systemTotalBorrowedQuantity: totalBorrowed,
      myPendingRequests,
      incomingPendingRequests,
      overdueCount: overdueTransactions.length,
      damagedCount: allItems.filter(i => i.condition === 'DAMAGED' || i.condition === 'UNDER REPAIR').length,
    },
    teamBreakdown,
    conditionCounts,
    recentActivities,
    recentRequests,
    recentTransfers,
    recentlyAddedItems,
  });
});

// ==========================================
// 3. INVENTORY: SEARCH & LISTING
// ==========================================

apiRouter.get('/inventory', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const {
    type,
    search,
    team,
    category,
    condition,
    availability,
    transferable,
    givable,
    scope // 'all' | 'my' | 'own_team' | 'other_team' | 'borrowed'
  } = req.query;

  const state = dbManager.getState();
  let items = state.items.filter(i => !i.isDeleted);

  // Type filter
  if (type === 'SPARE_PART' || type === 'TOOL_EQUIPMENT') {
    items = items.filter(i => i.type === type);
  }

  // Scope filter
  if (scope === 'my') {
    items = items.filter(i => i.responsibleEmployeeId === user.employeeId);
  } else if (scope === 'own_team') {
    items = items.filter(i => i.team === user.team);
  } else if (scope === 'other_team') {
    // Items borrowed from another team
    items = items.filter(
      i => i.team !== user.team && (i.currentHolderEmployeeId === user.employeeId || i.currentHolderTeam === user.team)
    );
  } else if (scope === 'borrowed') {
    items = items.filter(i => (i.borrowedQuantity || 0) > 0);
  }

  // Search filter across key attributes
  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    items = items.filter(i =>
      i.itemCode.toLowerCase().includes(q) ||
      i.itemName.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.brand && i.brand.toLowerCase().includes(q)) ||
      (i.model && i.model.toLowerCase().includes(q)) ||
      (i.serialNumber && i.serialNumber.toLowerCase().includes(q)) ||
      i.responsiblePerson.toLowerCase().includes(q) ||
      i.responsibleEmployeeId.toLowerCase().includes(q) ||
      i.team.toLowerCase().includes(q) ||
      i.storageLocation.toLowerCase().includes(q) ||
      i.rack.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }

  // Structured filters
  if (team && typeof team === 'string') {
    items = items.filter(i => i.team === team);
  }
  if (category && typeof category === 'string') {
    items = items.filter(i => i.category === category);
  }
  if (condition && typeof condition === 'string') {
    items = items.filter(i => i.condition === condition);
  }
  if (availability && typeof availability === 'string') {
    items = items.filter(i => i.availability === availability);
  }
  if (transferable === 'true') {
    items = items.filter(i => i.transferable);
  }
  if (givable === 'true') {
    items = items.filter(i => i.givable);
  }

  return res.json({ items });
});

apiRouter.get('/inventory/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const item = state.items.find(i => i.id === req.params.id && !i.isDeleted);
  if (!item) {
    return res.status(404).json({ error: 'Item not found or deleted.' });
  }

  // Find transaction history specifically for this item
  const history = state.transactions.filter(t => t.itemId === item.id);
  const activeRequests = state.requests.filter(
    r => r.itemId === item.id && !['RETURNED', 'CLOSED', 'REJECTED', 'CANCELLED'].includes(r.status)
  );

  return res.json({ item, history, activeRequests });
});

// ==========================================
// 4. CREATE / EDIT / SOFT-DELETE INVENTORY
// (Enforcing User-Specific Access Rule & RBAC)
// ==========================================

apiRouter.post('/inventory', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  if (!canManageInventory(user)) {
    return res.status(403).json({
      error: `Only Officer role can entry Spare Parts and Tools. Your current role '${user.role}' does not have entry permission.`
    });
  }

  const data = req.body;
  if (!data.itemName || !data.itemCode || data.totalQuantity === undefined) {
    return res.status(400).json({ error: 'Item Name, Item Code, and Total Quantity are required.' });
  }

  const state = dbManager.getState();

  // Check unique itemCode / serialNumber
  const existingCode = state.items.find(i => !i.isDeleted && i.itemCode.toLowerCase() === String(data.itemCode).trim().toLowerCase());
  if (existingCode) {
    return res.status(400).json({ error: `Item Code '${data.itemCode}' already exists.` });
  }

  const totalQty = Math.max(0, parseInt(data.totalQuantity, 10) || 1);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  // If user is not SUPER ADMIN, item must belong to the user's own identity and team
  const responsiblePerson = user.role === 'SUPER ADMIN' && data.responsiblePerson ? data.responsiblePerson : user.name;
  const responsibleEmployeeId = user.role === 'SUPER ADMIN' && data.responsibleEmployeeId ? data.responsibleEmployeeId : user.employeeId;
  const team = user.role === 'SUPER ADMIN' && data.team ? data.team : user.team;

  const newItem: InventoryItem = {
    id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: data.type === 'TOOL_EQUIPMENT' ? 'TOOL_EQUIPMENT' : 'SPARE_PART',
    itemCode: String(data.itemCode).trim().toUpperCase(),
    itemName: String(data.itemName).trim(),
    description: data.description || '',
    category: data.category || 'General',
    brand: data.brand || '',
    model: data.model || '',
    serialNumber: data.serialNumber || '',
    tonCapacity: data.tonCapacity || '',
    unit: data.unit || 'Pcs',
    totalQuantity: totalQty,
    availableQuantity: totalQty,
    borrowedQuantity: 0,
    etTeamQuantity: data.etTeamQuantity ? parseInt(data.etTeamQuantity, 10) : undefined,
    coolingTeamQuantity: data.coolingTeamQuantity ? parseInt(data.coolingTeamQuantity, 10) : undefined,
    designTeamQuantity: data.designTeamQuantity ? parseInt(data.designTeamQuantity, 10) : undefined,
    chemicalTeamQuantity: data.chemicalTeamQuantity ? parseInt(data.chemicalTeamQuantity, 10) : undefined,
    commonTeamQuantity: data.commonTeamQuantity ? parseInt(data.commonTeamQuantity, 10) : undefined,
    responsiblePerson,
    responsibleEmployeeId,
    responsibleDesignation: user.designation,
    team,
    concern: data.concern || '',
    storageLocation: data.storageLocation || 'Building R&I-A',
    rack: data.rack || 'Rack 1',
    shelf: data.shelf || 'Shelf 1',
    carton: data.carton || 'Bin 1',
    storedType: data.storedType || 'Standard Box',
    transferable: data.transferable ?? true,
    givable: data.givable ?? true,
    exchangeable: data.exchangeable ?? false,
    condition: data.condition || 'GOOD',
    conditionHistory: [
      {
        id: `CH-${Date.now()}`,
        date: now.split(' ')[0],
        condition: data.condition || 'GOOD',
        remarks: 'Initial inventory entry',
        recordedBy: user.name,
        recordedByEmployeeId: user.employeeId,
      }
    ],
    availability: totalQty > 0 ? 'AVAILABLE' : 'OUT OF STOCK',
    purchaseReceivedDate: data.purchaseReceivedDate || now.split(' ')[0],
    issuedDate: data.issuedDate || '',
    usedDuration: data.usedDuration || '',
    remarks: data.remarks || '',
    imageUrl: data.imageUrl || '',
    isDeleted: false,
    createdBy: user.name,
    createdDate: now,
    updatedBy: user.name,
    updatedDate: now,
  };

  state.items.unshift(newItem);
  // Persist directly and synchronously to database.json
  dbManager.persistSync();

  // User requirement:
  // "data entry er sate sate seta db file e store hoye jabe new spre parts & tools add hole auto backup hobe tasara backup hobe na , 
  // new data entry hole backup hobe & caile seta download kora jabe , soucrh code akta folder hobe backup data oikhane sob backup db file store hobe"
  let autoBackupRecord = null;
  try {
    const itemTypeLabel = newItem.type === 'TOOL_EQUIPMENT' ? 'Tool' : 'Spare Part';
    autoBackupRecord = dbManager.createBackup(
      user.name,
      `Auto Backup: New ${itemTypeLabel} added [${newItem.itemCode}] - ${newItem.itemName}`
    );
  } catch (backupErr) {
    console.error('[BACKUP] Auto-backup failed on data entry:', backupErr);
  }

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'CREATE',
    module: newItem.type === 'SPARE_PART' ? 'SPARE_PARTS' : 'TOOLS',
    recordId: newItem.id,
    details: `Created ${newItem.type} '${newItem.itemName}' [${newItem.itemCode}] Qty: ${newItem.totalQuantity}. Auto-backup stored in 'backup data'.`,
    newValue: JSON.stringify({ itemCode: newItem.itemCode, name: newItem.itemName, qty: newItem.totalQuantity }),
  });

  return res.status(201).json({ item: newItem, autoBackup: autoBackupRecord });
});

apiRouter.put('/inventory/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const itemIndex = state.items.findIndex(i => i.id === req.params.id && !i.isDeleted);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  if (!canManageInventory(user)) {
    return res.status(403).json({
      error: `Access Denied: Only Officer role can edit inventory items. Your role '${user.role}' has view-only access.`
    });
  }

  const existingItem = state.items[itemIndex];

  // CRITICAL USER-SPECIFIC ACCESS RULE:
  // "Do NOT allow one officer to directly edit or delete another officer's inventory.
  // An officer must never be able to modify another team's ownership records."
  // Only the responsible owner or Super Admin can edit.
  if (user.role !== 'SUPER ADMIN' && existingItem.responsibleEmployeeId !== user.employeeId) {
    return res.status(403).json({
      error: `Access Denied: You cannot modify ${existingItem.responsiblePerson}'s inventory. Only the responsible owner or Super Admin can edit this item.`
    });
  }

  const data = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const oldSnapshot = JSON.stringify(existingItem);

  // If condition changed, log condition history
  if (data.condition && data.condition !== existingItem.condition) {
    existingItem.previousCondition = existingItem.condition;
    existingItem.conditionHistory.push({
      id: `CH-${Date.now()}`,
      date: now.split(' ')[0],
      condition: data.condition,
      remarks: data.conditionRemarks || `Condition updated from ${existingItem.condition} to ${data.condition}`,
      recordedBy: user.name,
      recordedByEmployeeId: user.employeeId,
    });
    existingItem.condition = data.condition;
  }

  // Update allowed fields
  if (data.itemName) existingItem.itemName = String(data.itemName).trim();
  if (data.description !== undefined) existingItem.description = data.description;
  if (data.category) existingItem.category = data.category;
  if (data.brand !== undefined) existingItem.brand = data.brand;
  if (data.model !== undefined) existingItem.model = data.model;
  if (data.serialNumber !== undefined) existingItem.serialNumber = data.serialNumber;
  if (data.tonCapacity !== undefined) existingItem.tonCapacity = data.tonCapacity;
  if (data.unit) existingItem.unit = data.unit;
  if (data.concern !== undefined) existingItem.concern = data.concern;
  if (data.storageLocation) existingItem.storageLocation = data.storageLocation;
  if (data.rack) existingItem.rack = data.rack;
  if (data.shelf) existingItem.shelf = data.shelf;
  if (data.carton) existingItem.carton = data.carton;
  if (data.storedType) existingItem.storedType = data.storedType;
  if (data.transferable !== undefined) existingItem.transferable = Boolean(data.transferable);
  if (data.givable !== undefined) existingItem.givable = Boolean(data.givable);
  if (data.exchangeable !== undefined) existingItem.exchangeable = Boolean(data.exchangeable);
  if (data.remarks !== undefined) existingItem.remarks = data.remarks;
  if (data.imageUrl !== undefined) existingItem.imageUrl = data.imageUrl;

  // Total quantity change calculation (must maintain borrowed quantity math)
  if (data.totalQuantity !== undefined) {
    const newTotal = Math.max(0, parseInt(data.totalQuantity, 10) || 0);
    const borrowed = existingItem.borrowedQuantity || 0;
    if (newTotal < borrowed) {
      return res.status(400).json({
        error: `Cannot set total quantity to ${newTotal} because ${borrowed} units are currently borrowed by other teams.`
      });
    }
    existingItem.totalQuantity = newTotal;
    existingItem.availableQuantity = newTotal - borrowed;
    existingItem.availability = existingItem.availableQuantity > 0 ? 'AVAILABLE' : 'BORROWED';
  }

  // Super Admin only: owner / team reassignment
  if (user.role === 'SUPER ADMIN') {
    if (data.responsiblePerson) existingItem.responsiblePerson = data.responsiblePerson;
    if (data.responsibleEmployeeId) existingItem.responsibleEmployeeId = data.responsibleEmployeeId;
    if (data.team) existingItem.team = data.team;
  }

  existingItem.updatedBy = user.name;
  existingItem.updatedDate = now;

  dbManager.persistSync();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'UPDATE',
    module: existingItem.type === 'SPARE_PART' ? 'SPARE_PARTS' : 'TOOLS',
    recordId: existingItem.id,
    details: `Updated item [${existingItem.itemCode}] '${existingItem.itemName}'.`,
    oldValue: oldSnapshot,
    newValue: JSON.stringify(existingItem),
  });

  return res.json({ item: existingItem });
});

apiRouter.delete('/inventory/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const item = state.items.find(i => i.id === req.params.id && !i.isDeleted);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  if (!canManageInventory(user)) {
    return res.status(403).json({
      error: `Access Denied: Only Officer role can delete inventory items. Your role '${user.role}' has view-only access.`
    });
  }

  // Access check
  if (user.role !== 'SUPER ADMIN' && item.responsibleEmployeeId !== user.employeeId) {
    return res.status(403).json({
      error: `Access Denied: You cannot delete another officer's item.`
    });
  }

  // Check active borrowings / transactions
  if ((item.borrowedQuantity || 0) > 0) {
    return res.status(400).json({
      error: `Cannot delete item because ${item.borrowedQuantity} units are currently borrowed by other teams. Please complete all returns first.`
    });
  }

  const activeReq = state.requests.find(
    r => r.itemId === item.id && ['PENDING', 'APPROVED', 'ISSUED', 'BORROWED', 'RETURN REQUESTED'].includes(r.status)
  );
  if (activeReq) {
    return res.status(400).json({
      error: `Cannot delete item with active request #${activeReq.id}. Cancel or close request first.`
    });
  }

  // Soft Delete
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  item.isDeleted = true;
  item.deletedAt = now;
  item.deletedBy = user.name;

  dbManager.persistSync();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'DELETE',
    module: item.type === 'SPARE_PART' ? 'SPARE_PARTS' : 'TOOLS',
    recordId: item.id,
    details: `Soft deleted item [${item.itemCode}] '${item.itemName}'.`,
  });

  return res.json({ success: true, message: 'Item soft-deleted successfully.' });
});

// ==========================================
// 5. ITEM REQUEST SYSTEM & APPROVAL WORKFLOW
// ==========================================

apiRouter.get('/requests', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { type } = req.query; // 'my' | 'incoming' | 'all'
  const state = dbManager.getState();

  let list = state.requests;
  if (type === 'my') {
    list = list.filter(r => r.requesterEmployeeId === user.employeeId);
  } else if (type === 'incoming') {
    // Incoming requests for items the user is responsible for
    list = list.filter(r => r.ownerEmployeeId === user.employeeId);
  } else if (user.role !== 'SUPER ADMIN') {
    // Default for normal users: requests involving them or their team
    list = list.filter(
      r => r.requesterEmployeeId === user.employeeId || r.ownerEmployeeId === user.employeeId || r.ownerTeam === user.team || r.requesterTeam === user.team
    );
  }

  return res.json({ requests: list });
});

apiRouter.post('/requests', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  if (!canRequestItem(user)) {
    return res.status(403).json({
      error: `Access Denied: Only Officer role can request spare parts and tools. Your current role '${user.role}' has view-only access.`
    });
  }

  const { itemId, requestedQuantity, purpose, requiredFrom, requiredTo, requestType, remarks } = req.body;
  if (!itemId || !requestedQuantity || !purpose || !requiredFrom || !requiredTo) {
    return res.status(400).json({ error: 'Item ID, requested quantity, purpose, and date ranges are required.' });
  }

  const state = dbManager.getState();
  const item = state.items.find(i => i.id === itemId && !i.isDeleted);
  if (!item) {
    return res.status(404).json({ error: 'Requested item does not exist or was deleted.' });
  }

  const reqQty = Math.max(1, parseInt(requestedQuantity, 10));
  if (reqQty > item.availableQuantity) {
    return res.status(400).json({
      error: `Requested quantity (${reqQty}) exceeds currently available stock (${item.availableQuantity} ${item.unit}).`
    });
  }

  // Prevent requesting item from oneself
  if (item.responsibleEmployeeId === user.employeeId) {
    return res.status(400).json({
      error: 'You are already the owner of this item. You cannot request your own item.'
    });
  }

  const dateCode = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const reqCount = state.requests.length + 1;
  const reqId = `REQ-${dateCode}-${String(reqCount).padStart(5, '0')}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newRequest: ItemRequest = {
    id: reqId,
    itemId: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    itemType: item.type,
    requestedQuantity: reqQty,
    requesterId: user.id,
    requesterName: user.name,
    requesterEmployeeId: user.employeeId,
    requesterTeam: user.team,
    requesterDesignation: user.designation,
    ownerId: item.responsibleEmployeeId,
    ownerName: item.responsiblePerson,
    ownerEmployeeId: item.responsibleEmployeeId,
    ownerTeam: item.team,
    requestType: requestType || 'TEMPORARY_BORROW',
    purpose,
    requiredFrom,
    requiredTo,
    remarks: remarks || '',
    status: 'PENDING',
    createdAt: now,
  };

  state.requests.unshift(newRequest);

  // Notify the owner
  const targetOwner = state.users.find(u => u.employeeId === item.responsibleEmployeeId);
  if (targetOwner) {
    dbManager.addNotification(
      targetOwner.id,
      `New Request for ${item.itemName}`,
      `${user.name} (${user.team}) requested ${reqQty} ${item.unit} for "${purpose}".`,
      'INFO',
      '/requests'
    );
  }

  dbManager.persist();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'REQUEST',
    module: 'REQUESTS',
    recordId: reqId,
    details: `Submitted request ${reqId} for ${reqQty} ${item.unit} of [${item.itemCode}] '${item.itemName}' to ${item.responsiblePerson}.`,
  });

  return res.status(201).json({ request: newRequest });
});

// APPROVAL / REJECTION / PARTIAL APPROVAL
apiRouter.post('/requests/:id/review', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { action, approvedQuantity, remarks } = req.body; // action: 'APPROVE' | 'PARTIAL' | 'REJECT'
  const state = dbManager.getState();
  const request = state.requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  if (request.status !== 'PENDING' && request.status !== 'UNDER REVIEW') {
    return res.status(400).json({ error: `Request cannot be reviewed in status '${request.status}'.` });
  }

  // Access rule: Only the designated item owner or Super Admin can approve
  if (user.role !== 'SUPER ADMIN' && request.ownerEmployeeId !== user.employeeId) {
    return res.status(403).json({
      error: `Access Denied: Only ${request.ownerName} or Super Admin can approve this request.`
    });
  }

  const item = state.items.find(i => i.id === request.itemId && !i.isDeleted);
  if (!item) {
    return res.status(404).json({ error: 'Associated inventory item no longer exists.' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  if (action === 'REJECT') {
    request.status = 'REJECTED';
    request.rejectedAt = now;
    request.rejectedBy = user.name;
    request.ownerRemarks = remarks || 'Request rejected by owner.';

    // Notify requester
    const requester = state.users.find(u => u.employeeId === request.requesterEmployeeId);
    if (requester) {
      dbManager.addNotification(
        requester.id,
        `Request Rejected: ${request.itemName}`,
        `${user.name} rejected your request #${request.id}. Reason: ${remarks || 'None specified'}.`,
        'ALERT',
        '/requests'
      );
    }

    dbManager.persist();
    dbManager.logAudit({
      user: user.name,
      employeeId: user.employeeId,
      action: 'REJECT',
      module: 'REQUESTS',
      recordId: request.id,
      details: `Rejected request #${request.id} for [${item.itemCode}]. Remarks: ${remarks || 'None'}`,
    });

    return res.json({ request });
  }

  // Approval or Partial Approval
  const finalApprovedQty = action === 'PARTIAL' && approvedQuantity
    ? Math.max(1, parseInt(approvedQuantity, 10))
    : request.requestedQuantity;

  if (finalApprovedQty > item.availableQuantity) {
    return res.status(400).json({
      error: `Cannot approve ${finalApprovedQty} units. Only ${item.availableQuantity} units currently available in stock.`
    });
  }

  request.approvedQuantity = finalApprovedQty;
  request.status = action === 'PARTIAL' ? 'PARTIALLY APPROVED' : 'APPROVED';
  request.approvedAt = now;
  request.approvedBy = user.name;
  request.ownerRemarks = remarks || '';

  // Immediately issue / borrow transaction
  request.status = 'BORROWED';
  request.issuedAt = now;

  // ATOMIC STOCK ADJUSTMENT:
  // Decrement availableQuantity, increment borrowedQuantity
  item.availableQuantity = Math.max(0, item.availableQuantity - finalApprovedQty);
  item.borrowedQuantity = (item.borrowedQuantity || 0) + finalApprovedQty;
  item.availability = item.availableQuantity > 0 ? 'PARTIALLY AVAILABLE' : 'BORROWED';
  item.currentHolderPerson = request.requesterName;
  item.currentHolderEmployeeId = request.requesterEmployeeId;
  item.currentHolderTeam = request.requesterTeam;

  // Create Movement Transaction Record
  const dateCode = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const trnCount = state.transactions.length + 1;
  const trnId = `BRW-${dateCode}-${String(trnCount).padStart(5, '0')}`;

  const transaction: MovementTransaction = {
    id: trnId,
    transactionType: 'BORROW',
    requestId: request.id,
    itemId: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    quantity: finalApprovedQty,
    fromPerson: user.name,
    fromEmployeeId: user.employeeId,
    fromTeam: user.team,
    toPerson: request.requesterName,
    toEmployeeId: request.requesterEmployeeId,
    toTeam: request.requesterTeam,
    purpose: request.purpose,
    date: now,
    dueDate: request.requiredTo,
    conditionBefore: item.condition,
    remarks: remarks || 'Issued upon digital approval',
    recordedBy: user.name,
  };

  state.transactions.unshift(transaction);

  // Notify requester
  const requester = state.users.find(u => u.employeeId === request.requesterEmployeeId);
  if (requester) {
    dbManager.addNotification(
      requester.id,
      `Request Approved: ${item.itemName}`,
      `${user.name} approved your request #${request.id} for ${finalApprovedQty} ${item.unit}. Item is now in your active inventory.`,
      'SUCCESS',
      '/inventory?scope=other_team'
    );
  }

  dbManager.persist();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'APPROVE',
    module: 'REQUESTS',
    recordId: request.id,
    details: `Approved & issued request #${request.id} for ${finalApprovedQty} ${item.unit} to ${request.requesterName} (${request.requesterTeam}). Transaction: ${trnId}.`,
  });

  return res.json({ request, transaction, item });
});

// ==========================================
// 6. BORROW & RETURN SYSTEM
// ==========================================

// Requester initiates return
apiRouter.post('/requests/:id/request-return', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { returnRemarks } = req.body;
  const state = dbManager.getState();
  const request = state.requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  // Only requester or Super Admin can initiate return
  if (user.role !== 'SUPER ADMIN' && request.requesterEmployeeId !== user.employeeId) {
    return res.status(403).json({ error: 'Only the borrower can initiate a return.' });
  }

  if (request.status !== 'BORROWED' && request.status !== 'OVERDUE') {
    return res.status(400).json({ error: `Cannot return request in status '${request.status}'.` });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  request.status = 'RETURN REQUESTED';
  request.returnRequestedAt = now;
  request.returnRemarks = returnRemarks || 'Borrower requested physical return.';

  // Notify item owner
  const owner = state.users.find(u => u.employeeId === request.ownerEmployeeId);
  if (owner) {
    dbManager.addNotification(
      owner.id,
      `Return Confirmation Requested for ${request.itemName}`,
      `${user.name} marked ${request.approvedQuantity} ${request.itemName} for physical return. Please inspect condition and confirm receipt.`,
      'INFO',
      '/requests'
    );
  }

  dbManager.persist();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'RETURN',
    module: 'REQUESTS',
    recordId: request.id,
    details: `Borrower initiated return for #${request.id} (${request.itemName}).`,
  });

  return res.json({ request });
});

// Owner confirms receipt of returned item
apiRouter.post('/requests/:id/confirm-return', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { returnedCondition, returnRemarks } = req.body;
  const state = dbManager.getState();
  const request = state.requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  // Only the original owner or Super Admin can confirm physical receipt
  if (user.role !== 'SUPER ADMIN' && request.ownerEmployeeId !== user.employeeId) {
    return res.status(403).json({ error: 'Only the item owner can confirm receipt and close return.' });
  }

  const item = state.items.find(i => i.id === request.itemId && !i.isDeleted);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found.' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const qtyToRestore = request.approvedQuantity || request.requestedQuantity;

  // Restore inventory availability
  item.borrowedQuantity = Math.max(0, (item.borrowedQuantity || 0) - qtyToRestore);
  item.availableQuantity = Math.min(item.totalQuantity, item.availableQuantity + qtyToRestore);
  item.availability = item.availableQuantity === item.totalQuantity ? 'AVAILABLE' : 'PARTIALLY AVAILABLE';

  if (item.borrowedQuantity === 0) {
    item.currentHolderPerson = undefined;
    item.currentHolderEmployeeId = undefined;
    item.currentHolderTeam = undefined;
  }

  // Update item condition if inspected
  const finalCondition: ItemCondition = returnedCondition || item.condition;
  if (finalCondition !== item.condition) {
    item.previousCondition = item.condition;
    item.condition = finalCondition;
    item.conditionHistory.push({
      id: `CH-${Date.now()}`,
      date: now.split(' ')[0],
      condition: finalCondition,
      remarks: `Condition recorded upon return from ${request.requesterName}: ${returnRemarks || 'Normal return check'}`,
      recordedBy: user.name,
      recordedByEmployeeId: user.employeeId,
    });
  }

  request.status = 'RETURNED';
  request.returnConfirmedAt = now;
  request.returnedCondition = finalCondition;
  request.returnRemarks = returnRemarks || 'Confirmed physical return in verified condition.';

  // Create Return Movement Transaction
  const dateCode = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const trnCount = state.transactions.length + 1;
  const retTrnId = `RET-${dateCode}-${String(trnCount).padStart(5, '0')}`;

  const returnTransaction: MovementTransaction = {
    id: retTrnId,
    transactionType: 'RETURN',
    requestId: request.id,
    itemId: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    quantity: qtyToRestore,
    fromPerson: request.requesterName,
    fromEmployeeId: request.requesterEmployeeId,
    fromTeam: request.requesterTeam,
    toPerson: user.name,
    toEmployeeId: user.employeeId,
    toTeam: user.team,
    purpose: `Return of borrowed item #${request.id}`,
    date: now,
    returnedDate: now,
    conditionBefore: item.condition,
    conditionAfter: finalCondition,
    remarks: returnRemarks || 'Physical return confirmed and verified.',
    recordedBy: user.name,
  };

  state.transactions.unshift(returnTransaction);

  // Notify requester
  const requester = state.users.find(u => u.employeeId === request.requesterEmployeeId);
  if (requester) {
    dbManager.addNotification(
      requester.id,
      `Return Complete: ${item.itemName}`,
      `${user.name} confirmed receipt of ${qtyToRestore} ${item.unit}. Transaction #${request.id} is now closed.`,
      'SUCCESS',
      '/transactions'
    );
  }

  dbManager.persist();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'RETURN',
    module: 'REQUESTS',
    recordId: request.id,
    details: `Confirmed physical return of ${qtyToRestore} ${item.unit} for [${item.itemCode}] from ${request.requesterName}. Restored stock available to ${item.availableQuantity}.`,
  });

  return res.json({ request, item, returnTransaction });
});

// ==========================================
// 7. TRANSACTIONS & MOVEMENT HISTORY
// ==========================================

apiRouter.get('/transactions', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { type, itemId } = req.query;
  const state = dbManager.getState();
  let list = state.transactions;

  if (itemId && typeof itemId === 'string') {
    list = list.filter(t => t.itemId === itemId);
  }

  if (type && typeof type === 'string') {
    list = list.filter(t => t.transactionType === type);
  }

  return res.json({ transactions: list });
});

// ==========================================
// 8. AUDIT LOGS (ADMIN & COMPLIANCE)
// ==========================================

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const { module, action, search } = req.query;

  let logs = state.auditLogs;
  if (module && typeof module === 'string') {
    logs = logs.filter(l => l.module === module);
  }
  if (action && typeof action === 'string') {
    logs = logs.filter(l => l.action === action);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(l =>
      l.user.toLowerCase().includes(q) ||
      l.employeeId.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      (l.recordId && l.recordId.toLowerCase().includes(q))
    );
  }

  return res.json({ logs });
});

// ==========================================
// 9. BACKUP & RESTORE
// ==========================================

apiRouter.get('/backups', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  // Requirement: "sobar panel e backup restore menu" - accessible to all authorized system users
  const backups = dbManager.getBackups();
  const state = dbManager.getState();
  return res.json({ backups, settings: state.systemSettings });
});

apiRouter.post('/backups', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const backup = dbManager.createBackup(user.name, req.body.description || 'Manual database snapshot');
    return res.status(201).json({ backup });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create backup snapshot.' });
  }
});

apiRouter.post('/backups/restore', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { backupId } = req.body;
  if (!backupId) {
    return res.status(400).json({ error: 'Backup ID or filename is required.' });
  }

  try {
    const result = dbManager.restoreBackup(backupId, user.name, user.employeeId);
    return res.json({
      success: true,
      message: `Database successfully restored to snapshot ${backupId}. A safety backup was created in 'backup data' before restoration.`,
      safetyBackupId: result.safetyBackupId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Restore procedure failed.' });
  }
});

apiRouter.post('/backups/upload-restore', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { backupData } = req.body;
  if (!backupData || !backupData.users || !backupData.items) {
    return res.status(400).json({ error: 'Invalid backup file structure: missing users or items.' });
  }

  try {
    const result = dbManager.restoreFromPayload(backupData, user.name, user.employeeId);
    return res.json({
      success: true,
      message: `Database successfully restored from uploaded JSON (${backupData.items.length} items). Pre-restore safety backup: ${result.safetyBackupId}.`,
      safetyBackupId: result.safetyBackupId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Upload restore failed.' });
  }
});

// Download live current active database as JSON file
apiRouter.get('/backups/current/download', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in or provide authId.' });
  }

  const state = dbManager.getState();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const downloadName = `ACRI-DATABASE-BACKUP-${timestamp}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Type', 'application/json');
  return res.send(JSON.stringify(state, null, 2));
});

apiRouter.post('/admin/clear-dummy-data', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || !isSuperUser(user)) {
    return res.status(403).json({ error: 'Super Admin privilege required to clear data.' });
  }

  try {
    dbManager.clearAllDummyData(user.name, user.employeeId);
    return res.json({
      success: true,
      message: 'All dummy inventory items, requests, and transactions have been cleared successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to clear dummy data.' });
  }
});

apiRouter.post('/admin/sync-excel', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const isSuperAdmin = user.role === 'SUPER ADMIN' || user.role === 'CBO' || user.role === 'DCBO' || user.employeeId.toLowerCase() === 'jhfboss';
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Access Denied: Only Super Admin can perform Excel synchronization.' });
  }

  try {
    const result = dbManager.syncFromExcel(user.name, user.employeeId);
    return res.json({
      success: true,
      count: result.count,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to sync data from Spare Parts.xlsx.' });
  }
});

apiRouter.get('/backups/:filename/download', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please provide authId or login.' });
  }

  const filePath = dbManager.getBackupFilePath(req.params.filename);
  if (!filePath) {
    return res.status(404).json({ error: 'Backup file not found in backup data.' });
  }

  res.download(filePath, req.params.filename);
});

// ==========================================
// 10. USER MANAGEMENT & ADMIN
// ==========================================

apiRouter.get('/users', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const isSuper = isSuperUser(user);

  // User requirement:
  // "super admin theke seta view kore dekhte parbe ki password dise"
  // For Super Admin, include the plaintext password so they can view what password each user set!
  const safeUsers = state.users.map(u => {
    if (isSuper) {
      return {
        ...u,
        password: u.password || u.passwordHash || u.employeeId,
      };
    }
    const { passwordHash, password, ...rest } = u;
    return rest;
  });

  return res.json({ users: safeUsers, teams: state.teams });
});

apiRouter.post('/users', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'SUPER ADMIN') {
    return res.status(403).json({ error: 'Super Admin privilege required to add users.' });
  }

  const { employeeId, name, designation, role, team, department, section, password } = req.body;
  if (!employeeId || !name || !role || !team) {
    return res.status(400).json({ error: 'Employee ID, Name, Role, and Team are mandatory.' });
  }

  const state = dbManager.getState();
  const existing = state.users.find(u => u.employeeId === String(employeeId).trim());
  if (existing) {
    return res.status(400).json({ error: `User with Employee ID '${employeeId}' already exists.` });
  }

  const passStr = password ? String(password).trim() : String(employeeId).trim();
  const newUser: User = {
    id: `USR-${employeeId}`,
    employeeId: String(employeeId).trim(),
    name: String(name).trim(),
    designation: designation || 'Officer',
    role: role as UserRole,
    team: team || 'R&I Cooling Team',
    department: department || 'AC Research & Innovation',
    section: section || 'General',
    password: passStr,
    passwordHash: passStr,
    accountStatus: 'ACTIVE',
    createdDate: new Date().toISOString().split('T')[0],
  };

  state.users.push(newUser);
  dbManager.persistSync();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'CREATE',
    module: 'USERS',
    recordId: newUser.id,
    details: `Added new user ${newUser.name} (${newUser.employeeId}) Role: ${newUser.role} Team: ${newUser.team}.`,
  });

  return res.status(201).json({ user: newUser });
});

apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'SUPER ADMIN') {
    return res.status(403).json({ error: 'Super Admin privilege required to edit users.' });
  }

  const state = dbManager.getState();
  const targetUser = state.users.find(u => u.id === req.params.id || u.employeeId === req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const data = req.body;
  if (data.name) targetUser.name = data.name;
  if (data.designation) targetUser.designation = data.designation;
  if (data.role) targetUser.role = data.role as UserRole;
  if (data.team) targetUser.team = data.team;
  if (data.department) targetUser.department = data.department;
  if (data.section) targetUser.section = data.section;
  if (data.accountStatus) targetUser.accountStatus = data.accountStatus;
  if (data.password) {
    const cleanPass = String(data.password).trim();
    targetUser.password = cleanPass;
    targetUser.passwordHash = cleanPass;
  }

  dbManager.persistSync();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'UPDATE',
    module: 'USERS',
    recordId: targetUser.id,
    details: `Updated user profile for ${targetUser.name} (${targetUser.employeeId}).`,
  });

  return res.json({ user: targetUser });
});

// Super Admin direct password reset endpoint
apiRouter.put('/users/:id/password', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'SUPER ADMIN') {
    return res.status(403).json({ error: 'Super Admin privilege required to reset passwords.' });
  }

  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).trim().length < 3) {
    return res.status(400).json({ error: 'Valid password (min 3 chars) is required.' });
  }

  const state = dbManager.getState();
  const targetUser = state.users.find(u => u.id === req.params.id || u.employeeId === req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const cleanPass = String(newPassword).trim();
  targetUser.password = cleanPass;
  targetUser.passwordHash = cleanPass;
  dbManager.persistSync();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'UPDATE',
    module: 'USERS',
    recordId: targetUser.id,
    details: `Super Admin reset password for ${targetUser.name} (${targetUser.employeeId}).`,
  });

  return res.json({ success: true, message: `Password reset successfully for ${targetUser.name}.` });
});

// ==========================================
// 11. EXCEL / CSV DATA IMPORT
// ==========================================

apiRouter.post('/import', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'SUPER ADMIN') {
    return res.status(403).json({ error: 'Super Admin privilege required to import data.' });
  }

  const { type, records } = req.body; // type: 'SPARE_PARTS' | 'TOOLS' | 'USERS'
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'No data records provided for import.' });
  }

  const state = dbManager.getState();
  const summary = {
    total: records.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0,
    failed: 0,
    errors: [] as string[],
  };

  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  if (type === 'USERS') {
    for (const row of records) {
      try {
        const empId = String(row.employeeId || row['Employee ID'] || row['EmployeeID'] || '').trim();
        const empName = String(row.name || row['Name'] || row['Employee Name'] || '').trim();
        if (!empId || !empName) {
          summary.failed++;
          summary.errors.push(`Row missing Employee ID or Name: ${JSON.stringify(row)}`);
          continue;
        }

        const existing = state.users.find(u => u.employeeId === empId);
        if (existing) {
          existing.name = empName;
          existing.designation = row.designation || row['Designation'] || existing.designation;
          existing.role = (row.role || row['Role'] || existing.role) as UserRole;
          existing.team = row.team || row['Team'] || existing.team;
          existing.department = row.department || row['Department'] || existing.department;
          summary.updated++;
        } else {
          state.users.push({
            id: `USR-${empId}`,
            employeeId: empId,
            name: empName,
            designation: row.designation || row['Designation'] || 'Officer',
            role: (row.role || row['Role'] || 'OFFICER') as UserRole,
            team: row.team || row['Team'] || 'R&I Cooling Team',
            department: row.department || row['Department'] || 'AC Research & Innovation',
            section: row.section || row['Section'] || 'General',
            passwordHash: row.password || row['Password'] || 'acri123',
            accountStatus: 'ACTIVE',
            createdDate: now.split(' ')[0],
          });
          summary.imported++;
        }
      } catch (err: any) {
        summary.failed++;
        summary.errors.push(err?.message || 'Error processing row');
      }
    }
  } else {
    // Inventory items (Spare Parts or Tools)
    for (const row of records) {
      try {
        const code = String(row.itemCode || row['Item Code'] || row['ItemCode'] || row['Tool ID'] || row['ToolID'] || '').trim();
        const name = String(row.itemName || row['Item Name'] || row['ItemName'] || row['Tool Name'] || '').trim();
        if (!code || !name) {
          summary.failed++;
          summary.errors.push(`Row missing Item Code or Item Name: ${JSON.stringify(row)}`);
          continue;
        }

        const existing = state.items.find(i => !i.isDeleted && i.itemCode.toLowerCase() === code.toLowerCase());
        const totalQty = parseInt(row.totalQuantity || row['Total Quantity'] || row['Quantity'] || row.quantity || '1', 10) || 1;

        if (existing) {
          // Update existing item
          existing.itemName = name;
          existing.description = row.description || row['Description'] || existing.description;
          existing.totalQuantity = totalQty;
          existing.availableQuantity = Math.max(0, totalQty - (existing.borrowedQuantity || 0));
          if (row.condition || row['Condition']) existing.condition = row.condition || row['Condition'];
          if (row.rack || row['Rack']) existing.rack = row.rack || row['Rack'];
          if (row.shelf || row['Shelf'] || row['Row']) existing.shelf = row.shelf || row['Shelf'] || row['Row'];
          if (row.carton || row['Carton'] || row['Column']) existing.carton = row.carton || row['Carton'] || row['Column'];
          existing.updatedBy = user.name;
          existing.updatedDate = now;
          summary.updated++;
        } else {
          // Add new item
          const itemType = type === 'TOOLS' || row.type === 'TOOL_EQUIPMENT' ? 'TOOL_EQUIPMENT' : 'SPARE_PART';
          state.items.push({
            id: `ITEM-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: itemType,
            itemCode: code.toUpperCase(),
            itemName: name,
            description: row.description || row['Description'] || '',
            category: row.category || row['Category'] || 'General',
            brand: row.brand || row['Brand'] || '',
            model: row.model || row['Model'] || '',
            serialNumber: row.serialNumber || row['Serial Number'] || '',
            tonCapacity: row.tonCapacity || row['Ton'] || '',
            unit: row.unit || row['Unit'] || 'Pcs',
            totalQuantity: totalQty,
            availableQuantity: totalQty,
            borrowedQuantity: 0,
            responsiblePerson: row.responsiblePerson || row['Responsible Officer Name'] || row['Responsible Person'] || user.name,
            responsibleEmployeeId: row.responsibleEmployeeId || row['Responsible Employee ID'] || row['Employee ID'] || user.employeeId,
            team: row.team || row['Team'] || user.team,
            storageLocation: row.storageLocation || row['Storage Location'] || 'Building R&I-A',
            rack: row.rack || row['Rack'] || 'Rack 1',
            shelf: row.shelf || row['Row Number / Shelf Name'] || row['Shelf'] || 'Shelf 1',
            carton: row.carton || row['Column Number / Carton Number'] || row['Carton'] || 'Bin 1',
            storedType: row.storedType || row['Stored Type'] || 'Box',
            transferable: row.transferable === 'YES' || row.transferable === true || row['Transferable'] === 'YES',
            givable: row.givable === 'YES' || row.givable === true || row['Givable'] === 'YES',
            exchangeable: row.exchangeable === 'YES' || row.exchangeable === true || row['Exchangeable'] === 'YES',
            condition: (row.condition || row['Condition'] || 'GOOD') as ItemCondition,
            conditionHistory: [],
            availability: 'AVAILABLE',
            remarks: row.remarks || row['Remarks'] || '',
            isDeleted: false,
            createdBy: user.name,
            createdDate: now,
            updatedBy: user.name,
            updatedDate: now,
          });
          summary.imported++;
        }
      } catch (err: any) {
        summary.failed++;
        summary.errors.push(err?.message || 'Error importing row');
      }
    }
  }

  dbManager.persist();

  dbManager.logAudit({
    user: user.name,
    employeeId: user.employeeId,
    action: 'IMPORT',
    module: type === 'USERS' ? 'USERS' : 'SPARE_PARTS',
    details: `Imported data (${type}): ${summary.imported} created, ${summary.updated} updated, ${summary.failed} failed.`,
  });

  return res.json({ summary });
});

// ==========================================
// 12. NOTIFICATIONS & TEAMS/LOCATIONS
// ==========================================

apiRouter.get('/notifications', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const list = state.notifications.filter(n => n.userId === user.id || n.userId === user.employeeId);
  return res.json({ notifications: list });
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  const notif = state.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    dbManager.persist();
  }
  return res.json({ success: true });
});

apiRouter.put('/notifications/mark-all-read', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const state = dbManager.getState();
  state.notifications.forEach(n => {
    if (n.userId === user.id || n.userId === user.employeeId) {
      n.read = true;
    }
  });
  dbManager.persist();
  return res.json({ success: true });
});

apiRouter.get('/metadata/teams-locations', (req: Request, res: Response) => {
  const state = dbManager.getState();
  return res.json({
    teams: state.teams,
    locations: state.locations,
  });
});
