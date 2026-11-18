import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { MEDICINE_TYPES } from '../../utils/constants';
import { validateMedicine } from '../../utils/validators';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Auto-populate brand if empty and name is typed
      brand: name === 'name' && !prev.brand ? value : prev.brand,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
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
        !isEditing && formData.batchNo
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
      title={isEditing ? `Edit Medicine: ${initialData.name}` : 'Register New Medicine'}
      subtitle={
        isEditing
          ? 'Update pharmaceutical specifications, brand, formula, and dosage details.'
          : 'Define medicine master entry. One medicine can subsequently hold multiple stock batches.'
      }
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Register Medicine'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Unique Medicine ID"
            name="medicineId"
            required
            disabled={isEditing}
            value={formData.medicineId}
            error={errors.medicineId}
            onChange={handleChange}
            placeholder="e.g. MED-1001"
            helperText={isEditing ? 'Canonical ID cannot be altered' : 'Must be unique across directory'}
          />

          <Input
            label="Product / Brand Name"
            name="name"
            required
            value={formData.name}
            error={errors.name}
            onChange={handleChange}
            placeholder="e.g. Panadol 500mg"
          />

          <Input
            label="Commercial Brand Name"
            name="brand"
            required
            value={formData.brand}
            error={errors.brand}
            onChange={handleChange}
            placeholder="e.g. Panadol"
          />
        </div>

        {/* Formulation & Dosage */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Generic Formulation (INN)"
            name="genericName"
            required
            value={formData.genericName}
            error={errors.genericName}
            onChange={handleChange}
            placeholder="e.g. Paracetamol"
          />

          <Input
            label="Dosage Strength"
            name="strength"
            required
            value={formData.strength}
            error={errors.strength}
            onChange={handleChange}
            placeholder="e.g. 500mg, 10ml, 20g"
          />

          <Input
            label="Medicine Type"
            name="type"
            type="select"
            required
            value={formData.type}
            options={MEDICINE_TYPES}
            error={errors.type}
            onChange={handleChange}
          />
        </div>

        {/* Chemical Formula & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Category Classification"
            name="category"
            type="select"
            required
            value={formData.category}
            options={categories}
            error={errors.category}
            onChange={handleChange}
          />

          <Input
            label="Pharmaceutical Manufacturer"
            name="manufacturer"
            required
            value={formData.manufacturer}
            error={errors.manufacturer}
            onChange={handleChange}
            placeholder="e.g. GSK Pakistan, Abbott"
          />

          <Input
            label="Min Stock Alert Limit"
            name="minStockAlert"
            type="number"
            min="1"
            value={formData.minStockAlert}
            onChange={handleChange}
            helperText="Threshold for low-stock warning"
          />
        </div>

        {/* Active Chemical Composition Formula */}
        <Input
          label="Active Chemical Composition Formula"
          name="formula"
          required
          value={formData.formula}
          error={errors.formula}
          onChange={handleChange}
          placeholder="e.g. N-acetyl-p-aminophenol 500mg per unit"
        />

        {/* Usage Instructions / Indications */}
        <Input
          label="Therapeutic Indications & Usage Notes"
          name="usage"
          type="textarea"
          rows={2}
          value={formData.usage}
          onChange={handleChange}
          placeholder="e.g. Mild to moderate pain relief, headache, and fever reduction..."
        />

        {/* Optional Initial Batch Entry (Only shown when adding new medicine) */}
        {!isEditing && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Initial Stock Batch (Optional)
                </h4>
                <p className="text-[11px] text-gray-400">
                  You can register the first incoming batch immediately or add batches later.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Batch Code"
                name="batchNo"
                value={formData.batchNo}
                onChange={handleChange}
                placeholder="e.g. PAN-2026-99"
              />
              <Input
                label="Initial Quantity"
                name="initialQuantity"
                type="number"
                min="0"
                value={formData.initialQuantity}
                onChange={handleChange}
              />
              <Input
                label="Shelf / Rack Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Rack A-1, Shelf 2"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Cost Price (Rs.)"
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={handleChange}
              />
              <Input
                label="Retail Sell Price (Rs.)"
                name="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.sellingPrice}
                onChange={handleChange}
              />
              <Input
                label="Batch Expiry Date"
                name="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={handleChange}
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default MedicineForm;
