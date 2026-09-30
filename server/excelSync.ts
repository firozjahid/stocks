import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsx from 'xlsx';
import { InventoryItem, User } from '../src/types/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EmployeeAssignment {
  id: string;
  name: string;
  designation: string;
  team: string;
  category: string;
}

// Official Officers responsible for their respective lab custody items
export const CONCERN_TO_EMPLOYEE: Record<string, EmployeeAssignment> = {
  // Electrical & Electronics (ET) Team (Col 7 / EEE racks)
  'yousuf & shakib': { id: '41412', name: 'Md. Yousuf Ali', designation: 'Senior Officer', team: 'R&I Electrical & Electronics (ET) Team', category: 'Electrical & Electronics (ET)' },
  'shakib & yousuf': { id: '41412', name: 'Md. Yousuf Ali', designation: 'Senior Officer', team: 'R&I Electrical & Electronics (ET) Team', category: 'Electrical & Electronics (ET)' },
  'shakib&yousuf': { id: '41412', name: 'Md. Yousuf Ali', designation: 'Senior Officer', team: 'R&I Electrical & Electronics (ET) Team', category: 'Electrical & Electronics (ET)' },
  'yousuf': { id: '41412', name: 'Md. Yousuf Ali', designation: 'Senior Officer', team: 'R&I Electrical & Electronics (ET) Team', category: 'Electrical & Electronics (ET)' },
  'shakib': { id: '67123', name: 'Md. Sameul Islam Shakib', designation: 'Senior Officer', team: 'R&I Electrical & Electronics (ET) Team', category: 'Electrical & Electronics (ET)' },
  'alamgir': { id: '41412', name: 'Md. Yousuf Ali', designation: 'Senior Officer', team: 'R&I Electrical & Electronics (ET) Team', category: 'Electrical & Electronics (ET)' },

  // Cooling & Refrigeration Team (Cols 9, 10 / CT racks)
  'jahid': { id: '38250', name: 'Md. Jahid Hasan', designation: 'Senior Officer', team: 'R&I Cooling Team', category: 'Cooling & Refrigeration' },
  'papon': { id: '19359', name: 'Papon Chandra Das', designation: 'Senior Principal Officer', team: 'R&I Cooling Team', category: 'Cooling & Refrigeration' },

  // Design Team (Cols 11, 12, 13, 14)
  'faruk': { id: '7669', name: 'Md. Faruk Hossain', designation: 'Junior Foreman', team: 'R&I Design Team', category: 'Design & Prototyping' },
  'juboraj': { id: '19348', name: 'Md. Jubaraj', designation: 'Assistant Principal Officer', team: 'R&I Design Team', category: 'Design & Prototyping' },
  'rubel': { id: '39939', name: 'Md. Rubel Alom', designation: 'Assistant Senior Officer', team: 'R&I Design Team', category: 'Design & Prototyping' },
  'mamun': { id: '4461', name: 'Md. Mamun', designation: 'Junior Technical Officer', team: 'R&I Design Team', category: 'Design & Prototyping' },
  'bakir': { id: '7669', name: 'Md. Faruk Hossain', designation: 'Junior Foreman', team: 'R&I Design Team', category: 'Design & Prototyping' },

  // Chemical & Materials Team (Col 15)
  'alik': { id: '58175', name: 'Mohammad Alik Pramanik', designation: 'Assistant Principal Officer', team: 'R&I Chemical & Materials Team', category: 'Chemical & Materials' },

  // Common Facility Team (Col 16)
  'robiul': { id: '42949', name: 'Rabiul Alam', designation: 'Assistant Principal Officer', team: 'R&I Common Facility Team', category: 'Common Facility & General' },
};

