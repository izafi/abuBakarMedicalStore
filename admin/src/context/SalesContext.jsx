import { useState, useEffect, useMemo, useCallback } from 'react';
import { STORAGE_KEYS, PAYMENT_METHODS } from '../utils/constants';
import { INITIAL_SALES } from '../data/initialSales';
import { storage } from '../utils/storage';
import { generateInvoiceNumber, canSellBatch } from '../utils/formatters';
import { verifyDemoPassword } from '../utils/security';
import { validatePatientInfo } from '../utils/validators';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../hooks/useAuth';
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
  const { deductBatchStockForSale, adjustStock, batches } = useInventory();
  const { currentUser, hasPermission } = useAuth();

  const [sales, setSales] = useState(() => {
    return storage.get(STORAGE_KEYS.SALES, INITIAL_SALES);
  });

  // Active POS Cart State
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: 'Walk-in Customer',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [amountReceived, setAmountReceived] = useState(0);

  // Lock guard to prevent duplicate concurrent sale processing
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  useEffect(() => {
    storage.set(STORAGE_KEYS.SALES, sales);
  }, [sales]);

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

  // Add Item to Cart (Strict safety validation)
  const addToCart = useCallback(
    (medicine, quantity = 1, selectedBatch = null) => {
      if (!hasPermission('sales', 'add')) {
        throw new Error('Access Denied: You do not have permission to add medicines to sales.');
      }

      let targetBatch = selectedBatch;

      // If no batch explicitly provided, find earliest non-expired batch with available stock
      if (!targetBatch) {
        const medBatches = batches.filter(
          (b) =>
            (b.medicineId === medicine.medicineId || b.medicineId === medicine.id) &&
            b.canSell &&
            b.quantity > 0
        );

        if (medBatches.length === 0) {
          throw new Error(
            `Cannot dispense "${medicine.name}". All stock is expired or out of stock!`
          );
        }

        const sorted = [...medBatches].sort(
          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        );
        targetBatch = sorted[0];
      } else {
        if (!canSellBatch(targetBatch)) {
          throw new Error(
            `Safety Violation: Batch "${targetBatch.batchNumber || targetBatch.batchNo}" is EXPIRED or depleted! Expired batches cannot be sold.`
          );
        }
      }

      const medId = medicine.medicineId || medicine.id;
      const bId = targetBatch.batchId || targetBatch.id;
      const cartItemId = `${medId}_${bId}`;

      const existingIndex = cart.findIndex((item) => item.cartItemId === cartItemId);
      const availableStock = Number(targetBatch.quantity) || 0;
      const unitPrice = Number(targetBatch.sellingPrice) || Number(medicine.sellingPrice) || 0;

      if (existingIndex > -1) {
        const existing = cart[existingIndex];
        const newQty = existing.quantity + quantity;

        if (newQty > availableStock) {
          throw new Error(
            `Cannot exceed available batch stock! Only ${availableStock} units available for batch ${targetBatch.batchNumber || targetBatch.batchNo}.`
          );
        }

        const totals = computeItemTotals(existing.unitPrice, newQty, existing.discountPercentage);

        setCart((prev) =>
          prev.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  ...totals,
                  availableStock,
                }
              : item
          )
        );
      } else {
        if (quantity > availableStock) {
          throw new Error(
            `Only ${availableStock} units available for batch ${targetBatch.batchNumber || targetBatch.batchNo}!`
          );
        }

        const totals = computeItemTotals(unitPrice, quantity, 0);

        const newItem = {
          cartItemId,
          medicineId: medId,
          batchId: bId,
          medicineName: medicine.name,
          genericName: medicine.genericName,
          formula: medicine.formula || medicine.genericName,
          strength: medicine.strength || 'N/A',
          batchNumber: targetBatch.batchNumber || targetBatch.batchNo,
          batchNo: targetBatch.batchNumber || targetBatch.batchNo,
          expiryDate: targetBatch.expiryDate,
          isNearExpiry: targetBatch.isNearExpiry,
          availableStock,
          unitPrice,
          ...totals,
        };

        setCart((prev) => [...prev, newItem]);
      }
    },
    [batches, cart, hasPermission]
  );

  // Update Cart Item Quantity (manual input or step)
  const updateCartQuantity = useCallback(
    (cartItemId, newQuantity) => {
      const parsedQty = parseInt(newQuantity, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        removeFromCart(cartItemId);
        return;
      }

      const item = cart.find((i) => i.cartItemId === cartItemId || i.medicineId === cartItemId);
      if (!item) return;

      const liveBatch = batches.find(
        (b) => b.batchId === item.batchId || b.id === item.batchId
      );
      const maxAvailable = liveBatch ? Number(liveBatch.quantity) : item.availableStock;

      if (parsedQty > maxAvailable) {
        throw new Error(
          `Cannot exceed available batch stock (${maxAvailable} units available in ${item.batchNumber})`
        );
      }

      const totals = computeItemTotals(item.unitPrice, parsedQty, item.discountPercentage);

      setCart((prev) =>
        prev.map((i) =>
          i.cartItemId === cartItemId || i.medicineId === cartItemId
            ? {
                ...i,
                ...totals,
                availableStock: maxAvailable,
              }
            : i
        )
      );
    },
    [batches, cart, removeFromCart]
  );

  // Apply Line Item Discount Percentage
  const updateCartDiscount = useCallback(
    (cartItemId, discountPercentage) => {
      const item = cart.find((i) => i.cartItemId === cartItemId || i.medicineId === cartItemId);
      if (!item) return;

      const totals = computeItemTotals(item.unitPrice, item.quantity, discountPercentage);

      setCart((prev) =>
        prev.map((i) =>
          i.cartItemId === cartItemId || i.medicineId === cartItemId
            ? {
                ...i,
                ...totals,
              }
            : i
        )
      );
    },
    [cart]
  );

  // Switch Batch for a Cart Item
  const updateCartBatch = useCallback(
    (cartItemId, newBatchId) => {
      const currentItem = cart.find((i) => i.cartItemId === cartItemId);
      if (!currentItem) return;

      const newBatch = batches.find((b) => b.batchId === newBatchId || b.id === newBatchId);
      if (!newBatch) throw new Error('Selected batch not found');

      if (!canSellBatch(newBatch)) {
        throw new Error(`Batch ${newBatch.batchNumber} is expired or out of stock!`);
      }

      const newCartItemId = `${currentItem.medicineId}_${newBatch.batchId}`;

      const existingOther = cart.find(
        (i) => i.cartItemId === newCartItemId && i.cartItemId !== cartItemId
      );
      if (existingOther) {
        throw new Error(`Batch ${newBatch.batchNumber} is already in the cart. Adjust its quantity directly.`);
      }

      const availableStock = Number(newBatch.quantity) || 0;
      const unitPrice = Number(newBatch.sellingPrice) || currentItem.unitPrice;
      const safeQty = Math.min(currentItem.quantity, availableStock);
      const totals = computeItemTotals(unitPrice, safeQty, currentItem.discountPercentage);

      setCart((prev) =>
        prev.map((i) =>
          i.cartItemId === cartItemId
            ? {
                ...i,
                cartItemId: newCartItemId,
                batchId: newBatch.batchId || newBatch.id,
                batchNumber: newBatch.batchNumber || newBatch.batchNo,
                batchNo: newBatch.batchNumber || newBatch.batchNo,
                expiryDate: newBatch.expiryDate,
                isNearExpiry: newBatch.isNearExpiry,
                availableStock,
                unitPrice,
                ...totals,
              }
            : i
        )
      );
    },
    [batches, cart]
  );

  // Calculated Order Summary
  const orderSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscountAmount = 0;
    let grandTotal = 0;
    let totalItems = 0;

    cart.forEach((item) => {
      subtotal += item.subtotal;
      totalDiscountAmount += item.discountAmount;
      grandTotal += item.finalTotal;
      totalItems += item.quantity;
    });

    return {
      subtotal,
      discountAmount: totalDiscountAmount,
      grandTotal,
      totalItems,
      lineItemCount: cart.length,
    };
  }, [cart]);

  // Centralized processSale function (Mandatory 3-Step Verification Execution)
  const processSale = useCallback(
    ({ patientInfo, employeePassword }) => {
      if (isProcessingSale) {
        throw new Error('A sale is already being processed. Please wait.');
      }

      if (!hasPermission('sales', 'add')) {
        throw new Error('Access Denied: You lack authorization to complete sales transactions.');
      }

      if (cart.length === 0) {
        throw new Error('Cart is empty. Please add medicines before checkout.');
      }

      // STEP 1 VALIDATION: Patient Information
      const patientValidation = validatePatientInfo(patientInfo || {});
      if (!patientValidation.isValid) {
        const firstErrorKey = Object.keys(patientValidation.errors)[0];
        throw new Error(patientValidation.errors[firstErrorKey]);
      }

      // STEP 2 VALIDATION: Employee Verification
      if (!currentUser || !currentUser.password) {
        throw new Error('No active employee session found. Please log in.');
      }

      const isPasswordValid = verifyDemoPassword(employeePassword, currentUser.password);
      if (!isPasswordValid) {
        throw new Error(
          'Employee Verification Failed: Incorrect password entered. Sale cancelled and stock has NOT been deducted.'
        );
      }

      // STEP 3: COMPLETE SALE (Lock duplicate processing)
      setIsProcessingSale(true);

      try {
        // 3.1 Validate cart & selected batches again
        for (const item of cart) {
          const liveBatch = batches.find(
            (b) => b.batchId === item.batchId || b.id === item.batchId
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

        // 3.2 Generate unique invoice number
        const invoiceNumber = generateInvoiceNumber();

        // 3.3 Deduct quantities from exact selected batches (updates stock & creates history)
        cart.forEach((item) => {
          if (item.batchId && deductBatchStockForSale) {
            deductBatchStockForSale(item.batchId, item.quantity, invoiceNumber);
          } else {
            adjustStock(item.medicineId, -item.quantity, `Invoice #${invoiceNumber}`);
          }
        });

        const received = Number(amountReceived) || orderSummary.grandTotal;
        const changeReturned = Math.max(0, received - orderSummary.grandTotal);

        // 3.4 - 3.12 Build comprehensive immutable invoice
        const newInvoice = {
          id: `sale_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
          invoiceNumber,
          date: new Date().toISOString(),
          patientName: patientInfo.patientName.trim(),
          customerName: patientInfo.patientName.trim(),
          doctorName: patientInfo.doctorName.trim(),
          prescriptionDescription: patientInfo.prescriptionDescription.trim(),
          prescriptionReferenceNumber:
            patientInfo.prescriptionReferenceNumber?.trim() || 'N/A',
          employeeName: currentUser.name,
          employeeUsername: currentUser.username,
          employeeId: currentUser.employeeId,
          cashierName: currentUser.name,
          paymentMethod,
          amountReceived: received,
          changeReturned,
          items: cart.map((i) => ({
            id: i.medicineId,
            medicineId: i.medicineId,
            batchId: i.batchId,
            medicineName: i.medicineName,
            genericName: i.genericName,
            formula: i.formula || i.genericName,
            strength: i.strength || 'N/A',
            batchNumber: i.batchNumber,
            batchNo: i.batchNumber,
            expiryDate: i.expiryDate,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercentage: i.discountPercentage,
            discountAmount: i.discountAmount,
            subtotal: i.subtotal,
            finalTotal: i.finalTotal,
            total: i.finalTotal,
          })),
          subtotal: orderSummary.subtotal,
          discountAmount: orderSummary.discountAmount,
          taxAmount: 0,
          grandTotal: orderSummary.grandTotal,
          status: 'Completed',
        };

        // 3.13 - 3.15 Save to sales & clear cart
        setSales((prev) => [newInvoice, ...prev]);
        clearCart();

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
      deductBatchStockForSale,
      adjustStock,
      amountReceived,
      orderSummary,
      paymentMethod,
      clearCart,
    ]
  );

  // Sales Analytics & Recent Sales
  const salesMetrics = useMemo(() => {
    const totalSalesCount = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.date && s.date.startsWith(todayStr));
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

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
        processCheckout: processSale, // alias ensuring unified sale execution
        salesMetrics,
        isProcessingSale,
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};
