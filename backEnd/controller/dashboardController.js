const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Retrieve Settings or Defaults
 */
const getSettings = async () => {
  return (
    (await Settings.findOne()) || {
      lowStockThreshold: 15,
      nearExpiryDays: 60,
    }
  );
};

/**
 * @desc    Get Key Operational Dashboard KPI Summary
 * @route   GET /api/v1/dashboard/summary
 * @access  Private / Public
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // 1. Total Medicines (Active)
  const totalMedicines = await Medicine.countDocuments({ isActive: { $ne: false } });

  // 2. Total Stock Units (Sum across all batches)
  const stockAgg = await Batch.aggregate([
    { $group: { _id: null, totalUnits: { $sum: '$quantity' } } },
  ]);
  const totalStockUnits = stockAgg[0]?.totalUnits || 0;

  // 3. Today's Sales (Completed sales only)
  const todaySalesAgg = await Sale.aggregate([
    {
      $match: {
        status: 'Completed',
        $or: [{ saleDateTime: { $gte: startOfToday } }, { date: { $gte: startOfToday } }],
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$finalAmount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const todaySales = Math.round((todaySalesAgg[0]?.revenue || 0) * 100) / 100;
  const todaySalesCount = todaySalesAgg[0]?.count || 0;

  // 4. Monthly Revenue (Completed sales this month)
  const monthlyRevenueAgg = await Sale.aggregate([
    {
      $match: {
        status: 'Completed',
        $or: [{ saleDateTime: { $gte: startOfMonth } }, { date: { $gte: startOfMonth } }],
      },
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$finalAmount' },
      },
    },
  ]);
  const monthlyRevenue = Math.round((monthlyRevenueAgg[0]?.revenue || 0) * 100) / 100;

  // 5. Low Stock Count (Batches with quantity > 0 and <= threshold)
  const lowStockThreshold = Number(settings.lowStockThreshold) || 15;
  const lowStock = await Batch.countDocuments({
    quantity: { $gt: 0, $lte: lowStockThreshold },
    expiryDate: { $gt: now },
  });

  // 6. Expired Medicines Count (Batches where expiryDate < now)
  const expiredMedicines = await Batch.countDocuments({
    expiryDate: { $lt: now },
  });

  // 7. Near Expiry Medicines Count (Batches expiring within nearExpiryDays)
  const nearExpiryDays = Number(settings.nearExpiryDays) || 60;
  const nearExpiryDate = new Date(now.getTime() + nearExpiryDays * 24 * 60 * 60 * 1000);
  const nearExpiryMedicines = await Batch.countDocuments({
    expiryDate: { $gte: now, $lte: nearExpiryDate },
    quantity: { $gt: 0 },
  });

  const summary = {
    totalMedicines,
    totalStockUnits,
    todaySales,
    todayRevenue: todaySales,
    todaySalesCount,
    monthlyRevenue,
    lowStock,
    lowStockCount: lowStock,
    expiredMedicines,
    expiredCount: expiredMedicines,
    nearExpiryMedicines,
    nearExpiryCount: nearExpiryMedicines,
    thresholds: {
      lowStockThreshold,
      nearExpiryDays,
    },
  };

  return ApiResponse.success(res, 'Dashboard summary metrics calculated successfully', summary);
});

/**
 * @desc    Generate 14-Day Sales Chart Data from Real Database Records
 * @route   GET /api/v1/dashboard/sales-chart
 * @access  Private / Public
 */
const getDashboardSalesChart = asyncHandler(async (req, res) => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);

  // Group completed sales by date string (YYYY-MM-DD)
  const salesAgg = await Sale.aggregate([
    {
      $match: {
        status: 'Completed',
        $or: [{ saleDateTime: { $gte: fourteenDaysAgo } }, { date: { $gte: fourteenDaysAgo } }],
      },
    },
    {
      $project: {
        finalAmount: 1,
        saleDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $ifNull: ['$saleDateTime', '$date'] },
          },
        },
      },
    },
    {
      $group: {
        _id: '$saleDate',
        totalRevenue: { $sum: '$finalAmount' },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const salesMap = new Map();
  salesAgg.forEach((item) => {
    salesMap.set(item._id, {
      revenue: Math.round(item.totalRevenue * 100) / 100,
      ordersCount: item.ordersCount,
    });
  });

  // Construct continuous 14-day array
  const chartData = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayData = salesMap.get(dateStr) || { revenue: 0, ordersCount: 0 };
    chartData.push({
      date: dateStr,
      label,
      revenue: dayData.revenue,
      ordersCount: dayData.ordersCount,
      value: dayData.revenue,
    });
  }

  return ApiResponse.success(res, '14-Day sales chart data generated successfully', chartData);
});

/**
 * @desc    Generate 14-Day Purchases / Stock Inflow Chart Data
 * @route   GET /api/v1/dashboard/purchases-chart
 * @access  Private / Public
 */
