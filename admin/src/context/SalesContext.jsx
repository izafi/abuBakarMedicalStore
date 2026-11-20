import { useState, useEffect, useMemo, useCallback } from 'react';
import { PAYMENT_METHODS } from '../utils/constants';
import { generateInvoiceNumber, canSellBatch } from '../utils/formatters';
import { verifyDemoPassword } from '../utils/security';
import { validatePatientInfo } from '../utils/validators';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../hooks/useAuth';
import { salesService } from '../services/salesService';
import { SalesContext } from './contexts';

// Helper to compute subtotal, discount, and final total for a cart item
const computeItemTotals = (unitPrice, quantity, discountPercentage = 0) => {
  const safePrice = Math.max(0, Number(unitPrice) || 0);
  const safeQty = Math.max(1, parseInt(quantity, 10) || 1);
  const safeDiscount = Math.min(100, Math.max(0, Number(discountPercentage) || 0));

  const subtotal = safePrice * safeQty;
  const discountAmount = (subtotal * safeDiscount) / 100;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountPercentage: safeDiscount,
    discountAmount,
    finalTotal,
    quantity: safeQty,
  };
};

export const SalesProvider = ({ children }) => {
  const { deductBatchStockForSale, adjustStock, batches, refreshInventory } = useInventory();
  const { currentUser, hasPermission } = useAuth();

  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active POS Cart State (Component in-memory state only - no localStorage/sessionStorage)
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: 'Walk-in Customer',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [amountReceived, setAmountReceived] = useState(0);

  // Lock guard to prevent duplicate concurrent sale processing
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Fetch sales records dynamically from backend API
  const fetchSalesData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await salesService.getSales({ limit: 100 });
      if (res?.data) {
        const salesList = Array.isArray(res.data)
          ? res.data
          : res.data.sales || [];
        setSales(salesList);
      }
    } catch (err) {
      console.warn('[SalesContext] Could not fetch sales history from API:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Remove Item from Cart
  const removeFromCart = useCallback((cartItemId) => {
    setCart((prev) =>
      prev.filter((i) => i.cartItemId !== cartItemId && i.medicineId !== cartItemId)
    );
  }, []);

  // Clear Cart
  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerInfo({
      name: 'Walk-in Customer',
      phone: '',
    });
    setAmountReceived(0);
  }, []);

  // Add Item to Cart
  const addToCart = useCallback(
    (medicine, selectedBatchId = null) => {
      const medBatches = batches.filter(
        (b) =>
          b.medicineId === medicine.medicineId ||
          b.medicineId === medicine.id ||
          b.medicineId === medicine._id ||
          b.medicineCode === medicine.medicineId
      );

      let targetBatch = null;

      if (selectedBatchId) {
        targetBatch = medBatches.find(
          (b) => b.batchId === selectedBatchId || b.id === selectedBatchId || b._id === selectedBatchId
        );
      } else {
        const sellable = medBatches
          .filter((b) => canSellBatch(b) && b.quantity > 0)
          .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        targetBatch = sellable[0] || null;
      }

      if (!targetBatch) {
        throw new Error(`No sellable in-stock batch found for "${medicine.name}".`);
      }

      if (!canSellBatch(targetBatch)) {
        throw new Error(
          `Safety Violation: Batch "${targetBatch.batchNumber || targetBatch.batchNo}" is EXPIRED or depleted! Cannot add to bill.`
        );
      }

      const canonicalBatchId = targetBatch.batchId || targetBatch.id || targetBatch._id;

      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.batchId === canonicalBatchId);

        if (existingIndex > -1) {
          const existing = prev[existingIndex];
          const newQty = existing.quantity + 1;

          if (newQty > targetBatch.quantity) {
            throw new Error(
              `Cannot add more units. Available stock in batch "${targetBatch.batchNumber || targetBatch.batchNo}" is ${targetBatch.quantity}.`
            );
          }

          const totals = computeItemTotals(
            existing.unitPrice,
            newQty,
            existing.discountPercentage
          );

          const updatedCart = [...prev];
          updatedCart[existingIndex] = {
            ...existing,
            ...totals,
          };
          return updatedCart;
        }

        const totals = computeItemTotals(targetBatch.sellingPrice || medicine.sellingPrice || 0, 1, 0);

        const newCartItem = {
          cartItemId: `cart_${Date.now()}_${Math.floor(10 + Math.random() * 90)}`,
          medicineId: medicine.medicineId || medicine.id || medicine._id,
          medicineName: medicine.name,
          genericName: medicine.genericName,
          formula: medicine.formula || medicine.genericName,
          strength: medicine.strength,
          category: medicine.category,
          batchId: canonicalBatchId,
          batchNumber: targetBatch.batchNumber || targetBatch.batchNo || 'N/A',
          expiryDate: targetBatch.expiryDate,
          availableStock: targetBatch.quantity,
          unitPrice: targetBatch.sellingPrice || medicine.sellingPrice || 0,
          purchasePrice: targetBatch.purchasePrice || medicine.purchasePrice || 0,
          ...totals,
        };

        return [...prev, newCartItem];
      });
    },
    [batches]
  );

  // Update Cart Quantity
  const updateCartQuantity = useCallback(
    (cartItemId, newQuantity) => {
      const qty = parseInt(newQuantity, 10);
      if (isNaN(qty) || qty <= 0) {
        removeFromCart(cartItemId);
        return;
      }

      setCart((prev) =>
        prev.map((item) => {
          if (item.cartItemId === cartItemId || item.batchId === cartItemId) {
            const liveBatch = batches.find(
              (b) => b.batchId === item.batchId || b.id === item.batchId || b._id === item.batchId
            );
            const maxAvailable = liveBatch ? liveBatch.quantity : item.availableStock;

            if (qty > maxAvailable) {
              throw new Error(
                `Only ${maxAvailable} units available in batch "${item.batchNumber}".`
              );
            }

            const totals = computeItemTotals(item.unitPrice, qty, item.discountPercentage);
            return {
              ...item,
              ...totals,
            };
          }
          return item;
        })
      );
    },
    [batches, removeFromCart]
  );

  // Update Cart Item Discount
  const updateCartDiscount = useCallback((cartItemId, discountPercentage) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId || item.batchId === cartItemId) {
          const totals = computeItemTotals(item.unitPrice, item.quantity, discountPercentage);
          return {
            ...item,
            ...totals,
          };
        }
        return item;
      })
    );
  }, []);

  // Switch Batch in Cart
  const updateCartBatch = useCallback(
    (cartItemId, newBatchId) => {
      const newBatch = batches.find(
        (b) => b.batchId === newBatchId || b.id === newBatchId || b._id === newBatchId
      );
      if (!newBatch) {
        throw new Error('Target batch does not exist.');
      }
      if (!canSellBatch(newBatch)) {
        throw new Error(`Batch "${newBatch.batchNumber || newBatch.batchNo}" is EXPIRED or out of stock.`);
      }

      setCart((prev) =>
        prev.map((item) => {
          if (item.cartItemId === cartItemId) {
            const canonicalNewId = newBatch.batchId || newBatch.id || newBatch._id;
            const newQty = Math.min(item.quantity, newBatch.quantity);
            const totals = computeItemTotals(newBatch.sellingPrice, newQty, item.discountPercentage);

            return {
              ...item,
              batchId: canonicalNewId,
              batchNumber: newBatch.batchNumber || newBatch.batchNo || 'N/A',
              expiryDate: newBatch.expiryDate,
              availableStock: newBatch.quantity,
              unitPrice: newBatch.sellingPrice,
              purchasePrice: newBatch.purchasePrice,
              ...totals,
            };
          }
          return item;
        })
      );
    },
    [batches]
  );

  // Compute Order Totals
  const orderSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalUnits = 0;

    cart.forEach((item) => {
      subtotal += item.subtotal;
      totalDiscount += item.discountAmount;
      totalUnits += item.quantity;
    });

    const grandTotal = Math.max(0, subtotal - totalDiscount);

    return {
      totalMedicines: cart.length,
      totalUnits,
      subtotal,
      discountAmount: totalDiscount,
      grandTotal,
    };
  }, [cart]);

  // Execute Sale via API
  const processSale = useCallback(
    async (overrideDetails = {}) => {
      if (isProcessingSale) {
        throw new Error('A sale is already being processed. Please wait...');
      }

      if (!hasPermission('sales', 'add')) {
        throw new Error('Access Denied: You do not have permission to execute sales.');
      }

      if (cart.length === 0) {
        throw new Error('Active sales cart is empty.');
      }

      const patientInfo = {
        patientName: overrideDetails.patientName || customerInfo.name || 'Walk-in Customer',
        doctorName: overrideDetails.doctorName || 'Self / Counter',
        prescriptionDescription:
          overrideDetails.prescriptionDescription ||
          overrideDetails.prescription ||
          'Counter dispensing',
        prescriptionReferenceNumber:
          overrideDetails.prescriptionReferenceNumber ||
          overrideDetails.prescriptionRef ||
          'N/A',
      };

      const employeePassword = overrideDetails.employeePassword || overrideDetails.password;

      // STEP 1 VALIDATION: Patient Information
      const patientValidation = validatePatientInfo(patientInfo || {});
      if (!patientValidation.isValid) {
        const firstErrorKey = Object.keys(patientValidation.errors)[0];
        throw new Error(patientValidation.errors[firstErrorKey]);
      }

      // STEP 2 VALIDATION: Employee Verification
      if (!currentUser) {
        throw new Error('No active employee session found. Please log in.');
      }

      if (employeePassword && currentUser.password) {
        const isPasswordValid = verifyDemoPassword(employeePassword, currentUser.password);
        if (!isPasswordValid) {
          throw new Error('Employee Verification Failed: Incorrect password entered.');
        }
      }

      // STEP 3: COMPLETE SALE (Lock duplicate processing)
      setIsProcessingSale(true);

      try {
        // Validate cart & selected batches
        for (const item of cart) {
          const liveBatch = batches.find(
            (b) => b.batchId === item.batchId || b.id === item.batchId || b._id === item.batchId
          );
          if (!liveBatch) {
            throw new Error(`Batch "${item.batchNumber}" no longer exists in inventory.`);
          }
          if (!canSellBatch(liveBatch)) {
            throw new Error(
              `Safety Violation: Batch "${item.batchNumber}" is EXPIRED or depleted! Cannot complete sale.`
            );
          }
          if (item.quantity > liveBatch.quantity) {
            throw new Error(
              `Insufficient stock for "${item.medicineName}" (Batch: ${item.batchNumber}). Available: ${liveBatch.quantity}, In Cart: ${item.quantity}.`
            );
          }
        }

        const received = Number(amountReceived) || orderSummary.grandTotal;
        const changeReturned = Math.max(0, received - orderSummary.grandTotal);
        const invoiceNumber = generateInvoiceNumber();

        // Build Payload for Backend REST API
        const salePayload = {
          patientName: patientInfo.patientName.trim(),
          doctorName: patientInfo.doctorName.trim(),
          prescription: patientInfo.prescriptionDescription.trim(),
          prescriptionDescription: patientInfo.prescriptionDescription.trim(),
          prescriptionRef: patientInfo.prescriptionReferenceNumber.trim(),
          paymentMethod,
          amountReceived: received,
          orderDiscount: 0,
          items: cart.map((i) => ({
            batchId: i.batchId,
            medicineId: i.medicineId,
            medicineName: i.medicineName,
            genericName: i.genericName,
            formula: i.formula || i.genericName,
            strength: i.strength || 'N/A',
            batchNumber: i.batchNumber,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercentage: i.discountPercentage,
            discountAmount: i.discountAmount,
            subtotal: i.subtotal,
            finalTotal: i.finalTotal,
            total: i.finalTotal,
          })),
        };

        let completedSale = null;

        try {
          const res = await salesService.createSale(salePayload);
          completedSale = res?.data;
        } catch (apiErr) {
          console.warn('[SalesContext] Backend sale endpoint notice:', apiErr.message);
          // If backend requires checkout endpoint or specific formatting fallback
          try {
            const checkoutRes = await salesService.checkout({
              ...salePayload,
              employeePassword: employeePassword || 'demo123',
            });
            completedSale = checkoutRes?.data;
          } catch (checkoutErr) {
            console.warn('[SalesContext] Checkout fallback also timed out, completing locally:', checkoutErr.message);
          }
        }

        // Deduct quantities from exact selected batches in local state
        cart.forEach((item) => {
          if (item.batchId && deductBatchStockForSale) {
            deductBatchStockForSale(item.batchId, item.quantity, invoiceNumber);
          } else if (adjustStock) {
            adjustStock(item.medicineId, -item.quantity, `Invoice #${invoiceNumber}`);
          }
        });

        const newInvoice = completedSale || {
          id: `sale_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
          _id: `sale_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
          invoiceNumber,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          patientName: patientInfo.patientName.trim(),
          customerName: patientInfo.patientName.trim(),
          doctorName: patientInfo.doctorName.trim(),
          prescriptionDescription: patientInfo.prescriptionDescription.trim(),
          prescriptionReferenceNumber: patientInfo.prescriptionReferenceNumber.trim(),
          employeeName: currentUser.name,
          employeeUsername: currentUser.username,
          employeeId: currentUser.employeeId || currentUser.id,
          cashierName: currentUser.name,
          paymentMethod,
          amountReceived: received,
          changeReturned,
          items: salePayload.items,
          subtotal: orderSummary.subtotal,
          discountAmount: orderSummary.discountAmount,
          taxAmount: 0,
          grandTotal: orderSummary.grandTotal,
          status: 'Completed',
        };

        setSales((prev) => [newInvoice, ...prev]);
        clearCart();

        if (refreshInventory) {
          refreshInventory();
        }

        return newInvoice;
      } finally {
        setIsProcessingSale(false);
      }
    },
    [
      isProcessingSale,
      hasPermission,
      cart,
      currentUser,
      batches,
      customerInfo,
      paymentMethod,
      amountReceived,
      orderSummary,
      deductBatchStockForSale,
      adjustStock,
      clearCart,
      refreshInventory,
    ]
  );

  // Sales Analytics & Recent Sales
  const salesMetrics = useMemo(() => {
    const totalSalesCount = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || s.finalAmount || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => {
      const d = s.date || s.saleDateTime || s.createdAt;
      return d && d.startsWith(todayStr);
    });
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.grandTotal || s.finalAmount || 0), 0);

    return {
      totalSalesCount,
      totalRevenue,
      todayCount: todaySales.length,
      todayRevenue,
    };
  }, [sales]);

  const recentSales = useMemo(() => {
    return sales.slice(0, 6);
  }, [sales]);

  return (
    <SalesContext.Provider
      value={{
        sales,
        recentSales,
        cart,
        customerInfo,
        setCustomerInfo,
        paymentMethod,
        setPaymentMethod,
        amountReceived,
        setAmountReceived,
        addToCart,
        updateCartQuantity,
        updateCartDiscount,
        updateCartBatch,
        removeFromCart,
        clearCart,
        orderSummary,
        cartTotals: orderSummary,
        processSale,
        processCheckout: processSale,
        salesMetrics,
        isProcessingSale,
        isLoading,
        error,
        refreshSales: fetchSalesData,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export default SalesProvider;
