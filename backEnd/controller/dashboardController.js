const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get complete real-time dashboard analytics & operational datasets
 * @route   GET /api/v1/dashboard
 * @access  Public / Private
 */
const getDashboardData = asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne()) || { lowStockThreshold: 15, nearExpiryDays: 60 };
  const medicines = await Medicine.find();
  const batches = await Batch.find();
  const sales = await Sale.find();
  const stockHistory = await StockHistory.find().sort({ timestamp: -1 }).limit(10);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. KPI Calculations
  let todayRevenue = 0;
  let todaySalesCount = 0;
  let monthlyRevenue = 0;

  sales.forEach((s) => {
    const saleDate = new Date(s.date);
    const amount = Number(s.grandTotal) || 0;

    if (saleDate >= todayStart) {
      todayRevenue += amount;
      todaySalesCount += 1;
    }

    if (saleDate >= currentMonthStart) {
      monthlyRevenue += amount;
    }
  });

  let totalStockUnits = 0;
  let lowStockCount = 0;
  let expiredCount = 0;

  batches.forEach((b) => {
    const qty = Number(b.quantity) || 0;
    const expiry = new Date(b.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    totalStockUnits += qty;

    if (daysLeft < 0) {
      expiredCount += 1;
    } else if (qty <= settings.lowStockThreshold && qty > 0) {
      lowStockCount += 1;
    }
  });

  // 2. 14-Day Sales Trend
  const sales14Days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const dayTotal = sales
      .filter((s) => new Date(s.date).toISOString().slice(0, 10) === dateStr)
      .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

    sales14Days.push({ date: dateStr, label, value: dayTotal });
  }

  // 3. 14-Day Purchases Inflow Trend
  const purchases14Days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const dayUnits = stockHistory
      .filter((h) => {
        const entryDate = new Date(h.timestamp).toISOString().slice(0, 10);
        return entryDate === dateStr && (h.actionType === 'Add Stock' || Number(h.changedQuantity) > 0);
      })
      .reduce((sum, h) => sum + Math.max(0, Number(h.changedQuantity) || 0), 0);

    purchases14Days.push({ date: dateStr, label, value: dayUnits });
  }

  // 4. Stock by Category
  const catMap = new Map();
  const medMap = new Map(medicines.map((m) => [m.medicineId, m]));

  batches.forEach((b) => {
    const parent = medMap.get(b.medicineId);
    const cat = parent ? parent.category : 'General';
    catMap.set(cat, (catMap.get(cat) || 0) + (Number(b.quantity) || 0));
  });

  const categoryStock = Array.from(catMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  // 5. Operational Tables Data
  const lowStockBatches = batches
    .filter((b) => b.quantity > 0 && b.quantity <= settings.lowStockThreshold)
    .slice(0, 6)
    .map((b) => ({
      batchId: b.batchId,
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      location: b.location,
      medicineName: medMap.get(b.medicineId)?.name || 'Unknown',
    }));

  const expiringSoonBatches = batches
    .filter((b) => {
      const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= settings.nearExpiryDays && b.quantity > 0;
    })
    .slice(0, 6)
    .map((b) => {
      const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        batchId: b.batchId,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        daysLeft,
        quantity: b.quantity,
        medicineName: medMap.get(b.medicineId)?.name || 'Unknown',
      };
    });

  const recentSales = sales
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const payload = {
    cards: {
      totalMedicines: medicines.length,
      totalStockUnits,
      todayRevenue,
      todaySalesCount,
      monthlyRevenue,
      lowStockCount,
      expiredCount,
    },
    charts: {
      sales14Days,
      purchases14Days,
      categoryStock,
    },
    tables: {
      lowStockBatches,
      expiringSoonBatches,
      recentSales,
      recentActivities: stockHistory,
    },
  };

  return ApiResponse.success(res, 'Dashboard metrics retrieved successfully', payload);
});

module.exports = {
  getDashboardData,
};
