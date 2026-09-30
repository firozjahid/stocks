import React, { useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Box,
  Wrench,
  Save,
  AlertCircle
} from 'lucide-react';
import { InventoryItem, ItemCondition } from '../types/inventory.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface ItemFormModalProps {
  initialType?: 'SPARE_PART' | 'TOOL_EQUIPMENT';
  editItem?: InventoryItem | null;
  onClose: () => void;
  onSaved: (backupInfo?: any) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  initialType = 'SPARE_PART',
  editItem,
  onClose,
  onSaved,
}) => {
  const { user, isSuperAdmin, canManageInventory } = useAuth();
  const isEditing = !!editItem;

  const [type, setType] = useState<'SPARE_PART' | 'TOOL_EQUIPMENT'>(
    editItem ? editItem.type : initialType
  );
  const [itemCode, setItemCode] = useState(editItem?.itemCode || '');
  const [itemName, setItemName] = useState(editItem?.itemName || '');
  const [description, setDescription] = useState(editItem?.description || '');
  const [category, setCategory] = useState(editItem?.category || (type === 'TOOL_EQUIPMENT' ? 'Measurement' : 'Compressors'));
  const [brand, setBrand] = useState(editItem?.brand || '');
  const [model, setModel] = useState(editItem?.model || '');
  const [serialNumber, setSerialNumber] = useState(editItem?.serialNumber || '');
  const [tonCapacity, setTonCapacity] = useState(editItem?.tonCapacity || '1.5 Ton');
  const [unit, setUnit] = useState(editItem?.unit || 'Pcs');
  const [totalQuantity, setTotalQuantity] = useState(editItem ? String(editItem.totalQuantity) : '1');
  const [concern, setConcern] = useState(editItem?.concern || '');
  
  // Storage Location
  const [storageLocation, setStorageLocation] = useState(editItem?.storageLocation || 'Building R&I-A');
  const [rack, setRack] = useState(editItem?.rack || 'Rack A-1');
  const [shelf, setShelf] = useState(editItem?.shelf || 'Shelf 01');
  const [carton, setCarton] = useState(editItem?.carton || 'Bin 101');
  const [storedType, setStoredType] = useState(editItem?.storedType || 'Standard Box');

  // Sharing
  const [transferable, setTransferable] = useState(editItem?.transferable ?? true);
  const [givable, setGivable] = useState(editItem?.givable ?? true);
  const [exchangeable, setExchangeable] = useState(editItem?.exchangeable ?? false);

  // Condition
  const [condition, setCondition] = useState<ItemCondition>(editItem?.condition || 'GOOD');
  const [conditionRemarks, setConditionRemarks] = useState('');
  const [remarks, setRemarks] = useState(editItem?.remarks || '');
  const [imageUrl, setImageUrl] = useState(editItem?.imageUrl || '');

  // Sub-team quantities (from spreadsheet)
  const [etQty, setEtQty] = useState(editItem?.etTeamQuantity ? String(editItem.etTeamQuantity) : '0');
  const [coolingQty, setCoolingQty] = useState(editItem?.coolingTeamQuantity ? String(editItem.coolingTeamQuantity) : '0');
  const [designQty, setDesignQty] = useState(editItem?.designTeamQuantity ? String(editItem.designTeamQuantity) : '0');
  const [chemicalQty, setChemicalQty] = useState(editItem?.chemicalTeamQuantity ? String(editItem.chemicalTeamQuantity) : '0');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side 300x300 Canvas Image Compressor
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Crop & scale to 300x300 square center
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        ctx.drawImage(img, startX, startY, size, size, 0, 0, 300, 300);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setImageUrl(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canManageInventory) {
      setError('Permission denied: Only Officers can entry or edit items.');
      return;
    }

    if (!itemCode.trim() || !itemName.trim()) {
      setError('Item Code and Item Name are mandatory fields.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        type,
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        description,
        category,
        brand,
        model,
        serialNumber,
        tonCapacity,
        unit,
        totalQuantity: parseInt(totalQuantity, 10) || 1,
        concern,
        storageLocation,
        rack,
        shelf,
        carton,
        storedType,
        transferable,
        givable,
        exchangeable,
        condition,
        conditionRemarks: conditionRemarks || undefined,
        remarks,
        imageUrl,
        etTeamQuantity: parseInt(etQty, 10) || 0,
        coolingTeamQuantity: parseInt(coolingQty, 10) || 0,
        designTeamQuantity: parseInt(designQty, 10) || 0,
        chemicalTeamQuantity: parseInt(chemicalQty, 10) || 0,
      };

      let autoBackupInfo: any = null;
      if (isEditing && editItem) {
        await api.updateItem(editItem.id, payload);
      } else {
        const res = await api.createItem(payload);
        autoBackupInfo = (res as any).autoBackup;
      }

      onSaved(autoBackupInfo);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error saving item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${type === 'TOOL_EQUIPMENT' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {type === 'TOOL_EQUIPMENT' ? <Wrench className="w-5 h-5" /> : <Box className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? `Edit Item: ${editItem.itemCode}` : `Add New ${type === 'TOOL_EQUIPMENT' ? 'Tool & Equipment' : 'Spare Part'}`}
              </h2>
              <p className="text-xs text-slate-400">
                Maintained under: <strong>{user?.name}</strong> ({user?.team})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Module Switcher (if creating new) */}
          {!isEditing && (
            <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => setType('SPARE_PART')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                  type === 'SPARE_PART' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Spare Part</span>
              </button>
              <button
                type="button"
                onClick={() => setType('TOOL_EQUIPMENT')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                  type === 'TOOL_EQUIPMENT' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Tool / Equipment</span>
              </button>
            </div>
          )}

          {/* Section 1: Item Identification & Photo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 300x300 Image Upload with Auto-Compression */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Item Photo (300 x 300 Auto-Scaled)
              </label>
              <div className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition">
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[11px] font-medium">
                      Change Photo
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <span className="text-[11px] font-medium text-slate-600 block">Click to upload image</span>
                    <span className="text-[10px] text-slate-400">Auto-compressed to 300x300 square</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Core Details */}
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Item Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    placeholder="e.g. SP-487122 or TL-20091"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Compressors, Valves, Gauges"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. Twin Rotary Inverter Compressor 1.5T (R32)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Technical Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Technical specifications, capacity, drop-in refrigerants, or test bench compatibility"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specs, Stock, Ton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Brand / Make</label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Testo, GMCC, Highly"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Model / Part No</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. 550s, KTK130U11"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-8831920"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ton / Capacity</label>
              <input
                type="text"
                value={tonCapacity}
                onChange={e => setTonCapacity(e.target.value)}
                placeholder="e.g. 1.5 Ton, 2.0 Ton, N/A"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: Stock Quantity & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Total Stock Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalQuantity}
                onChange={e => setTotalQuantity(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="Pcs">Pcs</option>
                <option value="Set">Set</option>
                <option value="Unit">Unit</option>
                <option value="Box">Box</option>
                <option value="Bottle">Bottle</option>
                <option value="Kg">Kg</option>
                <option value="Meter">Meter</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Stored Concern / Project</label>
              <input
                type="text"
                value={concern}
                onChange={e => setConcern(e.target.value)}
                placeholder="e.g. NextGen Inverter 2026"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 4: Physical Location (Building, Rack, Shelf, Carton, Stored Type) */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Storage Location Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="font-semibold text-slate-600 block mb-0.5 text-[11px]">Building/Lab</label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={e => setStorageLocation(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-0.5 text-[11px]">Rack Name</label>
                <input
                  type="text"
                  value={rack}
                  onChange={e => setRack(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-0.5 text-[11px]">Shelf / Row</label>
                <input
                  type="text"
                  value={shelf}
                  onChange={e => setShelf(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-0.5 text-[11px]">Carton / Column</label>
                <input
                  type="text"
                  value={carton}
                  onChange={e => setCarton(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-0.5 text-[11px]">Stored Type</label>
                <input
                  type="text"
                  value={storedType}
                  onChange={e => setStoredType(e.target.value)}
                  placeholder="e.g. Tray, Box, ESD"
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Condition & Sharing Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Item Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as ItemCondition)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="NEW">NEW</option>
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="GOOD">GOOD</option>
                <option value="USED">USED</option>
                <option value="FAIR">FAIR</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="UNDER REPAIR">UNDER REPAIR</option>
                <option value="OUT OF ORDER">OUT OF ORDER</option>
                <option value="SCRAPPED">SCRAPPED</option>
              </select>

              {isEditing && (
                <input
                  type="text"
                  value={conditionRemarks}
                  onChange={e => setConditionRemarks(e.target.value)}
                  placeholder="Remarks for condition change"
                  className="w-full mt-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block">Inter-Team Sharing Permissions</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferable}
                    onChange={e => setTransferable(e.target.checked)}
                    className="rounded text-blue-600 w-3.5 h-3.5"
                  />
                  <span>Transferable</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={givable}
                    onChange={e => setGivable(e.target.checked)}
                    className="rounded text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>Givable</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exchangeable}
                    onChange={e => setExchangeable(e.target.checked)}
                    className="rounded text-purple-600 w-3.5 h-3.5"
                  />
                  <span>Exchangeable</span>
                </label>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">General Remarks / Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Annual calibration required, keep away from humidity"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
