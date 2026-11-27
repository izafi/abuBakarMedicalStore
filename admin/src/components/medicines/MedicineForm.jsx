import { useState, useMemo } from 'react';
import {
  Pill,
  Tag,
  Layers,
  Building2,
  Boxes,
  FileText,
  AlertCircle,
  Calendar,
  MapPin,
  Check,
  AlertTriangle,
  FlaskConical,
  Hash,
  DollarSign,
  PackageCheck,
  Stethoscope,
  Truck,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ResponsiveDatePicker } from '../common/ResponsiveDatePicker';
import { FilterDropdown } from '../common/FilterDropdown';
import { MEDICINE_TYPES, DEFAULT_THERAPEUTIC_CATEGORIES } from '../../utils/constants';
import { validateMedicine } from '../../utils/validators';

const POPULAR_MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Cream',
  'Gel',
  'Drops',
  'Inhaler',
  'Other',
];

const getInitialFormData = (initialData, categories) => {
  const fallbackCat =
    (categories && categories.length > 0 && categories[0]) ||
    DEFAULT_THERAPEUTIC_CATEGORIES[0] ||
    'Antibiotics';

  if (initialData) {
    const locParts = (initialData.location || '').split(',');
    const resolvedRack =
      initialData.rack ||
      (locParts[0] ? locParts[0].trim() : '') ||
      'Rack A-1';
    const resolvedShelf =
      initialData.shelf ||
      (locParts[1] ? locParts[1].trim() : '') ||
      'Shelf 1';

    return {
      medicineId: initialData.medicineId || '',
      name: initialData.name || '',
      genericName: initialData.genericName || '',
      brand: initialData.brand || '',
      formula: initialData.formula || '',
      strength: initialData.strength || '',
      type: initialData.type || 'Tablet',
      category: initialData.category || fallbackCat,
      usage: initialData.usage || '',
      manufacturer: initialData.manufacturer || '',
      minStockAlert: String(initialData.minStockAlert ?? '20'),
      batchNo: '',
      initialQuantity: '',
      purchasePrice: '',
      sellingPrice: '',
      manufacturingDate: '',
      expiryDate: '',
      rack: resolvedRack,
      shelf: resolvedShelf,
      location: initialData.location || `${resolvedRack}, ${resolvedShelf}`,
    };
  }

  const generatedId = `MED-${Math.floor(1000 + Math.random() * 9000)}`;
  const today = new Date().toISOString().split('T')[0];
  return {
    medicineId: generatedId,
    name: '',
    genericName: '',
    brand: '',
    formula: '',
    strength: '',
    type: 'Tablet',
    category: fallbackCat,
    usage: '',
    manufacturer: '',
    minStockAlert: '20',
    batchNo: `BAT-${Math.floor(100 + Math.random() * 900)}`,
    initialQuantity: '50',
    purchasePrice: '20.00',
    sellingPrice: '30.00',
    manufacturingDate: today,
    expiryDate: '2027-12-31',
    rack: 'Rack A-1',
    shelf: 'Shelf 1',
    location: 'Rack A-1, Shelf 1',
  };
};

