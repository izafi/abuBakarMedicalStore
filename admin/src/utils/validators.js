import { MEDICINE_TYPES, USER_ROLES } from './constants.js';

/**
 * Validate medicine entity for full CRUD
 */
export const validateMedicine = (data, existingMedicines = [], editingMedicineId = null) => {
  const errors = {};

  // Unique Medicine ID
  if (!data.medicineId || !data.medicineId.trim()) {
    errors.medicineId = 'Medicine ID is required (e.g. MED-1001)';
  } else {
    const isDuplicate = existingMedicines.some(
      (m) =>
        m.medicineId.toLowerCase() === data.medicineId.trim().toLowerCase() &&
        m.medicineId !== editingMedicineId
    );
    if (isDuplicate) {
      errors.medicineId = `Medicine ID "${data.medicineId}" is already assigned to another medicine`;
    }
  }

  // Name (Brand / Product Name)
  if (!data.name || !data.name.trim()) {
    errors.name = 'Medicine product name is required';
  }

  // Generic Name
  if (!data.genericName || !data.genericName.trim()) {
    errors.genericName = 'Generic formulation name is required';
  }

  // Brand Name
  if (!data.brand || !data.brand.trim()) {
    errors.brand = 'Brand / Trademark is required';
  }

  // Formula details
  if (!data.formula || !data.formula.trim()) {
    errors.formula = 'Active chemical composition formula is required';
  }

  // Strength
  if (!data.strength || !data.strength.trim()) {
    errors.strength = 'Strength / dosage is required (e.g. 500mg, 10ml)';
  }

  // Type
  if (!data.type || !MEDICINE_TYPES.includes(data.type)) {
    errors.type = 'Please select a valid medicine type';
  }

  // Category
  if (!data.category || !data.category.trim()) {
    errors.category = 'Category selection is required';
  }

  // Manufacturer
  if (!data.manufacturer || !data.manufacturer.trim()) {
    errors.manufacturer = 'Manufacturer or pharmaceutical company is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate employee creation / editing
 */
export const validateEmployee = (data, existingEmployees = [], editingEmployeeId = null) => {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Employee full name is required';
  }

  if (!data.username || !data.username.trim()) {
    errors.username = 'Username is required';
  } else {
    const isDuplicate = existingEmployees.some(
      (e) =>
        e.username.toLowerCase() === data.username.trim().toLowerCase() &&
        e.employeeId !== editingEmployeeId
    );
    if (isDuplicate) {
      errors.username = `Username "${data.username}" is already in use`;
    }
  }

  if (!editingEmployeeId && (!data.password || data.password.length < 4)) {
    errors.password = 'Demo password must be at least 4 characters';
  }

  if (!data.role || ![USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE].includes(data.role)) {
    errors.role = 'Role must be Admin or Employee';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate batch creation / editing
 */
export const validateBatch = (data, existingBatches = [], medicines = [], editingBatchId = null) => {
  const errors = {};

  // Belong to existing medicine
  if (!data.medicineId || !medicines.some((m) => m.medicineId === data.medicineId)) {
    errors.medicineId = 'Each batch must belong to an existing registered medicine';
  }

  // Batch code / number
  const batchNum = data.batchNumber || data.batchNo;
  if (!batchNum || !String(batchNum).trim()) {
    errors.batchNumber = 'Batch number code is required (e.g. BAT-2026-01)';
  } else {
    const isDuplicate = existingBatches.some(
      (b) =>
        (b.batchNumber?.toLowerCase() === String(batchNum).trim().toLowerCase() ||
         b.batchNo?.toLowerCase() === String(batchNum).trim().toLowerCase()) &&
        b.batchId !== editingBatchId &&
        b.id !== editingBatchId
    );
    if (isDuplicate) {
      errors.batchNumber = `Batch number "${batchNum}" already exists in the system`;
    }
  }

  // Manufacturing date
  if (!data.manufacturingDate) {
    errors.manufacturingDate = 'Manufacturing date is required';
  }

  // Expiry date
  if (!data.expiryDate) {
    errors.expiryDate = 'Expiry date is required';
  } else if (data.manufacturingDate && new Date(data.expiryDate) <= new Date(data.manufacturingDate)) {
    errors.expiryDate = 'Expiry date must be after manufacturing date';
  }

  // Purchase Price
  const pPrice = Number(data.purchasePrice);
  if (isNaN(pPrice) || pPrice <= 0) {
    errors.purchasePrice = 'Purchase price must be greater than 0';
  }

  // Selling Price
  const sPrice = Number(data.sellingPrice);
  if (isNaN(sPrice) || sPrice <= 0) {
    errors.sellingPrice = 'Selling price must be greater than 0';
  } else if (!isNaN(pPrice) && sPrice < pPrice) {
    errors.sellingPrice = 'Selling price cannot be less than purchase price';
  }

  // Quantity
  const qty = Number(data.quantity);
  if (isNaN(qty) || qty < 0) {
    errors.quantity = 'Quantity cannot be negative (must be 0 or more)';
  }

  // Storage location (Rack and Shelf)
  if (!data.rack || !String(data.rack).trim()) {
    errors.rack = 'Storage Rack designation is required (e.g. Rack A-1)';
  }
  if (!data.shelf || !String(data.shelf).trim()) {
    errors.shelf = 'Storage Shelf designation is required (e.g. Shelf 2)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate Step 1 Patient Information during checkout
 */
export const validatePatientInfo = (info) => {
  const errors = {};

  if (!info.patientName || !String(info.patientName).trim()) {
    errors.patientName = 'Patient full name is required';
  }

  if (!info.doctorName || !String(info.doctorName).trim()) {
    errors.doctorName = 'Prescribing doctor / consultant name is required';
  }

  if (!info.prescriptionDescription || !String(info.prescriptionDescription).trim()) {
    errors.prescriptionDescription = 'Prescription description / clinical directions required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
