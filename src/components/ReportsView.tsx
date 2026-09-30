import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Download,
  Printer,
  Filter,
  Layers,
  Box,
  Wrench,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building,
  User
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryItem, MovementTransaction, ItemRequest } from '../types/inventory.js';
import { api } from '../services/api.js';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('TEAM_INVENTORY');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<MovementTransaction[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [invRes, trnRes, reqRes] = await Promise.all([
          api.getInventory(),
          api.getTransactions(),
          api.getRequests('all')
        ]);
        setItems(invRes.items || []);
        setTransactions(trnRes.transactions || []);
        setRequests(reqRes.requests || []);
      } catch (e) {
        console.error('Error fetching report datasets:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allTeams = Array.from(new Set(items.map(i => i.team))).filter(Boolean);

  // Compute filtered table data based on report type
  let reportTitle = 'Team-wise Inventory Report';
  let tableHeaders: string[] = [];
  let tableRows: any[] = [];
  let exportData: any[] = [];

  const filteredItems = items.filter(i => {
    if (selectedTeam && i.team !== selectedTeam) return false;
    if (selectedCondition && i.condition !== selectedCondition) return false;
    return true;
  });

  if (reportType === 'TEAM_INVENTORY') {
    reportTitle = 'Team-wise Inventory Asset Report';
    tableHeaders = ['Item Code', 'Item Name', 'Type', 'Team', 'Owner', 'Total Qty', 'Available', 'Borrowed', 'Location', 'Condition'];
    tableRows = filteredItems.map(i => [
      i.itemCode,
      i.itemName,
      i.type === 'TOOL_EQUIPMENT' ? 'Tool' : 'Spare Part',
      i.team,
      i.responsiblePerson,
      `${i.totalQuantity} ${i.unit}`,
      i.availableQuantity,
      i.borrowedQuantity,
      `${i.storageLocation} (${i.rack}/${i.shelf})`,
      i.condition
    ]);
    exportData = filteredItems.map(i => ({
      'Item Code': i.itemCode,
      'Item Name': i.itemName,
      'Type': i.type,
      'Category': i.category,
      'Team': i.team,
      'Responsible Officer': i.responsiblePerson,
      'Employee ID': i.responsibleEmployeeId,
      'Total Quantity': i.totalQuantity,
      'Available Quantity': i.availableQuantity,
      'Borrowed Quantity': i.borrowedQuantity,
      'Unit': i.unit,
      'Location': i.storageLocation,
      'Rack': i.rack,
      'Shelf': i.shelf,
      'Bin': i.carton,
      'Condition': i.condition,
      'Givable': i.givable ? 'YES' : 'NO',
      'Transferable': i.transferable ? 'YES' : 'NO',
    }));
  } else if (reportType === 'BORROWED_ITEMS') {
    reportTitle = 'Active Borrowed & Inter-Team Loan Items Report';
    const borrowedItems = filteredItems.filter(i => (i.borrowedQuantity || 0) > 0);
    tableHeaders = ['Item Code', 'Item Name', 'Original Team & Owner', 'Current Holder & Team', 'Qty Borrowed', 'Condition', 'Location'];
    tableRows = borrowedItems.map(i => [
      i.itemCode,
      i.itemName,
      `${i.responsiblePerson} (${i.team})`,
      i.currentHolderPerson ? `${i.currentHolderPerson} (${i.currentHolderTeam})` : 'Inter-team loaned',
      `${i.borrowedQuantity} ${i.unit}`,
      i.condition,
      i.storageLocation
    ]);
    exportData = borrowedItems.map(i => ({
      'Item Code': i.itemCode,
      'Item Name': i.itemName,
      'Original Owner': i.responsiblePerson,
      'Original Team': i.team,
      'Current Holder': i.currentHolderPerson,
      'Current Holder Team': i.currentHolderTeam,
      'Borrowed Quantity': i.borrowedQuantity,
      'Condition': i.condition,
    }));
  } else if (reportType === 'OVERDUE') {
    reportTitle = 'Overdue Items Return Report';
    const today = new Date().toISOString().split('T')[0];
    const overdueTrns = transactions.filter(t => t.transactionType === 'BORROW' && !t.returnedDate && t.dueDate && t.dueDate < today);
    tableHeaders = ['Transaction ID', 'Item Code & Name', 'Owner', 'Borrower Team & Officer', 'Qty', 'Due Date', 'Days Overdue'];
    tableRows = overdueTrns.map(t => {
      const diffDays = Math.round((new Date(today).getTime() - new Date(t.dueDate!).getTime()) / (1000 * 3600 * 24));
      return [
        t.id,
        `${t.itemCode} - ${t.itemName}`,
        `${t.fromPerson} (${t.fromTeam})`,
        `${t.toPerson} (${t.toTeam})`,
        t.quantity,
        t.dueDate,
        `${diffDays} days past due`
      ];
    });
    exportData = overdueTrns.map(t => ({
      'Transaction ID': t.id,
      'Item Code': t.itemCode,
      'Item Name': t.itemName,
      'Owner': t.fromPerson,
      'Owner Team': t.fromTeam,
      'Borrower': t.toPerson,
      'Borrower Team': t.toTeam,
      'Quantity': t.quantity,
      'Due Date': t.dueDate,
    }));
  } else if (reportType === 'DAMAGED') {
    reportTitle = 'Damaged & Under Repair Equipment Report';
    const damagedItems = filteredItems.filter(i => i.condition === 'DAMAGED' || i.condition === 'UNDER REPAIR' || i.condition === 'OUT OF ORDER');
    tableHeaders = ['Item Code', 'Item Name', 'Category', 'Condition', 'Responsible Person', 'Team', 'Storage Rack', 'Remarks'];
    tableRows = damagedItems.map(i => [
      i.itemCode,
      i.itemName,
      i.category,
      i.condition,
      i.responsiblePerson,
      i.team,
      `${i.rack} - ${i.shelf}`,
      i.remarks || 'Inspection required'
    ]);
    exportData = damagedItems.map(i => ({
      'Item Code': i.itemCode,
      'Item Name': i.itemName,
      'Condition': i.condition,
      'Responsible Person': i.responsiblePerson,
      'Team': i.team,
      'Location': `${i.storageLocation} (${i.rack}/${i.shelf})`,
      'Remarks': i.remarks,
    }));
  } else if (reportType === 'TRANSFER_HISTORY') {
    reportTitle = 'Inter-Team Movement History Report';
    tableHeaders = ['Trn ID', 'Date', 'Type', 'Item Code & Name', 'From Officer', 'To Officer', 'Qty', 'Purpose'];
    tableRows = transactions.map(t => [
      t.id,
      t.date,
      t.transactionType,
      `${t.itemCode} - ${t.itemName}`,
      `${t.fromPerson} (${t.fromTeam})`,
      `${t.toPerson} (${t.toTeam})`,
      t.quantity,
      t.purpose
    ]);
    exportData = transactions.map(t => ({
      'Transaction ID': t.id,
      'Date': t.date,
      'Type': t.transactionType,
      'Item Code': t.itemCode,
      'Item Name': t.itemName,
      'From Person': t.fromPerson,
      'From Team': t.fromTeam,
      'To Person': t.toPerson,
      'To Team': t.toTeam,
      'Quantity': t.quantity,
      'Purpose': t.purpose,
      'Returned Date': t.returnedDate || 'N/A',
    }));
  }

  // Real Excel Export using xlsx (SheetJS)
  const handleExportExcel = () => {
    if (exportData.length === 0) {
      alert('No records available in current report filter to export.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Real CSV Export
  const handleExportCSV = () => {
    if (exportData.length === 0) {
      alert('No records available in current report filter to export.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 space-y-4 shrink-0 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Inventory &amp; Audit Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Comprehensive data export for management audits, accountability, and team allocations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print View</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Report Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'TEAM_INVENTORY', label: 'Team Inventory Report' },
            { id: 'BORROWED_ITEMS', label: 'Borrowed / Loaned Items' },
            { id: 'OVERDUE', label: 'Overdue Items' },
            { id: 'DAMAGED', label: 'Damaged & Repairs' },
            { id: 'TRANSFER_HISTORY', label: 'Transfer History' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                reportType === r.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">All Teams &amp; Labs</option>
            {allTeams.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedCondition}
            onChange={e => setSelectedCondition(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">All Conditions</option>
            <option value="NEW">NEW</option>
            <option value="EXCELLENT">EXCELLENT</option>
            <option value="GOOD">GOOD</option>
            <option value="USED">USED</option>
            <option value="DAMAGED">DAMAGED</option>
            <option value="UNDER REPAIR">UNDER REPAIR</option>
          </select>
        </div>
      </div>

      {/* Report Table Display */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">{reportTitle}</h2>
              <p className="text-[11px] text-slate-400">
                Generated: {new Date().toLocaleString()} • Total Records: {tableRows.length}
              </p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
              AC R&amp;I Internal Audit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="py-2.5 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={tableHeaders.length} className="text-center py-8 text-slate-400">
                      No records match the selected report criteria.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {row.map((cell: any, cIdx: number) => (
                        <td key={cIdx} className="py-2.5 px-3 text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
