import { useState, useEffect, useMemo, useCallback } from 'react';
import { BATCH_STOCK_STATUS, STOCK_ACTION_TYPES, DEFAULT_THERAPEUTIC_CATEGORIES } from '../utils/constants';
import { getDaysUntilExpiry, getBatchStockStatus, canSellBatch } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { medicineService } from '../services/medicineService';
import { batchService } from '../services/batchService';
import { inventoryService } from '../services/inventoryService';
import { InventoryContext } from './contexts';

export const InventoryProvider = ({ children }) => {
  const { currentUser, hasPermission } = useAuth();
  const { settings } = useSettings();

  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_THERAPEUTIC_CATEGORIES);
  const [stockHistory, setStockHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all inventory resources dynamically from backend REST API
  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [medsRes, batchesRes, catsRes, historyRes] = await Promise.allSettled([
        medicineService.getMedicines({ limit: 'all' }),
        batchService.getBatches({ limit: 'all' }),
        medicineService.getCategories(),
        inventoryService.getStockHistory({ limit: 100 }),
      ]);

      if (medsRes.status === 'fulfilled' && medsRes.value?.data) {
        const rawMeds = Array.isArray(medsRes.value.data)
          ? medsRes.value.data
          : medsRes.value.data.medicines || [];
        setMedicines(rawMeds);
      }

      if (batchesRes.status === 'fulfilled' && batchesRes.value?.data) {
        const rawBatches = Array.isArray(batchesRes.value.data)
          ? batchesRes.value.data
          : batchesRes.value.data.batches || [];
        setBatches(rawBatches);
      }

      if (catsRes.status === 'fulfilled' && catsRes.value?.data) {
        const rawCats = Array.isArray(catsRes.value.data) ? catsRes.value.data : [];
        const merged = Array.from(new Set([...rawCats, ...DEFAULT_THERAPEUTIC_CATEGORIES])).filter(Boolean);
        setCategories(merged);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value?.data) {
        const rawHistory = Array.isArray(historyRes.value.data)
          ? historyRes.value.data
          : historyRes.value.data.history || [];
        setStockHistory(rawHistory);
      }
    } catch (err) {
      console.warn('[InventoryContext] API fetch error:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

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
        employeeId: currentUser?.employeeId || currentUser?.id || 'STAFF-01',
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
      return batches.filter(
        (b) =>
          b.medicineId === medicineId ||
          b.medicineCode === medicineId ||
          b.medicineId?._id === medicineId ||
          b.medicineId?.medicineId === medicineId
      );
    },
    [batches]
  );

  const getMedicineStock = useCallback(
    (medicineId) => {
      const medBatches = getMedicineBatches(medicineId);
      return medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    },
    [getMedicineBatches]
  );

  const getMedicineAvailableStock = useCallback(
    (medicineId) => {
      const medBatches = getMedicineBatches(medicineId).filter((b) => canSellBatch(b));
      return medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    },
    [getMedicineBatches]
  );

  // Enriched Batches with parent medicine metadata and status
  const enrichedBatches = useMemo(() => {
    const medMap = new Map();
    medicines.forEach((m) => {
      medMap.set(m.medicineId, m);
      if (m.id) medMap.set(m.id, m);
      if (m._id) medMap.set(m._id, m);
    });

    const configuredThreshold = settings?.lowStockThreshold || 15;
    const configuredNearExpiryDays = settings?.nearExpiryDays || 60;

    return batches.map((batch) => {
      const medIdKey =
        typeof batch.medicineId === 'object' && batch.medicineId !== null
          ? batch.medicineId.medicineId || batch.medicineId._id
          : batch.medicineId || batch.medicineCode;

      const parentMed =
        typeof batch.medicineId === 'object' && batch.medicineId !== null && batch.medicineId.name
          ? batch.medicineId
          : medMap.get(medIdKey) || null;

      const minAlert = parentMed?.minStockAlert || configuredThreshold;
      const daysLeft = getDaysUntilExpiry(batch.expiryDate);
      const computedStatus = getBatchStockStatus(batch, minAlert, configuredNearExpiryDays);
      const rack = batch.rack || (batch.location ? batch.location.split(',')[0]?.trim() : 'Rack A');
      const shelf = batch.shelf || (batch.location ? batch.location.split(',')[1]?.trim() : 'Shelf 1');

      return {
        ...batch,
        batchId: batch.batchId || batch.id || batch._id,
        id: batch.id || batch.batchId || batch._id,
        _id: batch._id || batch.id || batch.batchId,
        medicineId: parentMed?.medicineId || medIdKey,
        batchNumber: batch.batchNumber || batch.batchNo || 'N/A',
        batchNo: batch.batchNo || batch.batchNumber || 'N/A',
        manufacturingDate: batch.manufacturingDate || '2025-01-01',
        purchasePrice: Number(batch.purchasePrice) || 0,
        sellingPrice: Number(batch.sellingPrice) || 0,
        quantity: Number(batch.quantity) || 0,
        rack,
        shelf,
        location: batch.location || `${rack}, ${shelf}`,
        medicineName: parentMed ? parentMed.name : batch.medicineName || 'Unknown Medicine',
        genericName: parentMed ? parentMed.genericName : batch.genericName || '',
        category: parentMed ? parentMed.category : batch.category || 'General',
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
      const canonicalMedId = med.medicineId || med.id || med._id;
      const medBatches = enrichedBatches.filter(
        (b) =>
          b.medicineId === canonicalMedId ||
          b.medicineCode === canonicalMedId ||
          b.medicineId === med.id ||
          b.medicineId === med._id
      );
      const stock = medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
      const availableStock = medBatches
        .filter((b) => b.canSell)
        .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

      // Primary batch selection: earliest expiring sellable batch with stock
      const sellableBatches = medBatches
        .filter((b) => b.canSell && b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      const primaryBatch = sellableBatches[0] || medBatches[0] || null;

      const sellingPrice = primaryBatch ? Number(primaryBatch.sellingPrice) || 0 : Number(med.sellingPrice) || 0;
      const purchasePrice = primaryBatch ? Number(primaryBatch.purchasePrice) || 0 : Number(med.purchasePrice) || 0;
      const location = primaryBatch ? primaryBatch.location || 'Shelf' : 'Shelf';
      const batchNo = primaryBatch ? primaryBatch.batchNumber : 'N/A';
      const expiryDate = primaryBatch ? primaryBatch.expiryDate : null;

      return {
        ...med,
        id: canonicalMedId,
        medicineId: canonicalMedId,
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

  // Actions: Medicine CRUD via API
  const addMedicine = useCallback(
    async (medicineData, initialBatch = null) => {
      if (!hasPermission('medicines', 'add')) {
        throw new Error('Access Denied: You do not have permission to register medicines.');
      }

      const payload = {
        name: medicineData.name.trim(),
        genericName: medicineData.genericName.trim(),
        brand: medicineData.brand?.trim() || '',
        formula: medicineData.formula?.trim() || medicineData.genericName.trim(),
        strength: medicineData.strength?.trim() || 'N/A',
        type: medicineData.type || 'Tablet',
        category: medicineData.category || 'General',
        usage: medicineData.usage?.trim() || 'General medicinal application',
        manufacturer: medicineData.manufacturer?.trim() || 'Standard Pharma',
        minStockAlert: Number(medicineData.minStockAlert) || 20,
      };

      if (medicineData.medicineId) {
        payload.medicineId = medicineData.medicineId.trim();
      }

      let createdMed = null;
      try {
        const res = await medicineService.createMedicine(payload);
        createdMed = res?.data || payload;
      } catch (err) {
        console.warn('[InventoryContext] API addMedicine fallback:', err.message);
        createdMed = {
          ...payload,
          medicineId: payload.medicineId || `MED-${Math.floor(1000 + Math.random() * 9000)}`,
          id: payload.medicineId || `MED-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date().toISOString(),
        };
      }

      // If initial batch info is provided, create associated batch entry via API
      if (initialBatch && (initialBatch.batchNumber || initialBatch.batchNo)) {
        const batchNum = (initialBatch.batchNumber || initialBatch.batchNo).trim();
        const rack = initialBatch.rack?.trim() || 'Rack A-1';
        const shelf = initialBatch.shelf?.trim() || 'Shelf 1';
        const qty = Number(initialBatch.quantity) || 0;

        const batchPayload = {
          medicineId: createdMed._id || createdMed.medicineId,
          medicineCode: createdMed.medicineId,
          batchNumber: batchNum,
          manufacturingDate: initialBatch.manufacturingDate || new Date().toISOString().slice(0, 10),
          expiryDate: initialBatch.expiryDate || '2028-12-31',
          purchasePrice: Number(initialBatch.purchasePrice) || 0,
          sellingPrice: Number(initialBatch.sellingPrice) || 0,
          quantity: qty,
          rack,
          shelf,
          supplier: initialBatch.supplier?.trim() || 'Direct Supplier',
        };

        try {
          await batchService.createBatch(batchPayload);
        } catch (bErr) {
          console.warn('[InventoryContext] API initial batch creation fallback:', bErr.message);
          setBatches((prev) => [
            {
              ...batchPayload,
              batchId: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
              id: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
              location: `${rack}, ${shelf}`,
            },
            ...prev,
          ]);
        }
      }

      await fetchInventoryData();
      return createdMed;
    },
    [hasPermission, fetchInventoryData]
  );

  const updateMedicine = useCallback(
    async (medicineId, updatedFields) => {
      if (!hasPermission('medicines', 'edit')) {
        throw new Error('Access Denied: You do not have permission to edit medicines.');
      }

      const target = medicines.find(
        (m) => m.medicineId === medicineId || m.id === medicineId || m._id === medicineId
      );
      const targetId = target?._id || target?.id || medicineId;

      try {
        await medicineService.updateMedicine(targetId, updatedFields);
        await fetchInventoryData();
      } catch (err) {
        console.warn('[InventoryContext] API updateMedicine fallback:', err.message);
        setMedicines((prev) =>
          prev.map((med) =>
            med.medicineId === medicineId || med.id === medicineId || med._id === medicineId
              ? { ...med, ...updatedFields, updatedAt: new Date().toISOString() }
              : med
          )
        );
      }
    },
    [hasPermission, medicines, fetchInventoryData]
  );

  const deleteMedicine = useCallback(
    async (medicineId) => {
      if (!hasPermission('medicines', 'delete')) {
        throw new Error('Access Denied: You do not have permission to delete medicines.');
      }

      const target = medicines.find(
        (m) => m.medicineId === medicineId || m.id === medicineId || m._id === medicineId
      );
      const targetId = target?._id || target?.id || medicineId;

      try {
        await medicineService.deleteMedicine(targetId);
        await fetchInventoryData();
      } catch (err) {
        console.warn('[InventoryContext] API deleteMedicine fallback:', err.message);
        setMedicines((prev) =>
          prev.filter((m) => m.medicineId !== medicineId && m.id !== medicineId && m._id !== medicineId)
        );
        setBatches((prev) => prev.filter((b) => b.medicineId !== medicineId));
      }
    },
    [hasPermission, medicines, fetchInventoryData]
  );

  // Actions: Batch CRUD Operations via API
  const addBatch = useCallback(
    async (batchData, reason = 'New batch received from supplier') => {
      if (!hasPermission('inventory', 'add')) {
        throw new Error('Access Denied: You do not have permission to add batches.');
      }

      const targetMed = medicines.find(
        (m) => m.medicineId === batchData.medicineId || m.id === batchData.medicineId || m._id === batchData.medicineId
      );

      const batchNum = (batchData.batchNumber || batchData.batchNo || '').trim();
      const qty = Number(batchData.quantity) || 0;
      if (qty < 0) {
        throw new Error('Batch quantity cannot be negative.');
      }

      const rack = batchData.rack?.trim() || 'Rack A';
      const shelf = batchData.shelf?.trim() || 'Shelf 1';

      const payload = {
        batchId: batchData.batchId?.trim() || `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
        medicineId: targetMed?._id || targetMed?.id || batchData.medicineId,
        medicineCode: targetMed?.medicineId || batchData.medicineId,
        medicineName: targetMed?.name || batchData.medicineName,
        name: targetMed?.name || batchData.medicineName,
        genericName: targetMed?.genericName || batchData.genericName,
        category: targetMed?.category || batchData.category,
        type: targetMed?.type || batchData.type,
        batchNumber: batchNum,
        manufacturingDate: batchData.manufacturingDate || new Date().toISOString().slice(0, 10),
        expiryDate: batchData.expiryDate,
        purchasePrice: Number(batchData.purchasePrice) || 0,
        sellingPrice: Number(batchData.sellingPrice) || 0,
        quantity: qty,
        rack,
        shelf,
        supplier: batchData.supplier?.trim() || 'Distributor Delivery',
      };

      try {
        const res = await batchService.createBatch(payload);
        await fetchInventoryData();
        return res?.data;
      } catch (err) {
        console.error('[InventoryContext] API addBatch failed:', err.message);
        throw err;
      }
    },
    [hasPermission, medicines, fetchInventoryData]
  );

  const updateBatch = useCallback(
    async (batchId, updatedFields, reason = 'Batch details updated') => {
      if (!hasPermission('inventory', 'edit')) {
        throw new Error('Access Denied: You do not have permission to edit batch details.');
      }

      const target = batches.find(
        (b) => b.batchId === batchId || b.id === batchId || b._id === batchId
      );
      const targetId = target?._id || target?.id || batchId;

      try {
        await batchService.updateBatch(targetId, updatedFields);
        await fetchInventoryData();
      } catch (err) {
        console.error('[InventoryContext] API updateBatch failed:', err.message);
        throw err;
      }
    },
    [hasPermission, batches, fetchInventoryData]
  );

  const deleteBatch = useCallback(
    async (batchId, reason = 'Batch removed / discarded') => {
      if (!hasPermission('inventory', 'delete')) {
        throw new Error('Access Denied: You do not have permission to delete batches.');
      }

      const target = batches.find(
        (b) => b.batchId === batchId || b.id === batchId || b._id === batchId
      );
      const targetId = target?._id || target?.id || batchId;

      try {
        await batchService.deleteBatch(targetId);
        await fetchInventoryData();
      } catch (err) {
        console.error('[InventoryContext] API deleteBatch failed:', err.message);
        throw err;
      }
    },
    [hasPermission, batches, fetchInventoryData]
  );

  // Exact Batch Stock Adjustment
  const adjustBatchStock = useCallback(
    async (batchId, delta, actionType = STOCK_ACTION_TYPES.UPDATE_STOCK, reason = 'Stock adjustment') => {
      if (!hasPermission('inventory', 'edit')) {
        throw new Error('Access Denied: You do not have permission to adjust inventory stock.');
      }

      const target = batches.find(
        (b) => b.batchId === batchId || b.id === batchId || b._id === batchId
      );
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

      const targetId = target._id || target.id || batchId;
      try {
        await inventoryService.adjustStock({
          batchId: targetId,
          delta: numDelta,
          newQuantity: newQty,
          actionType,
          reason,
        });
        await fetchInventoryData();
      } catch (err) {
        console.error('[InventoryContext] API adjustStock failed:', err.message);
        throw err;
      }

      return newQty;
    },
    [hasPermission, batches, fetchInventoryData]
  );

  // Batch-Specific Sale Deduction
  const deductBatchStockForSale = useCallback(
    (batchId, quantityToDeduct, invoiceNumber = '') => {
      const target = batches.find(
        (b) => b.batchId === batchId || b.id === batchId || b._id === batchId
      );
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
          b.batchId === batchId || b.id === batchId || b._id === batchId
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

  const adjustStock = useCallback(
    (medicineId, delta, reason = 'Counter Dispense') => {
      const medBatches = getMedicineBatches(medicineId);
      if (medBatches.length === 0) return;

      if (delta > 0) {
        adjustBatchStock(medBatches[0].batchId || medBatches[0].id, delta, STOCK_ACTION_TYPES.ADD_STOCK, reason);
      } else {
        const nonExpired = medBatches.filter((b) => canSellBatch(b));
        if (nonExpired.length === 0) {
          throw new Error('All batches for this medicine are expired or out of stock!');
        }
        adjustBatchStock(nonExpired[0].batchId || nonExpired[0].id, delta, STOCK_ACTION_TYPES.SALE_DEDUCTION, reason);
      }
    },
    [getMedicineBatches, adjustBatchStock]
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

  const resetToDemoData = useCallback(async () => {
    await fetchInventoryData();
  }, [fetchInventoryData]);

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
        isLoading,
        error,
        refreshInventory: fetchInventoryData,
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

export default InventoryProvider;