export const MedicineForm = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  categories = [],
  existingMedicines = [],
}) => {
  const isEditing = Boolean(initialData);

  const combinedCategories = useMemo(() => {
    const list = Array.from(
      new Set([...(categories || []), ...DEFAULT_THERAPEUTIC_CATEGORIES])
    ).filter(Boolean);
    const resolved = list.length > 0 ? list : DEFAULT_THERAPEUTIC_CATEGORIES;
    return resolved.slice().sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }, [categories]);

  const categoryOptions = useMemo(() => {
    const opts = combinedCategories.map((c) => ({ value: c, label: c }));
    opts.push({
      value: '__ADD_NEW__',
      label: '+ Custom Category...',
      isAction: true,
    });
    return opts;
  }, [combinedCategories]);

  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialData, categories)
  );
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleTypeSelect = (typeValue) => {
    setFormData((prev) => ({ ...prev, type: typeValue }));
    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateMedicine(
      formData,
      existingMedicines,
      initialData ? initialData.medicineId : null
    );

    const batchErrors = {};
    if (!isEditing) {
      if (!formData.batchNo || !formData.batchNo.trim()) {
        batchErrors.batchNo = 'Initial batch code is required (e.g. BAT-101)';
      }
      if (
        formData.initialQuantity === '' ||
        isNaN(Number(formData.initialQuantity)) ||
        Number(formData.initialQuantity) < 0
      ) {
        batchErrors.initialQuantity = 'Initial stock quantity is required (>= 0)';
      }
      if (
        formData.purchasePrice === '' ||
        isNaN(Number(formData.purchasePrice)) ||
        Number(formData.purchasePrice) <= 0
      ) {
        batchErrors.purchasePrice = 'Cost price is required (> 0)';
      }
      if (
        formData.sellingPrice === '' ||
        isNaN(Number(formData.sellingPrice)) ||
        Number(formData.sellingPrice) <= 0
      ) {
        batchErrors.sellingPrice = 'Selling price is required (> 0)';
      }
      if (!formData.manufacturingDate) {
        batchErrors.manufacturingDate = 'Manufacturing date is required';
      }
      if (!formData.expiryDate) {
        batchErrors.expiryDate = 'Batch expiry date is required';
      } else if (
        formData.manufacturingDate &&
        new Date(formData.expiryDate) <= new Date(formData.manufacturingDate)
      ) {
        batchErrors.expiryDate = 'Expiry date must be after manufacturing date';
      }
      if (!formData.rack || !formData.rack.trim()) {
        batchErrors.rack = 'Storage rack is required';
      }
      if (!formData.shelf || !formData.shelf.trim()) {
        batchErrors.shelf = 'Storage shelf / bin is required';
      }
    }

    const allErrors = { ...validation.errors, ...batchErrors };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    const payload = {
      medicineData: {
        medicineId: formData.medicineId.trim().toUpperCase(),
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        brand: formData.brand.trim(),
        formula: formData.formula.trim(),
        strength: formData.strength.trim(),
        type: formData.type,
        category: formData.category,
        usage: formData.usage.trim() || 'General pharmaceutical treatment',
        manufacturer: formData.manufacturer.trim(),
        minStockAlert: Number(formData.minStockAlert) || 20,
        rack: (formData.rack || 'Rack A-1').trim(),
        shelf: (formData.shelf || 'Shelf 1').trim(),
        location: `${(formData.rack || 'Rack A-1').trim()}, ${(formData.shelf || 'Shelf 1').trim()}`,
      },
      initialBatch: !isEditing
        ? {
            batchNo: formData.batchNo.trim(),
            quantity: Number(formData.initialQuantity) || 0,
            purchasePrice: Number(formData.purchasePrice) || 0,
            sellingPrice: Number(formData.sellingPrice) || 0,
            manufacturingDate: formData.manufacturingDate,
            expiryDate: formData.expiryDate || '2027-12-31',
            rack: formData.rack.trim() || 'Rack A-1',
            shelf: formData.shelf.trim() || 'Shelf 1',
            location: `${formData.rack.trim() || 'Rack A-1'}, ${formData.shelf.trim() || 'Shelf 1'}`,
          }
        : null,
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Pill className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight truncate max-w-[190px] sm:max-w-none">
                {isEditing ? `Edit: ${initialData.name}` : 'Register New Medicine'}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  isEditing
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                {isEditing ? 'Editing Catalog' : 'New Master Entry'}
              </span>
            </div>
            <p className="text-xs text-neutral-700 font-medium mt-0.5 truncate max-w-[240px] sm:max-w-none">
              {isEditing
                ? 'Update pharmaceutical specifications, distributor, formula, and clinical notes.'
                : 'Create a master pharmaceutical catalog record with active formulation.'}
            </p>
          </div>
        </div>
      }
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-neutral-800">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">Fields marked with <strong className="text-rose-600 font-bold">*</strong> are mandatory</span>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100 cursor-pointer transition-all text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-600 via-[#1C9A58] to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isEditing ? 'Save Changes' : 'Register Medicine'}</span>
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ========================================================
            CARD 1: MEDICINE IDENTITY & DISTRIBUTOR (EMERALD THEME)
            ======================================================== */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/20 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-emerald-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs shrink-0">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-bold text-black uppercase tracking-normal sm:tracking-wider">
                Medicine Identity & Distributor
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-black bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 whitespace-nowrap shrink-0">
              {formData.medicineId}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {/* Medicine ID */}
            <div className="order-2 sm:order-1 col-span-1">
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Hash className="w-3 h-3 text-emerald-600" />
                <span>Medicine ID</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="medicineId"
                disabled={isEditing}
                value={formData.medicineId}
                onChange={handleChange}
                placeholder="e.g. MED-1001"
                className="w-full h-8 px-2.5 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-lg text-black focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 disabled:opacity-75 disabled:bg-slate-50"
              />
              {errors.medicineId && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.medicineId}
                </p>
              )}
            </div>

            {/* Product / Display Name */}
            <div className="order-1 sm:order-2 col-span-2 sm:col-span-1">
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Pill className="w-3 h-3 text-emerald-600" />
                <span>Product Name</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Panadol 500mg"
                className={`w-full h-8 px-2.5 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.name
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name}
                </p>
              )}
            </div>

            {/* Distributor Name (Optional) */}
            <div className="order-3 sm:order-3 col-span-1">
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Truck className="w-3 h-3 text-emerald-600" />
                <span>Distributor Name</span>
                <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Ali Brothers, Muller & Phipps"
                className={`w-full h-8 px-2.5 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.brand
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.brand && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.brand}
                </p>
              )}
            </div>
          </div>

          {/* Generic Formulation (INN) */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
              <FlaskConical className="w-3 h-3 text-emerald-600" />
              <span>Generic Formulation (INN Active Substance)</span>
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              name="genericName"
              value={formData.genericName}
              onChange={handleChange}
              placeholder="e.g. Paracetamol, Amoxicillin + Clavulanic Acid"
              className={`w-full h-8 px-2.5 text-xs font-semibold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                errors.genericName
                  ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
              }`}
            />
            {errors.genericName && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.genericName}
              </p>
            )}
          </div>
        </div>

        {/* ========================================================
            CARD 2: FORMULATION & SPECS (BLUE THEME)
            ======================================================== */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-blue-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-bold text-black uppercase tracking-normal sm:tracking-wider">
                Formulation, Type & Classification
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-black bg-blue-100 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap shrink-0">
              {formData.type}
            </span>
          </div>

          {/* Quick Select Type Badges */}
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              Select Dosage Form / Type <span className="text-rose-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {POPULAR_MEDICINE_TYPES.map((t) => {
                const isSelected = formData.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeSelect(t)}
                    className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-400'
                        : 'bg-white text-black border border-slate-300 hover:border-blue-400 hover:bg-blue-50/60'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {/* Dosage Strength */}
            <div>
              <label className="block text-xs font-bold text-black mb-1">
                Dosage Strength <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="strength"
                value={formData.strength}
                onChange={handleChange}
                placeholder="e.g. 500mg, 125mg/5ml"
                className={`w-full h-8 px-2.5 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.strength
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {errors.strength && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.strength}
                </p>
              )}
            </div>

            {/* Category (Responsive FilterDropdown & Custom Entry) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-black">
                  Therapeutic Category <span className="text-rose-600">*</span>
                </label>
                {isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      if (!formData.category || !formData.category.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          category: combinedCategories[0] || 'Antibiotics',
                        }));
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Select from list
                  </button>
                )}
              </div>
              {isCustomCategory ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Anti-inflammatory"
                    className={`w-full h-8 px-2.5 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                      errors.category
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/30'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      if (!formData.category || !formData.category.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          category: combinedCategories[0] || 'Antibiotics',
                        }));
                      }
                    }}
                    className="px-2.5 h-8 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shrink-0 cursor-pointer"
                    title="Back to dropdown"
                  >
                    List
                  </button>
                </div>
              ) : (
                <FilterDropdown
                  value={formData.category}
                  onChange={(val) => {
                    if (val === '__ADD_NEW__') {
                      setIsCustomCategory(true);
                      setFormData((prev) => ({ ...prev, category: '' }));
                    } else {
                      setFormData((prev) => ({ ...prev, category: val }));
                    }
                    if (errors.category) {
                      setErrors((prev) => ({ ...prev, category: null }));
                    }
                  }}
                  options={categoryOptions}
                  placeholder="Select Category"
                  align="right"
                  buttonClassName="h-8 px-2.5 text-xs font-bold bg-white border-slate-300 rounded-lg text-black"
                  className="w-full"
                />
              )}
              {errors.category && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.category}
                </p>
              )}
            </div>

            {/* Manufacturer */}
            <div className="col-span-2 sm:col-span-1">
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span>Manufacturer</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="e.g. GSK, Abbott"
                className={`w-full h-8 px-2.5 text-xs font-semibold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.manufacturer
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {errors.manufacturer && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.manufacturer}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Chemical Formula */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Stethoscope className="w-3 h-3 text-purple-600" />
                <span>Chemical Formula / Composition</span>
                <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                name="formula"
                value={formData.formula}
                onChange={handleChange}
                placeholder="e.g. Amoxicillin trihydrate 125mg / 5ml"
                className={`w-full h-8 px-2.5 text-xs font-mono font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.formula
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-slate-300 hover:border-purple-400 focus:border-purple-600 focus:ring-purple-600/30'
                }`}
              />
              {errors.formula && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.formula}
                </p>
              )}
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-black mb-1">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Low Stock Alert</span>
                </span>
              </label>
              <input
                type="number"
                name="minStockAlert"
                min="1"
                value={formData.minStockAlert}
                onChange={handleChange}
                placeholder="20"
                className="w-full h-8 px-2.5 text-xs font-bold bg-white border border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 rounded-lg text-black transition-all"
              />
            </div>
          </div>

          {/* Storage Rack & Shelf in Edit Mode */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80">
              {/* Storage Rack */}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>Storage Rack</span>
                  <span className="text-[10px] text-slate-500 font-normal">(e.g. Rack A-1, 4)</span>
                </label>
                <input
                  type="text"
                  name="rack"
                  value={formData.rack}
                  onChange={handleChange}
                  placeholder="e.g. Rack A-1, 4"
                  className="w-full h-8 px-2.5 text-xs font-bold bg-white border border-slate-300 hover:border-emerald-400 focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58]/30 rounded-lg text-black transition-all"
                />
              </div>

              {/* Storage Shelf / Bin */}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>Storage Shelf / Bin</span>
                  <span className="text-[10px] text-slate-500 font-normal">(e.g. Shelf 1, 2)</span>
                </label>
                <input
                  type="text"
                  name="shelf"
                  value={formData.shelf}
                  onChange={handleChange}
                  placeholder="e.g. Shelf 1, 2"
                  className="w-full h-8 px-2.5 text-xs font-bold bg-white border border-slate-300 hover:border-emerald-400 focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58]/30 rounded-lg text-black transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            CARD 3: CLINICAL NOTES (OPTIONAL COMPACT)
            ======================================================== */}
        <div className="p-2.5 sm:p-3 rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/30 via-white to-fuchsia-50/10 shadow-2xs space-y-1.5">
          <label className="flex items-center gap-1 text-xs font-bold text-black">
            <FileText className="w-3 h-3 text-purple-600" />
            <span>Therapeutic Indications & Clinical Notes</span>
            <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
          </label>
          <textarea
            name="usage"
            rows={1}
            value={formData.usage}
            onChange={handleChange}
            placeholder="e.g. Bacterial infections, pain relief, usage precautions..."
            className="w-full p-2 text-xs font-medium bg-white border border-slate-300 hover:border-purple-400 rounded-lg text-black focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 resize-none transition-all"
          />
        </div>

        {/* ========================================================
            CARD 4: INITIAL STOCK BATCH (MANDATORY FOR NEW MEDICINE)
            ======================================================== */}
        {!isEditing && (
          <div className="p-3 sm:p-3.5 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-1 rounded-md shadow-2xs shrink-0">
                  <Boxes className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-normal sm:tracking-wider text-black">
                    Register Initial Stock Batch
                  </h4>
                </div>
              </div>

              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-300 whitespace-nowrap shrink-0">
                Mandatory First Batch
              </span>
            </div>

            {/* Row 1: Identification & Pricing */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                  <Hash className="w-3 h-3 text-amber-600" />
                  <span>Batch Code *</span>
                </label>
                <input
                  type="text"
                  name="batchNo"
                  value={formData.batchNo}
                  onChange={handleChange}
                  placeholder="e.g. BAT-1001"
                  className={`w-full h-8 px-2.5 text-xs font-mono font-bold bg-white border ${
                    errors.batchNo ? 'border-red-500 bg-red-50/20' : 'border-amber-300'
                  } rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30`}
                />
                {errors.batchNo && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5">{errors.batchNo}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                  <PackageCheck className="w-3 h-3 text-amber-600" />
                  <span>Initial Quantity *</span>
                </label>
                <input
                  type="number"
                  name="initialQuantity"
                  min="0"
                  value={formData.initialQuantity}
                  onChange={handleChange}
                  placeholder="50"
                  className={`w-full h-8 px-2.5 text-xs font-bold bg-white border ${
                    errors.initialQuantity ? 'border-red-500 bg-red-50/20' : 'border-amber-300'
                  } rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30`}
                />
                {errors.initialQuantity && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                    {errors.initialQuantity}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                  <DollarSign className="w-3 h-3 text-neutral-600" />
                  <span>Cost Price (Rs.) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  placeholder="20.00"
                  className={`w-full h-8 px-2.5 text-xs font-bold bg-white border ${
                    errors.purchasePrice ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                  } rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30`}
                />
                {errors.purchasePrice && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                    {errors.purchasePrice}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>Selling Price (Rs.) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  placeholder="30.00"
                  className={`w-full h-8 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50/70 border ${
                    errors.sellingPrice ? 'border-red-500 bg-red-50/20' : 'border-emerald-300'
                  } rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30`}
                />
                {errors.sellingPrice && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                    {errors.sellingPrice}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: VALIDITY DATES & STORAGE SHELF (Exact match of Image 1) */}
            <div className="pt-2.5 border-t border-amber-200/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-1 rounded-md shadow-2xs">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h5 className="text-xs font-bold text-black uppercase tracking-wider">
                    Validity Dates & Storage Shelf
                  </h5>
                  <p className="text-[11px] text-neutral-800 font-medium">
                    Manufacturing date, expiry threshold, and physical rack assignment
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Manufacturing Date */}
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    <span>Manufacturing Date</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <ResponsiveDatePicker
                    name="manufacturingDate"
                    value={formData.manufacturingDate}
                    onChange={handleChange}
                    error={Boolean(errors.manufacturingDate)}
                    align="left"
                    inputClassName="h-8"
                  />
                  {errors.manufacturingDate && (
                    <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                      {errors.manufacturingDate}
                    </p>
                  )}
                </div>

                {/* Batch Expiry Date */}
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    <span>Batch Expiry Date</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <ResponsiveDatePicker
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    error={Boolean(errors.expiryDate)}
                    align="right"
                    inputClassName="h-8"
                  />
                  {errors.expiryDate && (
                    <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                      {errors.expiryDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* Storage Rack */}
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                    <MapPin className="w-3 h-3 text-purple-600" />
                    <span>Storage Rack</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="rack"
                    value={formData.rack}
                    onChange={handleChange}
                    placeholder="Rack A-1"
                    className={`w-full h-8 px-2.5 text-xs font-bold bg-white border ${
                      errors.rack ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                    } rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30`}
                  />
                  {errors.rack && (
                    <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                      {errors.rack}
                    </p>
                  )}
                </div>

                {/* Storage Shelf / Bin */}
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                    <MapPin className="w-3 h-3 text-purple-600" />
                    <span>Storage Shelf / Bin</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="shelf"
                    value={formData.shelf}
                    onChange={handleChange}
                    placeholder="Shelf 1"
                    className={`w-full h-8 px-2.5 text-xs font-bold bg-white border ${
                      errors.shelf ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                    } rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30`}
                  />
                  {errors.shelf && (
                    <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                      {errors.shelf}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default MedicineForm;
