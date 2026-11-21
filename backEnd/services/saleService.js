const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Invoice = require('../models/Invoice');
const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const StockHistory = require('../models/StockHistory');

/**
 * Helper: Generate unique invoice number e.g. INV-20261118-8492
 */
const generateInvoiceNumber = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${randomSuffix}`;
};

/**
 * Transaction Runner Helper
 * Uses MongoDB ACID session if supported on the active cluster.
 * Gracefully executes sequentially if running on a standalone local dev instance.
 */
const runInTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (
      err.message?.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      err.message?.includes('Transactions are not supported by this deployment')
    ) {
      return await workFn(null);
    }
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * CENTRALIZED PROCESS SALE SERVICE
 *
 * All sales in the pharmacy system MUST go through this single service.
 * Enforces:
 * - Patient and prescription validation
 * - Deduplication via idempotencyKey
 * - Pre-validation of every batch
 * - Prohibition of selling expired batches
 * - Prohibition of selling more than available stock
 * - Accurate server-side recalculation of subtotal, item discounts, total discount, and final amount
 * - Exact stock deduction per batch
 * - Creation of StockHistory audit records
 * - Atomic transaction rollback on failure
 */
const processSale = async ({ saleData, user }) => {
  const {
    patientName,
    doctorName,
    prescription,
    prescriptionDescription,
    prescriptionRef,
    prescriptionReferenceNumber,
    paymentMethod = 'Cash',
    items,
    amountReceived,
    orderDiscount = 0,
    idempotencyKey,
  } = saleData;

  // 1. Patient & Prescription Normalization (Optional)
  const finalPatient = (patientName || saleData.customerName || '').trim() || 'Walk-in Customer';
  const finalDoctor = (doctorName || '').trim() || 'Self / Counter';
  const finalPrescription = (prescription || prescriptionDescription || '').trim() || 'Counter dispensing';
  const finalPrescriptionRef = (prescriptionRef || prescriptionReferenceNumber || 'N/A').trim() || 'N/A';

  // 2. Payment Method Validation & Normalization
  let normalizedPaymentMethod = 'Cash';
  const pmUpper = String(paymentMethod).toUpperCase();
  if (pmUpper.includes('CARD') || pmUpper.includes('DEBIT') || pmUpper.includes('CREDIT')) {
    normalizedPaymentMethod = 'Card';
  } else if (pmUpper.includes('CASH')) {
    normalizedPaymentMethod = 'Cash';
  }

  // 3. Items Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Sales cart is empty. Add at least one medicine item to complete a sale.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Duplicate Sale Prevention (Idempotency Key)
  if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim() !== '') {
    const existingSale = await Sale.findOne({ idempotencyKey: idempotencyKey.trim() });
    if (existingSale) {
      return existingSale;
    }
  }

  // 5. Pre-validate every batch and calculate totals on the backend
  const now = new Date();
  const resolvedItems = [];
  let calculatedSubtotal = 0;
  let calculatedItemDiscounts = 0;

  for (const item of items) {
    const targetBatchId = item.batchId || item.id || item._id;
    if (!targetBatchId) {
      const error = new Error('Every sale item must specify a valid batchId.');
      error.statusCode = 400;
      throw error;
    }

    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      const error = new Error(`Quantity for batch '${targetBatchId}' must be a positive integer greater than 0.`);
      error.statusCode = 400;
      throw error;
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(targetBatchId);
    const batchQuery = isObjectId
      ? { $or: [{ _id: targetBatchId }, { batchId: targetBatchId }] }
      : { $or: [{ batchId: targetBatchId }, { batchNumber: item.batchNumber || targetBatchId }] };

    const batch = await Batch.findOne(batchQuery).populate('medicineId');
    if (!batch) {
      const error = new Error(`Batch '${targetBatchId}' not found in inventory.`);
      error.statusCode = 404;
      throw error;
    }

    // Critical Rule: Never sell expired medicines
    if (new Date(batch.expiryDate) < now) {
      const expDateStr = new Date(batch.expiryDate).toISOString().split('T')[0];
      const error = new Error(
        `SAFETY VIOLATION: Batch '${batch.batchNumber}' for '${batch.medicineId?.name || item.medicineName}' is EXPIRED (${expDateStr})! Expired medicines cannot be sold.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Critical Rule: Never sell more than available quantity
    if (batch.quantity < qty) {
      const medName = batch.medicineId?.name || item.medicineName || 'Medicine';
      const error = new Error(
        `Insufficient stock for '${medName}' (Batch: ${batch.batchNumber}). Requested: ${qty}, Available: ${batch.quantity}.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Server-Side Calculations
    const unitPrice =
      Number(batch.sellingPrice) >= 0
        ? Number(batch.sellingPrice)
        : Number(item.unitPrice || 0);

    const itemSubtotal = Math.round(unitPrice * qty * 100) / 100;

    const discountPercent = Math.min(
      100,
      Math.max(0, Number(item.discountPercent !== undefined ? item.discountPercent : item.discountPercentage || 0))
    );

    const discountAmount = Math.round(itemSubtotal * (discountPercent / 100) * 100) / 100;
    const itemTotal = Math.round((itemSubtotal - discountAmount) * 100) / 100;

    calculatedSubtotal += itemSubtotal;
    calculatedItemDiscounts += discountAmount;

    resolvedItems.push({
      batch,
      medicineId: batch.medicineId?._id || batch.medicineId,
      medicineCode: batch.medicineCode || batch.medicineId?.medicineId || item.medicineId || '',
      medicineName: batch.medicineId?.name || item.medicineName || 'Medicine',
      genericName: batch.medicineId?.genericName || item.genericName || '',
      formula: batch.medicineId?.formula || item.formula || '',
      strength: batch.medicineId?.strength || item.strength || '',
      batchId: batch._id,
      batchCode: batch.batchId,
      batchNumber: batch.batchNumber,
      quantity: qty,
      unitPrice,
      discountPercent,
      discountPercentage: discountPercent,
      discountAmount,
      subtotal: itemSubtotal,
      total: itemTotal,
      finalTotal: itemTotal,
    });
  }

  // Final Calculations on Backend (Never trust frontend totals)
  const extraOrderDiscount = Math.max(0, Number(orderDiscount || saleData.discountAmount || 0));
  const totalDiscount = Math.round((calculatedItemDiscounts + extraOrderDiscount) * 100) / 100;
  const finalAmount = Math.max(0, Math.round((calculatedSubtotal - totalDiscount) * 100) / 100);

  const received = amountReceived !== undefined ? Math.max(0, Number(amountReceived)) : finalAmount;
  const changeReturned = Math.max(0, Math.round((received - finalAmount) * 100) / 100);

  // 6. Execute atomic transaction (Rollback on any failure)
  const saleRecord = await runInTransaction(async (session) => {
    let invoiceNumber = generateInvoiceNumber();
    let exists = await Sale.findOne({ invoiceNumber }).session(session || null);
    while (exists) {
      invoiceNumber = generateInvoiceNumber();
      exists = await Sale.findOne({ invoiceNumber }).session(session || null);
    }

    // 6.1 Create Sale Header
    const [sale] = await Sale.create(
      [
        {
          invoiceNumber,
          patientName: finalPatient,
          doctorName: finalDoctor,
          prescription: finalPrescription,
          prescriptionRef: finalPrescriptionRef,
          prescriptionDescription: finalPrescription,
          prescriptionReferenceNumber: finalPrescriptionRef,
          employeeId: user?._id?.toString() || user?.employeeId || 'STAFF-01',
          employeeName: user?.name || 'Staff Pharmacist',
          employeeUsername: user?.username || '',
          paymentMethod: normalizedPaymentMethod,
          subtotal: Math.round(calculatedSubtotal * 100) / 100,
          totalDiscount,
          discountAmount: totalDiscount,
          finalAmount,
          grandTotal: finalAmount,
          amountReceived: received,
          changeReturned,
          saleDateTime: new Date(),
          date: new Date(),
          status: 'Completed',
          items: resolvedItems,
          idempotencyKey: idempotencyKey?.trim() || null,
        },
      ],
      { session: session || null }
    );

    // 6.2 Create Discrete SaleItem Documents
    const saleItemDocs = resolvedItems.map((item) => ({
      saleId: sale._id,
      medicineId: item.medicineId,
      medicineCode: item.medicineCode,
      medicineName: item.medicineName,
      genericName: item.genericName,
      formula: item.formula,
      strength: item.strength,
      batchId: item.batchId,
      batchCode: item.batchCode,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      total: item.total,
    }));
    await SaleItem.insertMany(saleItemDocs, { session: session || null });

    // 6.3 Create Official Invoice Document
    const [invoice] = await Invoice.create(
      [
        {
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.saleDateTime || new Date(),
          patientName: sale.patientName,
          doctorName: sale.doctorName,
          prescription: sale.prescription,
          prescriptionRef: sale.prescriptionRef,
          employeeId: sale.employeeId,
          employeeName: sale.employeeName,
          employeeUsername: sale.employeeUsername,
          subtotal: sale.subtotal,
          discount: sale.totalDiscount,
          totalDiscount: sale.totalDiscount,
          grandTotal: sale.finalAmount,
          finalAmount: sale.finalAmount,
          paymentMethod: sale.paymentMethod,
          amountReceived: sale.amountReceived,
          changeReturned: sale.changeReturned,
          status: 'Paid',
          items: resolvedItems,
        },
      ],
      { session: session || null }
    );

    // 6.4 Update Stock on Exact Batches & Create Audit Records
    for (const item of resolvedItems) {
      const b = await Batch.findById(item.batchId).session(session || null);
      if (!b) {
        throw new Error(`Batch '${item.batchNumber}' unexpectedly missing during transaction.`);
      }

      const prevQty = b.quantity;
      if (prevQty < item.quantity) {
        throw new Error(
          `Stock was depleted by another concurrent transaction for batch '${b.batchNumber}'. Requested: ${item.quantity}, Available: ${prevQty}.`
        );
      }

      const newQty = prevQty - item.quantity;
      b.quantity = newQty;
      await b.save({ session: session || null });

      // Create StockHistory record
      await StockHistory.create(
        [
          {
            stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            medicineId: item.medicineCode || item.medicineId.toString(),
            batchId: item.batchCode || item.batchId.toString(),
            previousQuantity: prevQty,
            changedQuantity: -item.quantity,
            newQuantity: newQty,
            actionType: 'SALE',
            employeeId: user?.username || user?.employeeId || 'STAFF-01',
            employeeName: user?.name || 'Staff Pharmacist',
            reason: `Sale dispensed in Invoice #${invoiceNumber}`,
            dateTime: new Date(),
          },
        ],
        { session: session || null }
      );
    }

    return sale;
  });

  return saleRecord;
};

module.exports = {
  processSale,
  generateInvoiceNumber,
};
