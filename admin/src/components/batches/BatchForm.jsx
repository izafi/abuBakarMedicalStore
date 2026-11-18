import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
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
      title={isEditing ? `Edit Batch: ${formData.batchNumber}` : 'Register New Batch'}
      subtitle={
        selectedMed
          ? `Medicine: ${selectedMed.name} (${selectedMed.medicineId}) • Multiple batches maintain separate stock`
          : 'Define batch-specific stock, storage rack, shelf, and expiry date.'
      }
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Register Batch Stock'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Parent Medicine Selector */}
        {!fixedMedicineId && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Assigned Medicine Master <span className="text-red-500">*</span>
            </label>
            <select
              name="medicineId"
              value={formData.medicineId}
              onChange={handleChange}
              disabled={isEditing}
              className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-transparent text-gray-900"
            >
              <option value="">-- Choose Medicine --</option>
              {medicineOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.medicineId && (
              <p className="mt-1 text-xs text-red-500">{errors.medicineId}</p>
            )}
          </div>
        )}

        {/* Batch Number & Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Batch Number / Code"
            name="batchNumber"
            required
            value={formData.batchNumber}
            error={errors.batchNumber}
            onChange={handleChange}
            placeholder="e.g. PAN-2026-981"
          />

          <Input
            label="Initial / Current Quantity"
            name="quantity"
            type="number"
            min="0"
            required
            value={formData.quantity}
            error={errors.quantity}
            onChange={handleChange}
            helperText="Cannot be negative"
          />

          <Input
            label="Distributor / Supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
            placeholder="e.g. GSK Distribution"
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Purchase / Cost Price (Rs.)"
            name="purchasePrice"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={formData.purchasePrice}
            error={errors.purchasePrice}
            onChange={handleChange}
            placeholder="e.g. 28.00"
          />

          <Input
            label="Retail Selling Price (Rs.)"
            name="sellingPrice"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={formData.sellingPrice}
            error={errors.sellingPrice}
            onChange={handleChange}
            placeholder="e.g. 35.00"
            helperText="Must be greater than or equal to purchase price"
          />
        </div>

        {/* Dates: Manufacturing & Expiry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Manufacturing Date"
            name="manufacturingDate"
            type="date"
            required
            value={formData.manufacturingDate}
            error={errors.manufacturingDate}
            onChange={handleChange}
          />

          <Input
            label="Expiry Date"
            name="expiryDate"
            type="date"
            required
            value={formData.expiryDate}
            error={errors.expiryDate}
            onChange={handleChange}
            helperText="Must be after manufacturing date"
          />
        </div>

        {/* Physical Storage Location: Rack & Shelf */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Storage Rack"
            name="rack"
            required
            value={formData.rack}
            error={errors.rack}
            onChange={handleChange}
            placeholder="e.g. Rack A-1, Cold Storage, Drawer B"
          />

          <Input
            label="Storage Shelf / Bin"
            name="shelf"
            required
            value={formData.shelf}
            error={errors.shelf}
            onChange={handleChange}
            placeholder="e.g. Shelf 2, Bin 4, Bottom Tray"
          />
        </div>

        {/* Audit Reason */}
        <Input
          label="Stock Movement / Audit Reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          placeholder="e.g. New delivery shipment, Physical audit count, Re-stocking"
          helperText="Recorded permanently in the Stock Movement History log"
        />
      </form>
    </Modal>
  );
};

export default BatchForm;