const getDashboardPurchasesChart = asyncHandler(async (req, res) => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);

  // Inflow actions from StockHistory
  const inflowAgg = await StockHistory.aggregate([
    {
      $match: {
        $or: [
          { actionType: 'ADD' },
          { actionType: 'Add Stock' },
          { changedQuantity: { $gt: 0 } },
        ],
        $and: [
          {
            $or: [{ dateTime: { $gte: fourteenDaysAgo } }, { timestamp: { $gte: fourteenDaysAgo } }],
          },
        ],
      },
    },
    {
      $project: {
        changedQuantity: 1,
        entryDate: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $ifNull: ['$dateTime', '$timestamp'] },
          },
        },
      },
    },
    {
      $group: {
        _id: '$entryDate',
        totalUnits: { $sum: '$changedQuantity' },
        entriesCount: { $sum: 1 },
      },
    },
  ]);

  const inflowMap = new Map();
  inflowAgg.forEach((item) => {
    inflowMap.set(item._id, {
      units: Math.max(0, item.totalUnits),
      entriesCount: item.entriesCount,
    });
  });

  const chartData = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayData = inflowMap.get(dateStr) || { units: 0, entriesCount: 0 };
    chartData.push({
      date: dateStr,
      label,
      units: dayData.units,
      entriesCount: dayData.entriesCount,
      value: dayData.units,
    });
  }

  return ApiResponse.success(res, '14-Day purchases chart data generated successfully', chartData);
});

/**
 * @desc    Calculate Stock Breakdown by Medicine Category
 * @route   GET /api/v1/dashboard/stock-by-category
 * @access  Private / Public
 */
const getDashboardStockByCategory = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find().select('_id medicineId category');
  const batches = await Batch.find().select('medicineId quantity');

  // Build medicine ID to Category map
  const medCategoryMap = new Map();
  medicines.forEach((m) => {
    const cat = m.category || 'General';
    medCategoryMap.set(m._id.toString(), cat);
    if (m.medicineId) {
      medCategoryMap.set(m.medicineId, cat);
    }
  });

  const catCountMap = new Map();
  let totalStock = 0;

  batches.forEach((b) => {
    const medRef = b.medicineId?.toString();
    const category = medCategoryMap.get(medRef) || 'General';
    const qty = Math.max(0, Number(b.quantity) || 0);

    catCountMap.set(category, (catCountMap.get(category) || 0) + qty);
    totalStock += qty;
  });

  const result = Array.from(catCountMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalStock > 0 ? Math.round((count / totalStock) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return ApiResponse.success(res, 'Stock by category calculated successfully', {
    totalUnits: totalStock,
    categories: result,
  });
});

/**
 * @desc    Get Recent Completed Sales for Counter Dashboard
 * @route   GET /api/v1/dashboard/recent-sales
 * @access  Private / Public
 */
const getDashboardRecentSales = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));

  const recentSales = await Sale.find({ status: 'Completed' })
    .sort({ saleDateTime: -1, date: -1 })
    .limit(limit)
    .select(
      'invoiceNumber patientName doctorName employeeName paymentMethod subtotal totalDiscount finalAmount saleDateTime date items'
    );

  return ApiResponse.success(res, 'Recent completed sales retrieved', recentSales);
});

/**
 * @desc    Get Actionable System Alerts (Low Stock, Expired, Near Expiry, Reorder)
 * @route   GET /api/v1/dashboard/alerts
 * @access  Private / Public
 */
const getDashboardAlerts = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const now = new Date();
  const lowStockThreshold = Number(settings.lowStockThreshold) || 15;
  const nearExpiryDays = Number(settings.nearExpiryDays) || 60;
  const nearExpiryDate = new Date(now.getTime() + nearExpiryDays * 24 * 60 * 60 * 1000);

  // 1. Low stock batches
  const lowStockBatches = await Batch.find({
    quantity: { $gt: 0, $lte: lowStockThreshold },
    expiryDate: { $gt: now },
  })
    .populate('medicineId', 'name genericName brand category minStockAlert')
    .sort({ quantity: 1 })
    .limit(10);

  // 2. Expired batches
  const expiredBatches = await Batch.find({
    expiryDate: { $lt: now },
  })
    .populate('medicineId', 'name genericName brand category')
    .sort({ expiryDate: 1 })
    .limit(10);

  // 3. Near expiry batches
  const nearExpiryBatches = await Batch.find({
    expiryDate: { $gte: now, $lte: nearExpiryDate },
    quantity: { $gt: 0 },
  })
    .populate('medicineId', 'name genericName brand category')
    .sort({ expiryDate: 1 })
    .limit(10);

  // 4. Reorder Alerts: Medicines whose aggregate stock is <= minStockAlert
  const activeBatches = await Batch.aggregate([
    { $match: { expiryDate: { $gt: now } } },
    {
      $group: {
        _id: '$medicineId',
        availableStock: { $sum: '$quantity' },
      },
    },
  ]);

  const stockMap = new Map();
  activeBatches.forEach((b) => {
    stockMap.set(b._id?.toString(), b.availableStock);
  });

  const allMeds = await Medicine.find({ isActive: { $ne: false } }).select(
    '_id medicineId name genericName brand category minStockAlert rack shelf'
  );

  const reorderAlerts = [];
  allMeds.forEach((med) => {
    const currentQty = stockMap.get(med._id.toString()) || stockMap.get(med.medicineId) || 0;
    const threshold = Number(med.minStockAlert) || lowStockThreshold;
    if (currentQty <= threshold) {
      reorderAlerts.push({
        medicineId: med._id,
        medicineCode: med.medicineId,
        name: med.name,
        genericName: med.genericName,
        brand: med.brand,
        category: med.category,
        currentStock: currentQty,
        minStockAlert: threshold,
        rack: med.rack,
        shelf: med.shelf,
      });
    }
  });

  return ApiResponse.success(res, 'Actionable dashboard alerts retrieved', {
    lowStock: lowStockBatches,
    expired: expiredBatches,
    nearExpiry: nearExpiryBatches,
    reorderAlerts: reorderAlerts.slice(0, 15),
    counts: {
      lowStock: lowStockBatches.length,
      expired: expiredBatches.length,
      nearExpiry: nearExpiryBatches.length,
      reorderAlerts: reorderAlerts.length,
    },
  });
});