export function findExcelFilePath(): string | null {
  const possiblePaths = [
    path.resolve(process.cwd(), 'Spare Parts.xlsx'),
    path.resolve(__dirname, '../Spare Parts.xlsx'),
    path.resolve(__dirname, '../../Spare Parts.xlsx'),
    '/Spare Parts.xlsx',
    '/app/applet/Spare Parts.xlsx',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

export function importSparePartsFromExcel(): InventoryItem[] {
  const filePath = findExcelFilePath();
  if (!filePath) {
    console.warn('[ExcelSync] Spare Parts.xlsx file not found on filesystem.');
    return [];
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const wb = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = wb.SheetNames.includes('Spare-Parts')
      ? 'Spare-Parts'
      : wb.SheetNames.includes('Copy of AC R&I ALL Spare Parts')
      ? 'Copy of AC R&I ALL Spare Parts'
      : wb.SheetNames[0];

    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      console.warn(`[ExcelSync] Sheet ${sheetName} not found.`);
      return [];
    }

    const raw: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const items: InventoryItem[] = [];

    // Rows start from index 3 (data rows)
    for (let r = 3; r < raw.length; r++) {
      const row = raw[r];
      if (!row || !row[2]) continue;

      const itemName = String(row[2]).trim();
      if (!itemName || itemName.toLowerCase() === 'item name') continue;

      const sl = row[1] !== undefined ? String(row[1]).trim() : String(items.length + 1);
      const ton = row[3] !== undefined ? String(row[3]).trim() : '';
      const desc = row[4] !== undefined ? String(row[4]).trim() : '';
      const storedConcernRaw = row[6] ? String(row[6]).trim() : '';
      const concernKey = storedConcernRaw.toLowerCase();

      // Team stock quantities from specific columns:
      let etQty = parseInt(row[7] as string, 10) || 0;
      let coolingQty = parseInt(row[9] as string, 10) || 0;
      let designQty = parseInt(row[11] as string, 10) || 0;
      let chemQty = parseInt(row[15] as string, 10) || 0;
      let commonQty = parseInt(row[16] as string, 10) || 0;

      const rack = row[17] ? String(row[17]).trim() : 'Storage Rack';
      const shelf = row[18] !== undefined ? String(row[18]).trim() : 'Shelf 1';
      const carton = row[19] !== undefined ? String(row[19]).trim() : 'Bin 1';
      const storedType = row[20] ? String(row[20]).trim() : 'Carton Box';
      const givableStr = row[21] ? String(row[21]).trim() : 'Givable';
      const isGivable = !givableStr.toLowerCase().includes('not');
      const remarks = row[22] ? String(row[22]).trim() : '';

      const isEeeRack = rack.toUpperCase().includes('EEE');
      const isCtRack = rack.toUpperCase().includes('CT') || rack.toLowerCase().includes('almirah');
      const isElectricalName = itemName.toLowerCase().includes('motor') ||
                               itemName.toLowerCase().includes('pcb') ||
                               itemName.toLowerCase().includes('capacitor') ||
                               itemName.toLowerCase().includes('transformer') ||
                               itemName.toLowerCase().includes('reactor') ||
                               itemName.toLowerCase().includes('inverter') ||
                               itemName.toLowerCase().includes('sensor') ||
                               itemName.toLowerCase().includes('wire') ||
                               itemName.toLowerCase().includes('module') ||
                               itemName.toLowerCase().includes('display');

      // Exact owner and team determination:
      let assigned: EmployeeAssignment | undefined = CONCERN_TO_EMPLOYEE[concernKey];

      // If rack is EEE or stored by Yousuf/Shakib:
      if (isEeeRack || concernKey.includes('yousuf') || concernKey.includes('shakib')) {
        if (concernKey.includes('shakib') && !concernKey.includes('yousuf')) {
          assigned = CONCERN_TO_EMPLOYEE['shakib'];
        } else {
          assigned = CONCERN_TO_EMPLOYEE['yousuf'];
        }
      } else if (!assigned) {
        // Fallback by quantity or rack pattern or item name
        if (isElectricalName || etQty > 0 || isEeeRack) {
          assigned = CONCERN_TO_EMPLOYEE['yousuf'];
        } else if (coolingQty > 0 || isCtRack) {
          assigned = CONCERN_TO_EMPLOYEE['jahid'];
        } else if (designQty > 0) {
          assigned = CONCERN_TO_EMPLOYEE['faruk'];
        } else if (chemQty > 0) {
          assigned = CONCERN_TO_EMPLOYEE['alik'];
        } else if (commonQty > 0) {
          assigned = CONCERN_TO_EMPLOYEE['robiul'];
        } else {
          assigned = CONCERN_TO_EMPLOYEE['yousuf'];
        }
      }

      // Calculate Total Quantity accurately:
      const totalRaw = parseInt(row[5] as string, 10);
      const teamSum = etQty + coolingQty + designQty + chemQty + commonQty;
      let totalQty = !isNaN(totalRaw) && totalRaw > 0 ? totalRaw : teamSum;
      if (teamSum > totalQty) {
        totalQty = teamSum;
      }
      if (totalQty <= 0) {
        // Check if individual cell has numeric value (e.g. "4,5" or "3 coil")
        const cellText = String(row[7] || row[9] || row[10] || row[11] || row[15] || row[16] || '');
        const match = cellText.match(/\d+/);
        if (match) {
          totalQty = parseInt(match[0], 10);
        }
      }

      // Strictly assign 100% of quantity to the owning team ("jar jar row malamal tar tar user er proper sync")
      etQty = 0;
      coolingQty = 0;
      designQty = 0;
      chemQty = 0;
      commonQty = 0;

      if (assigned.team === 'R&I Electrical & Electronics (ET) Team') {
        etQty = totalQty;
      } else if (assigned.team === 'R&I Cooling Team') {
        coolingQty = totalQty;
      } else if (assigned.team === 'R&I Design Team') {
        designQty = totalQty;
      } else if (assigned.team === 'R&I Chemical & Materials Team') {
        chemQty = totalQty;
      } else if (assigned.team === 'R&I Common Facility Team') {
        commonQty = totalQty;
      }

      const itemCode = `SP-${String(items.length + 1).padStart(4, '0')}`;

      const item: InventoryItem = {
        id: `ITEM-SP-EXCEL-${items.length + 1}`,
        type: 'SPARE_PART',
        itemCode,
        itemName,
        tonCapacity: ton || undefined,
        description: desc || `${itemName} (${ton || 'Standard'}) - R.A.C R&I Store Center`,
        category: assigned.category,
        unit: 'Pcs',
        totalQuantity: totalQty,
        availableQuantity: totalQty,
        borrowedQuantity: 0,
        concern: storedConcernRaw || assigned.name,
        etTeamQuantity: etQty,
        coolingTeamQuantity: coolingQty,
        designTeamQuantity: designQty,
        chemicalTeamQuantity: chemQty,
        commonTeamQuantity: commonQty,
        responsiblePerson: assigned.name,
        responsibleEmployeeId: assigned.id,
        responsibleDesignation: assigned.designation,
        team: assigned.team,
        storageLocation: 'R.A.C R&I Store Center',
        rack,
        shelf,
        carton,
        storedType,
        transferable: true,
        givable: isGivable,
        exchangeable: true,
        condition: 'GOOD',
        conditionHistory: [
          {
            id: `CH-INIT-${items.length + 1}`,
            date: '2026-09-30',
            condition: 'GOOD',
            remarks: `Initial sync from Walton R&I Master Sheet (${storedConcernRaw || assigned.name})`,
            recordedBy: assigned.name,
            recordedByEmployeeId: assigned.id,
          }
        ],
        availability: totalQty > 0 ? (isGivable ? 'AVAILABLE' : 'RESERVED') : 'OUT OF STOCK',
        remarks: remarks || `Synchronized from Walton AC R&I Spare Parts Live Information`,
        isDeleted: false,
        createdBy: assigned.name,
        createdDate: '2026-09-30 08:00',
        updatedBy: assigned.name,
        updatedDate: '2026-09-30 08:00',
      };

      items.push(item);
    }

    console.log(`[ExcelSync] Successfully extracted ${items.length} live spare parts from ${filePath}.`);
    return items;
  } catch (err) {
    console.error('[ExcelSync] Error importing spare parts from excel:', err);
    return [];
  }
}
