import { useState } from 'react';
import {
  Boxes,
  Hash,
  PackageCheck,
  Building2,
  DollarSign,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  Check,
  Pill,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { validateBatch } from '../../utils/validators';

const getInitialFormData = (initialData, fixedMedicineId, medicines) => {
  if (initialData) {
    return {
      batchId: initialData.batchId || initialData.id || '',
      medicineId: initialData.medicineId || fixedMedicineId || '',
      batchNumber: initialData.batchNumber || initialData.batchNo || '',
      manufacturingDate: initialData.manufacturingDate || '2025-01-01',
      expiryDate: initialData.expiryDate || '2027-12-31',
      purchasePrice: String(initialData.purchasePrice ?? ''),
      sellingPrice: String(initialData.sellingPrice ?? ''),
      quantity: String(initialData.quantity ?? '50'),
      rack: initialData.rack || 'Rack A-1',
      shelf: initialData.shelf || 'Shelf 1',
      supplier: initialData.supplier || '',
      reason: 'Batch record update',
    };
  }

  const defaultMedId = fixedMedicineId || (medicines.length > 0 ? medicines[0].medicineId : '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  return {
    batchId: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
    medicineId: defaultMedId,
    batchNumber: `BAT-2026-${randomSuffix}`,
    manufacturingDate: new Date().toISOString().slice(0, 10),
    expiryDate: '2028-12-31',
    purchasePrice: '25.00',
    sellingPrice: '35.00',
    quantity: '50',
    rack: 'Rack A-1',
    shelf: 'Shelf 1',
    supplier: 'Official Pharma Agency',
    reason: 'New stock shipment delivery',
  };
};

export const BatchForm = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  medicines = [],
  fixedMedicineId = null,
  existingBatches = [],
}) => {
  const isEditing = Boolean(initialData);

  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialData, fixedMedicineId, medicines)
  );
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateBatch(
      formData,
      existingBatches,
      medicines,
      initialData ? initialData.batchId || initialData.id : null
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const payload = {
      batchId: formData.batchId.trim().toUpperCase(),
      medicineId: formData.medicineId,
      batchNumber: formData.batchNumber.trim().toUpperCase(),
      batchNo: formData.batchNumber.trim().toUpperCase(),
      manufacturingDate: formData.manufacturingDate,
      expiryDate: formData.expiryDate,
      purchasePrice: Number(formData.purchasePrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      quantity: Number(formData.quantity) || 0,
      rack: formData.rack.trim(),
      shelf: formData.shelf.trim(),
      location: `${formData.rack.trim()}, ${formData.shelf.trim()}`,
      supplier: formData.supplier.trim() || 'General Distributor',
    };

    onSave(payload, formData.reason);
  };

  const medicineOptions = medicines.map((m) => ({
    value: m.medicineId,
    label: `${m.name} (${m.medicineId}) • ${m.category}`,
  }));

  const selectedMed = medicines.find(
    (m) => m.medicineId === (fixedMedicineId || formData.medicineId)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
                {isEditing ? `Edit Batch: ${formData.batchNumber}` : 'Register New Batch'}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  isEditing
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                {isEditing ? 'Editing Batch' : 'New Physical Batch'}
              </span>
            </div>
            <p className="text-xs text-neutral-700 font-medium mt-0.5">
              {selectedMed
                ? `Medicine: ${selectedMed.name} (${selectedMed.medicineId}) • Independent batch inventory tracking.`
                : 'Define batch-specific stock, storage rack, shelf, and expiry date.'}
            </p>
          </div>
        </div>
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 hidden sm:flex">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Fields marked with <strong className="text-rose-600">*</strong> are mandatory</span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold px-4 py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-emerald-600 via-[#1C9A58] to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isEditing ? 'Save Changes' : 'Register Batch Stock'}</span>
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Parent Medicine Selector (Only when not pre-fixed by parent modal) */}
        {!fixedMedicineId && (
          <div className="p-3.5 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/20 shadow-2xs space-y-2">
            <label className="flex items-center gap-1 text-xs font-bold text-black">
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assigned Medicine Master</span>
              <span className="text-rose-600">*</span>
            </label>
            <select
              name="medicineId"
              value={formData.medicineId}
              onChange={handleChange}
              disabled={isEditing}
              className="w-full h-9 px-3 text-xs font-bold text-black bg-white hover:bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 cursor-pointer transition-all disabled:bg-slate-50 disabled:opacity-75"
            >
              <option value="">-- Choose Target Medicine --</option>
              {medicineOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.medicineId && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.medicineId}
              </p>
            )}
          </div>
        )}

        {/* ========================================================
            CARD 1: BATCH IDENTIFIER & STOCK UNITS (EMERALD / TEAL THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/20 shadow-2xs space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                <Boxes className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Batch Identifier & Stock Units
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium">
                  Physical shipment batch number, current count, and distributor
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-black bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
              {formData.batchNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Batch Code */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Hash className="w-3 h-3 text-emerald-600" />
                <span>Batch Number / Code</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                placeholder="e.g. PAN-2026-981"
                className={`w-full h-9 px-3 text-xs font-mono font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.batchNumber
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.batchNumber ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.batchNumber}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Official batch designation
                </span>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <PackageCheck className="w-3 h-3 text-emerald-600" />
                <span>Initial / Current Quantity</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="50"
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.quantity
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.quantity ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.quantity}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Physical units count
                </span>
              )}
            </div>

            {/* Distributor / Supplier */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Distributor / Supplier</span>
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g. Official Pharma Agency"
                className="w-full h-9 px-3 text-xs font-bold bg-white border border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 rounded-lg text-black transition-all"
              />
              <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                Source pharmaceutical agency
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 2: PURCHASE & RETAIL PRICING (ROYAL BLUE THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/20 shadow-2xs space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Pricing & Margin Rates (Rs.)
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium">
                  Wholesale acquisition cost and retail counter sales price
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Purchase Price */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <DollarSign className="w-3 h-3 text-neutral-600" />
                <span>Purchase / Cost Price (Rs.)</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="e.g. 25.00"
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.purchasePrice
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {errors.purchasePrice ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.purchasePrice}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Incoming invoice cost per unit
                </span>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                <span>Retail Selling Price (Rs.)</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="e.g. 35.00"
                className={`w-full h-9 px-3 text-xs font-bold bg-emerald-50/70 border rounded-lg text-emerald-900 focus:outline-none focus:ring-1 transition-all ${
                  errors.sellingPrice
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-emerald-300 hover:border-emerald-500 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.sellingPrice ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.sellingPrice}
                </p>
              ) : (
                <span className="text-[11px] text-emerald-800 font-semibold mt-1 block">
                  Must be greater than or equal to purchase price
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 3: VALIDITY DATES & PHYSICAL LOCATION (AMBER THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/20 shadow-2xs space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-1 rounded-md shadow-2xs">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Validity Dates & Storage Shelf
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium">
                  Manufacturing date, expiry threshold, and physical rack assignment
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Manufacturing Date */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Manufacturing Date</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleChange}
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 cursor-pointer transition-all ${
                  errors.manufacturingDate
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-amber-300 hover:border-amber-500 focus:border-amber-600 focus:ring-amber-600/30'
                }`}
              />
              {errors.manufacturingDate && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.manufacturingDate}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Batch Expiry Date</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 cursor-pointer transition-all ${
                  errors.expiryDate
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-amber-300 hover:border-amber-500 focus:border-amber-600 focus:ring-amber-600/30'
                }`}
              />
              {errors.expiryDate ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.expiryDate}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Must be after manufacturing date
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Storage Rack */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <MapPin className="w-3 h-3 text-purple-600" />
                <span>Storage Rack</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="rack"
                value={formData.rack}
                onChange={handleChange}
                placeholder="e.g. Rack A-1, Cold Storage"
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.rack
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-amber-400 focus:border-amber-600 focus:ring-amber-600/30'
                }`}
              />
              {errors.rack && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.rack}
                </p>
              )}
            </div>

            {/* Storage Shelf / Bin */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <MapPin className="w-3 h-3 text-purple-600" />
                <span>Storage Shelf / Bin</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="shelf"
                value={formData.shelf}
                onChange={handleChange}
                placeholder="e.g. Shelf 1, Bin 4"
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.shelf
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-amber-400 focus:border-amber-600 focus:ring-amber-600/30'
                }`}
              />
              {errors.shelf && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.shelf}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 4: AUDIT REASON (SLATE THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <label className="flex items-center gap-1 text-xs font-bold text-black">
            <FileText className="w-3.5 h-3.5 text-neutral-600" />
            <span>Stock Movement / Audit Reason</span>
          </label>
          <input
            type="text"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="e.g. New delivery shipment, Physical audit count, Re-stocking"
            className="w-full h-9 px-3 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 rounded-lg text-black transition-all"
          />
          <span className="text-[11px] text-neutral-700 font-medium block">
            Recorded permanently in the Stock Movement History audit log
          </span>
        </div>
      </form>
    </Modal>
  );
};

export default BatchForm;