/**
 * @desc    Get Recent Activities from StockHistory Audit Log
 * @route   GET /api/v1/dashboard/recent-activities
 * @access  Private / Public
 */
const getDashboardRecentActivities = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const activities = await StockHistory.find()
    .sort({ dateTime: -1, timestamp: -1, createdAt: -1 })
    .limit(limit);

  return ApiResponse.success(res, 'Recent inventory activities retrieved', activities);
});

/**
 * @desc    Comprehensive Dashboard Master API (Backwards Compatibility)
 * @route   GET /api/v1/dashboard
 * @access  Private / Public
 */
const getDashboardData = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const medicines = await Medicine.find();
  const batches = await Batch.find();
  const sales = await Sale.find({ status: 'Completed' });
  const stockHistory = await StockHistory.find().sort({ dateTime: -1 }).limit(10);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayRevenue = 0;
  let todaySalesCount = 0;
  let monthlyRevenue = 0;

  sales.forEach((s) => {
    const saleDate = new Date(s.saleDateTime || s.date);
    const amount = Number(s.finalAmount || s.grandTotal) || 0;

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
  let nearExpiryCount = 0;

  batches.forEach((b) => {
    const qty = Number(b.quantity) || 0;
    const expiry = new Date(b.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    totalStockUnits += qty;
    if (daysLeft < 0) {
      expiredCount += 1;
    } else if (daysLeft <= settings.nearExpiryDays && qty > 0) {
      nearExpiryCount += 1;
    }
    if (qty <= settings.lowStockThreshold && qty > 0 && daysLeft >= 0) {
      lowStockCount += 1;
    }
  });

  // 14-Day Sales
  const sales14Days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const dayTotal = sales
      .filter((s) => new Date(s.saleDateTime || s.date).toISOString().slice(0, 10) === dateStr)
      .reduce((sum, s) => sum + (Number(s.finalAmount || s.grandTotal) || 0), 0);

    sales14Days.push({ date: dateStr, label, value: Math.round(dayTotal * 100) / 100 });
  }

  // 14-Day Purchases Inflow
  const purchases14Days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const dayUnits = stockHistory
      .filter((h) => {
        const entryDate = new Date(h.dateTime || h.timestamp).toISOString().slice(0, 10);
        return entryDate === dateStr && (h.actionType === 'ADD' || h.actionType === 'Add Stock' || Number(h.changedQuantity) > 0);
      })
      .reduce((sum, h) => sum + Math.max(0, Number(h.changedQuantity) || 0), 0);

    purchases14Days.push({ date: dateStr, label, value: dayUnits });
  }

  // Stock by Category
  const catMap = new Map();
  const medMap = new Map(medicines.map((m) => [m._id.toString(), m]));
  medicines.forEach((m) => {
    if (m.medicineId) medMap.set(m.medicineId, m);
  });

  batches.forEach((b) => {
    const parent = medMap.get(b.medicineId?.toString());
    const cat = parent ? parent.category : 'General';
    catMap.set(cat, (catMap.get(cat) || 0) + (Number(b.quantity) || 0));
  });

  const categoryStock = Array.from(catMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  const payload = {
    cards: {
      totalMedicines: medicines.length,
      totalStockUnits,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todaySales: Math.round(todayRevenue * 100) / 100,
      todaySalesCount,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      lowStock: lowStockCount,
      lowStockCount,
      expiredMedicines: expiredCount,
      expiredCount,
      nearExpiryMedicines: nearExpiryCount,
      nearExpiryCount,
    },
    charts: {
      sales14Days,
      purchases14Days,
      categoryStock,
    },
    tables: {
      recentSales: sales.slice(-5).reverse(),
      recentActivities: stockHistory,
    },
  };

  return ApiResponse.success(res, 'Dashboard metrics retrieved successfully', payload);
});

module.exports = {
  getDashboardSummary,
  getDashboardSalesChart,
  getDashboardPurchasesChart,
  getDashboardStockByCategory,
  getDashboardRecentSales,
  getDashboardAlerts,
  getDashboardRecentActivities,
  getDashboardData,
};
