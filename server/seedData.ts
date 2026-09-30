import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, InventoryItem, MovementTransaction, ItemRequest, AuditLog, SystemTeam, SystemLocation } from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const excelEmployeesPath = path.resolve(__dirname, 'excelEmployees.json');

export const INITIAL_TEAMS: SystemTeam[] = [
  { id: 'TEAM-EXEC', name: 'AC Executive Management & Board', code: 'EXEC', department: 'Walton AC R&I Dept', inChargeEmployeeId: '1007', inChargeName: 'Md. Tanvir Rahman' },
  { id: 'TEAM-COOL', name: 'R&I Cooling Team', code: 'COOL', department: 'Walton AC R&I Dept', inChargeEmployeeId: '19219', inChargeName: 'Ariful Islam' },
  { id: 'TEAM-ET', name: 'R&I Electrical & Electronics (ET) Team', code: 'ET', department: 'Walton AC R&I Dept', inChargeEmployeeId: '43924', inChargeName: 'Md. Shafiul Alam' },
  { id: 'TEAM-DSGN', name: 'R&I Design Team', code: 'DSGN', department: 'Walton AC R&I Dept', inChargeEmployeeId: '37091', inChargeName: 'Md. Moniruzzaman Khan' },
  { id: 'TEAM-CHEM', name: 'R&I Chemical & Materials Team', code: 'CHEM', department: 'Walton AC R&I Dept', inChargeEmployeeId: '69695', inChargeName: 'Md. Abdus Shakur' },
  { id: 'TEAM-COMM', name: 'R&I Common Facility Team', code: 'COMM', department: 'Walton AC R&I Dept', inChargeEmployeeId: '19359', inChargeName: 'Papon Chandra Das' },
  { id: 'TEAM-TEST', name: 'R&I Testing & Validation Team', code: 'TEST', department: 'Walton AC R&I Dept', inChargeEmployeeId: '41527', inChargeName: 'Rakib Abdullah Shimanta' },
  { id: 'TEAM-PROTO', name: 'R&I Prototype & Assembly Lab', code: 'PROTO', department: 'Walton AC R&I Dept', inChargeEmployeeId: '6810', inChargeName: 'Selim' },
];

export const INITIAL_LOCATIONS: SystemLocation[] = [
  { id: 'LOC-1', building: 'Building R&I-A', room: 'Refrigeration Lab 101', rack: 'Rack A-1', shelf: 'Shelf 01', carton: 'Bin 101', description: 'Compressors & Motors section' },
  { id: 'LOC-2', building: 'Building R&I-A', room: 'Refrigeration Lab 101', rack: 'Rack A-2', shelf: 'Shelf 02', carton: 'Bin 104', description: 'Valves & expansion devices' },
  { id: 'LOC-3', building: 'Building R&I-B', room: 'Electronics Clean Room 202', rack: 'Rack E-1 (ESD)', shelf: 'Shelf 01', carton: 'Carton E-05', description: 'Inverter IPMs & Microcontrollers' },
  { id: 'LOC-4', building: 'Building R&I-B', room: 'Design & Prototyping Lab', rack: 'Rack D-3', shelf: 'Shelf 04', carton: 'Carton D-12', description: 'Molds, sheet metal & 3D prototypes' },
  { id: 'LOC-5', building: 'Building R&I-A', room: 'Chemical Testing Lab', rack: 'Rack C-1', shelf: 'Shelf 01', carton: 'Carton C-02', description: 'Refrigerant oils & leak tracers' },
  { id: 'LOC-6', building: 'Central Tool Crib', room: 'Tool Room 105', rack: 'Tool Vault T-1', shelf: 'Shelf T-2', carton: 'Drawer 04', description: 'Precision electronic measuring tools' },
  { id: 'LOC-7', building: 'Central Tool Crib', room: 'Heavy Tool Bay', rack: 'Heavy Bay H-1', shelf: 'Floor Bay', carton: 'Station 01', description: 'Pumps, recovery machines & brazing gear' },
];

export const MASTER_SUPERADMIN_USER: User = {
  id: 'USR-SUPERADMIN-JHFBOSS',
  employeeId: 'jhfboss',
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
  lastLogin: '2026-09-30 00:00',
};

const rawExcelUsers: User[] = fs.existsSync(excelEmployeesPath)
  ? JSON.parse(fs.readFileSync(excelEmployeesPath, 'utf-8'))
  : [];

export const INITIAL_USERS: User[] = [
  MASTER_SUPERADMIN_USER,
  ...rawExcelUsers.filter(u => u.employeeId.toLowerCase() !== 'jhfboss')
];

// Cleared dummy data - system is completely clean and ready for real production inventory entry
export const INITIAL_ITEMS: InventoryItem[] = [];

export const INITIAL_REQUESTS: ItemRequest[] = [];

export const INITIAL_TRANSACTIONS: MovementTransaction[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
