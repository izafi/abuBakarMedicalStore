import { useState, useEffect, useMemo, useCallback } from 'react';
import { STORAGE_KEYS, BATCH_STOCK_STATUS, STOCK_ACTION_TYPES } from '../utils/constants';
import { INITIAL_MEDICINES } from '../data/initialMedicines';
import { INITIAL_BATCHES } from '../data/initialBatches';
import { INITIAL_CATEGORIES } from '../data/initialCategories';
import { INITIAL_STOCK_HISTORY } from '../data/initialStockHistory';
import { storage } from '../utils/storage';
import { getDaysUntilExpiry, getBatchStockStatus, canSellBatch } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { InventoryContext } from './contexts';

export const InventoryProvider = ({ children }) => {
  const { currentUser, hasPermission } = useAuth();
  const { settings } = useSettings();

  const [medicines, setMedicines] = useState(() => {
    return storage.get(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
  });

  const [batches, setBatches] = useState(() => {
    return storage.get(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  });

  const [categories, setCategories] = useState(() => {
    return storage.get(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  });

  const [stockHistory, setStockHistory] = useState(() => {
    return storage.get(STORAGE_KEYS.STOCK_HISTORY, INITIAL_STOCK_HISTORY);
  });

  // Sync state to localStorage
  useEffect(() => {
    storage.set(STORAGE_KEYS.MEDICINES, medicines);
  }, [medicines]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.BATCHES, batches);
  }, [batches]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.STOCK_HISTORY, stockHistory);
  }, [stockHistory]);

  // Record Stock History helper
  const recordStockHistory = useCallback(
    ({ medicineId, batchId, previousQuantity, changedQuantity, newQuantity, actionType, reason }) => {
      const historyEntry = {
        stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        medicineId,
        batchId,
        previousQuantity: Number(previousQuantity) || 0,
        changedQuantity: Number(changedQuantity) || 0,
        newQuantity: Number(newQuantity) || 0,
        actionType: actionType || STOCK_ACTION_TYPES.UPDATE_STOCK,
        employeeId: currentUser?.employeeId || 'STAFF-01',
        employeeName: currentUser?.name || 'Staff Pharmacist',
        reason: reason || 'Inventory update',
        dateTime: new Date().toISOString(),
      };

      setStockHistory((prev) => [historyEntry, ...prev]);
      return historyEntry;
    },
    [currentUser]
  );

  // Helper functions for batch resolution
  const getMedicineBatches = useCallback(
    (medicineId) => {
      return batches.filter((b) => b.medicineId === medicineId);
    },
    [batches]
  );

  const getMedicineStock = useCallback(
    (medicineId) => {
      const medBatches = batches.filter((b) => b.medicineId === medicineId);
      return medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    },
    [batches]
  );

  const getMedicineAvailableStock = useCallback(
    (medicineId) => {
      const medBatches = batches.filter(
        (b) => b.medicineId === medicineId && canSellBatch(b)
      );
      return medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    },
    [batches]
  );

  // Enriched Batches with parent medicine metadata and status
  const enrichedBatches = useMemo(() => {
    const medMap = new Map();
    medicines.forEach((m) => {
      medMap.set(m.medicineId, m);
      if (m.id) medMap.set(m.id, m);
    });

    const configuredThreshold = settings?.lowStockThreshold || 15;
    const configuredNearExpiryDays = settings?.nearExpiryDays || 60;

    return batches.map((batch) => {
      const parentMed = medMap.get(batch.medicineId) || null;
      const minAlert = parentMed?.minStockAlert || configuredThreshold;
      const daysLeft = getDaysUntilExpiry(batch.expiryDate);
      const computedStatus = getBatchStockStatus(batch, minAlert, configuredNearExpiryDays);
      const rack = batch.rack || (batch.location ? batch.location.split(',')[0]?.trim() : 'Rack A');
      const shelf = batch.shelf || (batch.location ? batch.location.split(',')[1]?.trim() : 'Shelf 1');

      return {
        ...batch,
        batchId: batch.batchId || batch.id,
        id: batch.id || batch.batchId,
        batchNumber: batch.batchNumber || batch.batchNo || 'N/A',
        batchNo: batch.batchNo || batch.batchNumber || 'N/A',
        manufacturingDate: batch.manufacturingDate || '2025-01-01',
        purchasePrice: Number(batch.purchasePrice) || 0,
        sellingPrice: Number(batch.sellingPrice) || 0,
        quantity: Number(batch.quantity) || 0,
        rack,
        shelf,
        location: batch.location || `${rack}, ${shelf}`,
        medicineName: parentMed ? parentMed.name : 'Unknown Medicine',
        genericName: parentMed ? parentMed.genericName : '',
        category: parentMed ? parentMed.category : 'General',
        status: computedStatus,
        daysLeft,
        isExpired: daysLeft < 0,
        isNearExpiry: daysLeft >= 0 && daysLeft <= configuredNearExpiryDays,
        canSell: canSellBatch(batch),
      };
    });
  }, [batches, medicines, settings]);

  // Enriched medicines list with real-time resolved stock & batch metrics
  const enrichedMedicines = useMemo(() => {
    return medicines.map((med) => {
      const medBatches = enrichedBatches.filter((b) => b.medicineId === med.medicineId);
      const stock = medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
      const availableStock = medBatches
        .filter((b) => b.canSell)
        .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

      // Primary batch selection: earliest expiring sellable batch with stock
      const sellableBatches = medBatches
        .filter((b) => b.canSell && b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      const primaryBatch = sellableBatches[0] || medBatches[0] || null;

      const sellingPrice = primaryBatch ? Number(primaryBatch.sellingPrice) || 0 : 0;
      const purchasePrice = primaryBatch ? Number(primaryBatch.purchasePrice) || 0 : 0;
      const location = primaryBatch ? primaryBatch.location || 'Shelf' : 'Shelf';
      const batchNo = primaryBatch ? primaryBatch.batchNumber : 'N/A';
      const expiryDate = primaryBatch ? primaryBatch.expiryDate : null;

      return {
        ...med,
        id: med.medicineId, // maintain compatibility with existing consumers
        stock,
        availableStock,
        sellingPrice,
        purchasePrice,
        location,
        batchNo,
        batchNumber: batchNo,
        expiryDate,
        batchesCount: medBatches.length,
        hasExpiredBatches: medBatches.some((b) => b.isExpired && b.quantity > 0),
        hasNearExpiryBatches: medBatches.some((b) => b.isNearExpiry && b.quantity > 0),
      };
    });
  }, [medicines, enrichedBatches]);

  // Actions: Medicine CRUD
  const addMedicine = useCallback(
    (medicineData, initialBatch = null) => {
      if (!hasPermission('medicines', 'add')) {
        throw new Error('Access Denied: You do not have permission to register medicines.');
      }

      const uniqueId =
        medicineData.medicineId?.trim() ||
        `MED-${Math.floor(1000 + Math.random() * 9000)}`;

      const newMedicine = {
        medicineId: uniqueId,
        id: uniqueId,
        name: medicineData.name.trim(),
        genericName: medicineData.genericName.trim(),
        brand: medicineData.brand?.trim() || medicineData.name.trim(),
        formula: medicineData.formula?.trim() || medicineData.genericName.trim(),
        strength: medicineData.strength?.trim() || '',
        type: medicineData.type || 'Tablet',
        category: medicineData.category || 'General',
        usage: medicineData.usage?.trim() || 'General medicinal application',
        manufacturer: medicineData.manufacturer?.trim() || 'Standard Pharma',
        minStockAlert: Number(medicineData.minStockAlert) || 20,
        createdAt: new Date().toISOString(),
      };

      setMedicines((prev) => [newMedicine, ...prev]);

      // If initial batch info is provided, create associated batch entry
      if (initialBatch && (initialBatch.batchNumber || initialBatch.batchNo)) {
        const batchNum = (initialBatch.batchNumber || initialBatch.batchNo).trim();
        const batchId = `BAT-${Math.floor(1000 + Math.random() * 9000)}`;
        const rack = initialBatch.rack?.trim() || 'Rack A-1';
        const shelf = initialBatch.shelf?.trim() || 'Shelf 1';
        const qty = Number(initialBatch.quantity) || 0;

        const newBatch = {
          batchId,
          id: batchId,
          medicineId: uniqueId,
          batchNumber: batchNum,
          batchNo: batchNum,
          manufacturingDate: initialBatch.manufacturingDate || new Date().toISOString().slice(0, 10),
          expiryDate: initialBatch.expiryDate || '2028-12-31',
          purchasePrice: Number(initialBatch.purchasePrice) || 0,
          sellingPrice: Number(initialBatch.sellingPrice) || 0,
          quantity: qty,
          rack,
          shelf,
          location: `${rack}, ${shelf}`,
          supplier: initialBatch.supplier?.trim() || 'Direct Supplier',
          createdAt: new Date().toISOString(),
        };

        setBatches((prev) => [newBatch, ...prev]);

        if (qty > 0) {
          recordStockHistory({
            medicineId: uniqueId,
            batchId,
            previousQuantity: 0,
            changedQuantity: qty,
            newQuantity: qty,
            actionType: STOCK_ACTION_TYPES.ADD_STOCK,
            reason: 'Initial batch intake with medicine registration',
          });
        }
      }

      return newMedicine;
    },
    [hasPermission, recordStockHistory]
  );

  const updateMedicine = useCallback(
    (medicineId, updatedFields) => {
      if (!hasPermission('medicines', 'edit')) {
        throw new Error('Access Denied: You do not have permission to edit medicines.');
      }

      setMedicines((prev) =>
        prev.map((med) =>
          med.medicineId === medicineId || med.id === medicineId
            ? {
                ...med,
                ...updatedFields,
                medicineId: med.medicineId, // preserve canonical ID
                updatedAt: new Date().toISOString(),
              }
            : med
        )
      );
    },
    [hasPermission]
  );

  const deleteMedicine = useCallback(
    (medicineId) => {
      if (!hasPermission('medicines', 'delete')) {
        throw new Error('Access Denied: You do not have permission to delete medicines.');
      }

      // Record disposal history for any remaining batches
      const medBatches = batches.filter((b) => b.medicineId === medicineId);
      medBatches.forEach((b) => {
        if (b.quantity > 0) {
          recordStockHistory({
            medicineId,
            batchId: b.batchId || b.id,
            previousQuantity: b.quantity,
            changedQuantity: -b.quantity,
            newQuantity: 0,
            actionType: STOCK_ACTION_TYPES.DISPOSAL,
            reason: `Medicine ${medicineId} deleted from master catalog`,
          });
        }
      });

      setMedicines((prev) =>
        prev.filter((med) => med.medicineId !== medicineId && med.id !== medicineId)
      );
      setBatches((prev) => prev.filter((b) => b.medicineId !== medicineId));
    },
    [hasPermission, batches, recordStockHistory]
  );

  // Actions: Batch CRUD Operations
  const addBatch = useCallback(
    (batchData, reason = 'New batch received from supplier') => {
      if (!hasPermission('inventory', 'add')) {
        throw new Error('Access Denied: You do not have permission to add batches.');
      }

      const batchId =
        batchData.batchId?.trim() ||
        `BAT-${Math.floor(1000 + Math.random() * 9000)}`;

      const batchNum = (batchData.batchNumber || batchData.batchNo || batchId).trim();
      const qty = Number(batchData.quantity) || 0;
      if (qty < 0) {
        throw new Error('Batch quantity cannot be negative.');
      }

      const rack = batchData.rack?.trim() || 'Rack A';
      const shelf = batchData.shelf?.trim() || 'Shelf 1';

      const newBatch = {
        batchId,
        id: batchId,
        medicineId: batchData.medicineId,
        batchNumber: batchNum,
        batchNo: batchNum,
        manufacturingDate: batchData.manufacturingDate || new Date().toISOString().slice(0, 10),
        expiryDate: batchData.expiryDate,
        purchasePrice: Number(batchData.purchasePrice) || 0,
        sellingPrice: Number(batchData.sellingPrice) || 0,
        quantity: qty,
        rack,
        shelf,
        location: `${rack}, ${shelf}`,
        supplier: batchData.supplier?.trim() || 'Distributor Delivery',
        createdAt: new Date().toISOString(),
      };

      setBatches((prev) => [newBatch, ...prev]);

      if (qty > 0) {
        recordStockHistory({
          medicineId: batchData.medicineId,
          batchId,
          previousQuantity: 0,
          changedQuantity: qty,
          newQuantity: qty,
          actionType: STOCK_ACTION_TYPES.ADD_STOCK,
          reason,
        });
      }

      return newBatch;
    },
    [hasPermission, recordStockHistory]
  );

  const updateBatch = useCallback(
    (batchId, updatedFields, reason = 'Batch details updated') => {
      if (!hasPermission('inventory', 'edit')) {
        throw new Error('Access Denied: You do not have permission to edit batch details.');
      }

      setBatches((prev) =>
        prev.map((b) => {
          if (b.batchId === batchId || b.id === batchId) {
            const oldQty = Number(b.quantity) || 0;
            const newQty =
              updatedFields.quantity !== undefined
                ? Number(updatedFields.quantity)
                : oldQty;

            if (newQty < 0) {
              throw new Error('Stock quantity cannot be negative.');
            }

            const rack = updatedFields.rack || b.rack || 'Rack A';
            const shelf = updatedFields.shelf || b.shelf || 'Shelf 1';

            if (newQty !== oldQty) {
              recordStockHistory({
                medicineId: b.medicineId,
                batchId: b.batchId || b.id,
                previousQuantity: oldQty,
                changedQuantity: newQty - oldQty,
                newQuantity: newQty,
                actionType: STOCK_ACTION_TYPES.UPDATE_STOCK,
                reason,
              });
            }

            return {
              ...b,
              ...updatedFields,
              batchId: b.batchId || b.id,
              quantity: newQty,
              rack,
              shelf,
              location: `${rack}, ${shelf}`,
              updatedAt: new Date().toISOString(),
            };
          }
          return b;
        })
      );
    },
    [hasPermission, recordStockHistory]
  );

  const deleteBatch = useCallback(
    (batchId, reason = 'Batch removed / discarded') => {
      if (!hasPermission('inventory', 'delete')) {
        throw new Error('Access Denied: You do not have permission to delete batches.');
      }

      const target = batches.find((b) => b.batchId === batchId || b.id === batchId);
      if (target && target.quantity > 0) {
        recordStockHistory({
          medicineId: target.medicineId,
          batchId: target.batchId || target.id,
          previousQuantity: target.quantity,
          changedQuantity: -target.quantity,
          newQuantity: 0,
          actionType: STOCK_ACTION_TYPES.DISPOSAL,
          reason,
        });
      }

      setBatches((prev) =>
        prev.filter((b) => b.batchId !== batchId && b.id !== batchId)
      );
    },
    [hasPermission, batches, recordStockHistory]
  );

  // Exact Batch Stock Adjustment (Add, Update, Remove)
  const adjustBatchStock = useCallback(
    (batchId, delta, actionType = STOCK_ACTION_TYPES.UPDATE_STOCK, reason = 'Stock adjustment') => {
      if (!hasPermission('inventory', 'edit')) {
        throw new Error('Access Denied: You do not have permission to adjust inventory stock.');
      }

      const target = batches.find((b) => b.batchId === batchId || b.id === batchId);
      if (!target) {
        throw new Error(`Batch ID "${batchId}" not found.`);
      }

      const currentQty = Number(target.quantity) || 0;
      const numDelta = Number(delta);
      const newQty = currentQty + numDelta;

      if (newQty < 0) {
        throw new Error(
          `Cannot reduce stock below zero! Current stock is ${currentQty}, attempted reduction is ${Math.abs(numDelta)}.`
        );
      }

      setBatches((prev) =>
        prev.map((b) =>
          b.batchId === batchId || b.id === batchId
            ? { ...b, quantity: newQty, updatedAt: new Date().toISOString() }
            : b
        )
      );

      recordStockHistory({
        medicineId: target.medicineId,
        batchId: target.batchId || target.id,
        previousQuantity: currentQty,
        changedQuantity: numDelta,
        newQuantity: newQty,
        actionType,
        reason,
      });

      return newQty;
    },
    [hasPermission, batches, recordStockHistory]
  );

  // Batch-Specific Sale Deduction (Strict Rule: Expired batches cannot be sold, never combine batches implicitly)
  const deductBatchStockForSale = useCallback(
    (batchId, quantityToDeduct, invoiceNumber = '') => {
      const target = batches.find((b) => b.batchId === batchId || b.id === batchId);
      if (!target) {
        throw new Error(`Batch ID "${batchId}" not found for dispensing.`);
      }

      const daysLeft = getDaysUntilExpiry(target.expiryDate);
      if (daysLeft < 0) {
        throw new Error(
          `CRITICAL SAFETY ALERT: Batch "${target.batchNumber || target.batchNo}" is EXPIRED! Expired batches cannot be sold.`
        );
      }

      const currentQty = Number(target.quantity) || 0;
      const deductQty = Number(quantityToDeduct);

      if (deductQty > currentQty) {
        throw new Error(
          `Insufficient stock in batch ${target.batchNumber || target.batchNo}. Available: ${currentQty}, Requested: ${deductQty}`
        );
      }

      const newQty = currentQty - deductQty;

      setBatches((prev) =>
        prev.map((b) =>
          b.batchId === batchId || b.id === batchId
            ? { ...b, quantity: newQty, updatedAt: new Date().toISOString() }
            : b
        )
      );

      recordStockHistory({
        medicineId: target.medicineId,
        batchId: target.batchId || target.id,
        previousQuantity: currentQty,
        changedQuantity: -deductQty,
        newQuantity: newQty,
        actionType: STOCK_ACTION_TYPES.SALE_DEDUCTION,
        reason: invoiceNumber ? `Dispensed in Invoice #${invoiceNumber}` : 'POS Counter Sale',
      });

      return newQty;
    },
    [batches, recordStockHistory]
  );

  // Generic stock adjust fallback (deducts from earliest non-expired batch FIFO)
  const adjustStock = useCallback(
    (medicineId, delta, reason = 'Counter Dispense') => {
      const medBatches = batches.filter((b) => b.medicineId === medicineId);
      if (medBatches.length === 0) return;

      if (delta > 0) {
        // Add to primary batch
        adjustBatchStock(medBatches[0].batchId || medBatches[0].id, delta, STOCK_ACTION_TYPES.ADD_STOCK, reason);
      } else {
        // Deduct from earliest valid batch
        const nonExpired = medBatches.filter((b) => canSellBatch(b));
        if (nonExpired.length === 0) {
          throw new Error('All batches for this medicine are expired or out of stock!');
        }
        adjustBatchStock(nonExpired[0].batchId || nonExpired[0].id, delta, STOCK_ACTION_TYPES.SALE_DEDUCTION, reason);
      }
    },
    [batches, adjustBatchStock]
  );

  const addCategory = useCallback(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed || categories.includes(trimmed)) return false;
      setCategories((prev) => [...prev, trimmed]);
      return true;
    },
    [categories]
  );

  const deleteCategory = useCallback((name) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  }, []);

  const resetToDemoData = useCallback(() => {
    setMedicines(INITIAL_MEDICINES);
    setBatches(INITIAL_BATCHES);
    setCategories(INITIAL_CATEGORIES);
    setStockHistory(INITIAL_STOCK_HISTORY);
    storage.set(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
    storage.set(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    storage.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    storage.set(STORAGE_KEYS.STOCK_HISTORY, INITIAL_STOCK_HISTORY);
  }, []);

  // Comprehensive Inventory Dashboard Metrics
  const inventoryMetrics = useMemo(() => {
    let totalStock = 0;
    let availableStock = 0;
    let expiredUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let nearExpiryCount = 0;
    let expiredStockCount = 0;

    enrichedBatches.forEach((b) => {
      totalStock += b.quantity;
      totalCostValue += b.purchasePrice * b.quantity;
      totalRetailValue += b.sellingPrice * b.quantity;

      if (b.status === BATCH_STOCK_STATUS.EXPIRED) {
        expiredStockCount += 1;
        expiredUnits += b.quantity;
      } else {
        if (b.quantity > 0) {
          availableStock += b.quantity;
        }
        if (b.status === BATCH_STOCK_STATUS.OUT_OF_STOCK) {
          outOfStockCount += 1;
        } else if (b.status === BATCH_STOCK_STATUS.LOW_STOCK) {
          lowStockCount += 1;
        }
        if (b.status === BATCH_STOCK_STATUS.NEAR_EXPIRY) {
          nearExpiryCount += 1;
        }
      }
    });

    return {
      totalStock,
      availableStock,
      expiredUnits,
      lowStockCount,
      outOfStockCount,
      nearExpiryCount,
      expiredStockCount,
      totalBatches: enrichedBatches.length,
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
    };
  }, [enrichedBatches]);

  return (
    <InventoryContext.Provider
      value={{
        medicines: enrichedMedicines,
        rawMedicines: medicines,
        batches: enrichedBatches,
        rawBatches: batches,
        stockHistory,
        categories,
        getMedicineBatches,
        getMedicineStock,
        getMedicineAvailableStock,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addBatch,
        updateBatch,
        deleteBatch,
        adjustBatchStock,
        deductBatchStockForSale,
        adjustStock,
        recordStockHistory,
        addCategory,
        deleteCategory,
        resetToDemoData,
        inventoryMetrics,
        analytics: {
          totalMedicines: enrichedMedicines.length,
          totalStockCount: inventoryMetrics.totalStock,
          inventoryCost: inventoryMetrics.totalCostValue,
          retailValue: inventoryMetrics.totalRetailValue,
          potentialProfit: inventoryMetrics.potentialProfit,
          lowStockCount: inventoryMetrics.lowStockCount,
          outOfStockCount: inventoryMetrics.outOfStockCount,
          expiringSoonCount: inventoryMetrics.nearExpiryCount,
          expiredCount: inventoryMetrics.expiredStockCount,
        },
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
