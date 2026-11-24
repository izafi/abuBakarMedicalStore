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
import { ResponsiveDatePicker } from '../common/ResponsiveDatePicker';
import { FilterDropdown } from '../common/FilterDropdown';
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
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1C9A58] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {isEditing ? `Edit Batch: ${formData.batchNumber}` : 'Register New Batch'}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isEditing
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                {isEditing ? 'Editing' : 'New Batch'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-[250px] sm:max-w-none">
              {selectedMed
                ? `Medicine: ${selectedMed.name} (${selectedMed.medicineId})`
                : 'Define batch-specific stock, storage rack, shelf, and expiry date.'}
            </p>
          </div>
        </div>
      }
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 w-full">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">Fields marked with <strong className="text-rose-600 font-bold">*</strong> are mandatory</span>
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-300 text-slate-700 hover:text-black hover:bg-slate-100 cursor-pointer transition-all text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 sm:flex-none bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg shadow-2xs hover:shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isEditing ? 'Save Changes' : 'Register Batch Stock'}</span>
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
        {/* Parent Medicine Selector (Only when not pre-fixed) */}
        {!fixedMedicineId && (
          <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1 sm:space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-bold text-slate-900">
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assigned Medicine</span>
              <span className="text-rose-600">*</span>
            </label>
            <FilterDropdown
              value={formData.medicineId}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, medicineId: val }));
                if (errors.medicineId) {
                  setErrors((prev) => ({ ...prev, medicineId: null }));
                }
              }}
              options={medicineOptions}
              placeholder="-- Choose Target Medicine --"
              disabled={isEditing}
              buttonClassName="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold bg-white border-slate-300 rounded-lg text-slate-900"
              className="w-full"
            />
            {errors.medicineId && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.medicineId}
              </p>
            )}
          </div>
        )}

        {/* CARD 1: BATCH IDENTIFIER & STOCK UNITS */}
        <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 sm:space-y-2.5">
          <div className="flex items-center gap-2 pb-1.5 sm:pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-[#1C9A58] flex items-center justify-center shrink-0">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Batch & Stock Details
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Batch Code */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <Hash className="w-3 h-3 text-emerald-600" />
                <span>Batch Number</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                placeholder="e.g. BAT-2026-527"
                className={`w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-mono font-bold bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-1 transition-all ${
                  errors.batchNumber
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.batchNumber && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.batchNumber}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <PackageCheck className="w-3 h-3 text-emerald-600" />
                <span>Initial Quantity</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="50"
                className={`w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-1 transition-all ${
                  errors.quantity
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.quantity && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.quantity}
                </p>
              )}
            </div>

            {/* Distributor / Supplier */}
            <div className="col-span-2 sm:col-span-1">
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Distributor / Supplier</span>
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g. Official Pharma Agency"
                className="w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold bg-white border border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 rounded-lg text-slate-900 transition-all"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: PURCHASE & RETAIL PRICING */}
        <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 sm:space-y-2.5">
          <div className="flex items-center gap-2 pb-1.5 sm:pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Pricing Rates (Rs.)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Purchase Price */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <DollarSign className="w-3 h-3 text-slate-500" />
                <span className="truncate">Cost Price (Rs.)</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="25.00"
                className={`w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-1 transition-all ${
                  errors.purchasePrice
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {errors.purchasePrice && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.purchasePrice}
                </p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                <span className="truncate">Retail Price (Rs.)</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="35.00"
                className={`w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold bg-emerald-50/50 border rounded-lg text-emerald-950 focus:outline-none focus:ring-1 transition-all ${
                  errors.sellingPrice
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-emerald-300 hover:border-emerald-500 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.sellingPrice && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.sellingPrice}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* CARD 3: DATES & STORAGE LOCATION (2x2 grid) */}
        <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 sm:space-y-2.5">
          <div className="flex items-center gap-2 pb-1.5 sm:pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Validity Dates & Storage
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Manufacturing Date */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">Mfg Date</span>
                <span className="text-rose-600">*</span>
              </label>
              <ResponsiveDatePicker
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleChange}
                error={Boolean(errors.manufacturingDate)}
                align="left"
              />
              {errors.manufacturingDate && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.manufacturingDate}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">Expiry Date</span>
                <span className="text-rose-600">*</span>
              </label>
              <ResponsiveDatePicker
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                error={Boolean(errors.expiryDate)}
                align="right"
              />
              {errors.expiryDate && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.expiryDate}
                </p>
              )}
            </div>

            {/* Storage Rack */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">Storage Rack</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="rack"
                value={formData.rack}
                onChange={handleChange}
                placeholder="e.g. Rack A-1"
                className={`w-full h-8 sm:h-9 px-2 sm:px-3 text-xs font-bold bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-1 transition-all ${
                  errors.rack
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-purple-400 focus:border-purple-600 focus:ring-purple-600/30'
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
              <label className="flex items-center gap-1 text-xs font-bold text-slate-900 mb-1">
                <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">Shelf / Bin</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="shelf"
                value={formData.shelf}
                onChange={handleChange}
                placeholder="e.g. Shelf 1"
                className={`w-full h-8 sm:h-9 px-2 sm:px-3 text-xs font-bold bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-1 transition-all ${
                  errors.shelf
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-purple-400 focus:border-purple-600 focus:ring-purple-600/30'
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

        {/* CARD 4: AUDIT REASON (COMPACT) */}
        <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1 sm:space-y-1.5">
          <label className="flex items-center gap-1 text-xs font-bold text-slate-900">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Stock Intake Reason</span>
          </label>
          <input
            type="text"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="e.g. New delivery shipment, Physical audit count"
            className="w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 rounded-lg text-slate-900 transition-all"
          />
        </div>
      </form>
    </Modal>
  );
};

export default BatchForm;
