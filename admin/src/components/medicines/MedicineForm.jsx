import { useState } from 'react';
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
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { MEDICINE_TYPES } from '../../utils/constants';
import { validateMedicine } from '../../utils/validators';

const POPULAR_MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Drops',
  'Inhaler',
  'Other',
];

const getInitialFormData = (initialData, categories) => {
  if (initialData) {
    return {
      medicineId: initialData.medicineId || '',
      name: initialData.name || '',
      genericName: initialData.genericName || '',
      brand: initialData.brand || '',
      formula: initialData.formula || '',
      strength: initialData.strength || '',
      type: initialData.type || 'Tablet',
      category: initialData.category || categories[0] || 'Antibiotics',
      usage: initialData.usage || '',
      manufacturer: initialData.manufacturer || '',
      minStockAlert: String(initialData.minStockAlert ?? '20'),
      batchNo: '',
      initialQuantity: '',
      purchasePrice: '',
      sellingPrice: '',
      expiryDate: '',
      location: '',
    };
  }

  const generatedId = `MED-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    medicineId: generatedId,
    name: '',
    genericName: '',
    brand: '',
    formula: '',
    strength: '',
    type: 'Tablet',
    category: categories[0] || 'Antibiotics',
    usage: '',
    manufacturer: '',
    minStockAlert: '20',
    batchNo: `BAT-${Math.floor(100 + Math.random() * 900)}`,
    initialQuantity: '50',
    purchasePrice: '20.00',
    sellingPrice: '30.00',
    expiryDate: '2027-12-31',
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

  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialData, categories)
  );
  const [errors, setErrors] = useState({});
  const [showInitialBatch, setShowInitialBatch] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Auto-populate brand if empty and product name is typed
      brand: name === 'name' && !prev.brand ? value : prev.brand,
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

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const payload = {
      medicineData: {
        medicineId: formData.medicineId.trim().toUpperCase(),
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        brand: formData.brand.trim() || formData.name.trim(),
        formula: formData.formula.trim(),
        strength: formData.strength.trim(),
        type: formData.type,
        category: formData.category,
        usage: formData.usage.trim() || 'General pharmaceutical treatment',
        manufacturer: formData.manufacturer.trim(),
        minStockAlert: Number(formData.minStockAlert) || 20,
      },
      initialBatch:
        !isEditing && showInitialBatch && formData.batchNo
          ? {
              batchNo: formData.batchNo.trim(),
              quantity: Number(formData.initialQuantity) || 0,
              purchasePrice: Number(formData.purchasePrice) || 0,
              sellingPrice: Number(formData.sellingPrice) || 0,
              expiryDate: formData.expiryDate || '2027-12-31',
              location: formData.location.trim() || 'Rack A-1, Shelf 1',
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
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
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
            <p className="text-xs text-neutral-700 font-medium mt-0.5">
              {isEditing
                ? 'Update pharmaceutical specifications, brand, formula, and clinical notes.'
                : 'Create a master pharmaceutical catalog record with active formulation.'}
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
              <span>{isEditing ? 'Save Changes' : 'Register Medicine'}</span>
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* ========================================================
            CARD 1: MEDICINE IDENTITY & BRAND (EMERALD / TEAL THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/20 shadow-2xs space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Medicine Identity & Brand
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium">
                  Primary trade names, identifiers, and commercial branding
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-black bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
              {formData.medicineId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Medicine ID */}
            <div>
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
                className="w-full h-9 px-3 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-lg text-black focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 disabled:opacity-75 disabled:bg-slate-50 transition-all"
              />
              {errors.medicineId ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.medicineId}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Unique catalog code
                </span>
              )}
            </div>

            {/* Product / Display Name */}
            <div>
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
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.name
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.name ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Full packaging name
                </span>
              )}
            </div>

            {/* Commercial Brand */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Commercial Brand</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Panadol"
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.brand
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
                }`}
              />
              {errors.brand ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.brand}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                  Marketing trademark
                </span>
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
              className={`w-full h-9 px-3 text-xs font-semibold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                errors.genericName
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-emerald-600/30'
              }`}
            />
            {errors.genericName ? (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.genericName}
              </p>
            ) : (
              <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                Official international non-proprietary chemical name for searches
              </span>
            )}
          </div>
        </div>

        {/* ========================================================
            CARD 2: FORMULATION, DOSAGE & CATEGORY (ROYAL BLUE THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/20 shadow-2xs space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Formulation, Type & Classification
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium">
                  Select dosage form, therapeutic category, and safety limits
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-black bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
              {formData.type}
            </span>
          </div>

          {/* Quick Select Type Badges */}
          <div>
            <label className="block text-xs font-bold text-black mb-1.5">
              Select Dosage Form / Type <span className="text-rose-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_MEDICINE_TYPES.map((t) => {
                const isSelected = formData.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeSelect(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Full Medicine Type Dropdown */}
            <div>
              <label className="block text-xs font-bold text-black mb-1">
                All Types Dropdown <span className="text-rose-600">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full h-9 px-3 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-black focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 cursor-pointer transition-all"
              >
                {MEDICINE_TYPES.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

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
                className={`w-full h-9 px-3 text-xs font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.strength
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {errors.strength && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.strength}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-black mb-1">
                Therapeutic Category <span className="text-rose-600">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full h-9 px-3 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-black focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 cursor-pointer transition-all"
              >
                {categories.map((c, idx) => (
                  <option key={idx} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Manufacturer */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span>Pharmaceutical Manufacturer</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="e.g. GSK Pakistan, Abbott Laboratories"
                className={`w-full h-9 px-3 text-xs font-semibold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                  errors.manufacturer
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {errors.manufacturer && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.manufacturer}
                </p>
              )}
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-black mb-1">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Low Stock Alert Limit</span>
                </span>
                <span className="text-[11px] text-black font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  {formData.minStockAlert || '20'} units threshold
                </span>
              </label>
              <input
                type="number"
                name="minStockAlert"
                min="1"
                value={formData.minStockAlert}
                onChange={handleChange}
                placeholder="e.g. 20"
                className="w-full h-9 px-3 text-xs font-bold bg-white border border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 rounded-lg text-black transition-all"
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 3: CHEMICAL FORMULA & CLINICAL GUIDANCE (PURPLE THEME)
            ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/50 via-white to-fuchsia-50/20 shadow-2xs space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white p-1 rounded-md shadow-2xs">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Chemical Formula & Clinical Notes
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium">
                  Active pharmaceutical ingredients, molecular ratio, and usage guidelines
                </p>
              </div>
            </div>
          </div>

          {/* Chemical Formula */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
              <Stethoscope className="w-3 h-3 text-purple-600" />
              <span>Active Chemical Composition Formula</span>
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              name="formula"
              value={formData.formula}
              onChange={handleChange}
              placeholder="e.g. Amoxicillin trihydrate equivalent to 125mg amoxicillin per 5ml"
              className={`w-full h-9 px-3 text-xs font-mono font-bold bg-white border rounded-lg text-black focus:outline-none focus:ring-1 transition-all ${
                errors.formula
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-slate-300 hover:border-purple-400 focus:border-purple-600 focus:ring-purple-600/30'
              }`}
            />
            {errors.formula ? (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.formula}
              </p>
            ) : (
              <span className="text-[11px] text-neutral-700 font-medium mt-1 block">
                Precise pharmacological salt and active moiety concentration
              </span>
            )}
          </div>

          {/* Clinical Indications & Usage */}
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              Therapeutic Indications & Clinical Notes
            </label>
            <textarea
              name="usage"
              rows={2}
              value={formData.usage}
              onChange={handleChange}
              placeholder="e.g. Pediatric bacterial infections of ear, nose, throat, and respiratory tract..."
              className="w-full p-2.5 text-xs font-medium bg-white border border-slate-300 hover:border-purple-400 rounded-lg text-black focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 resize-none transition-all"
            />
          </div>
        </div>

        {/* ========================================================
            CARD 4: INITIAL STOCK BATCH (AMBER / ORANGE THEME - NEW ONLY)
            ======================================================== */}
        {!isEditing && (
          <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/20 shadow-2xs space-y-3 transition-all">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-1 rounded-md shadow-2xs">
                  <Boxes className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    Register Initial Stock Batch
                  </h4>
                  <p className="text-[11px] text-neutral-800 font-medium">
                    Optionally add your first incoming physical batch immediately.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInitialBatch}
                  onChange={(e) => setShowInitialBatch(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                    showInitialBatch
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-slate-100 text-black border-slate-300'
                  }`}
                >
                  {showInitialBatch ? 'Enabled' : 'Skip Batch'}
                </span>
              </label>
            </div>

            {showInitialBatch && (
              <div className="pt-1.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                      <Hash className="w-3 h-3 text-amber-600" />
                      <span>Batch Code</span>
                    </label>
                    <input
                      type="text"
                      name="batchNo"
                      value={formData.batchNo}
                      onChange={handleChange}
                      placeholder="e.g. BAT-1001"
                      className="w-full h-8 px-2.5 text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                      <PackageCheck className="w-3 h-3 text-amber-600" />
                      <span>Initial Quantity</span>
                    </label>
                    <input
                      type="number"
                      name="initialQuantity"
                      min="0"
                      value={formData.initialQuantity}
                      onChange={handleChange}
                      placeholder="50"
                      className="w-full h-8 px-2.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>Storage Location</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Rack A-1, Shelf 2"
                      className="w-full h-8 px-2.5 text-xs font-semibold bg-white border border-amber-300 rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                      <DollarSign className="w-3 h-3 text-neutral-600" />
                      <span>Cost Price (Rs.)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      placeholder="20.00"
                      className="w-full h-8 px-2.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span>Selling Retail Price (Rs.)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      placeholder="30.00"
                      className="w-full h-8 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50/70 border border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-black mb-1">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      <span>Batch Expiry Date</span>
                    </label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className="w-full h-8 px-2.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-black focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default MedicineForm;
