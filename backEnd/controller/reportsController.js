const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const StockHistory = require('../models/StockHistory');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Standard Date Range Filter
 */
const buildDateRangeQuery = (filterType, dateRange, startDate, endDate) => {
  const mode = (filterType || dateRange || '').toLowerCase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (mode === 'daily' || mode === 'today') {
    return { $gte: todayStart };
  } else if (mode === 'yesterday') {
    const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    return { $gte: yestStart, $lt: todayStart };
  } else if (mode === 'weekly' || mode === '7days' || mode === 'week') {
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { $gte: weekStart };
  } else if (mode === 'monthly' || mode === '30days' || mode === 'this_month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { $gte: monthStart };
  } else if (mode === 'yearly' || mode === 'this_year') {
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { $gte: yearStart };
  }

  if (startDate || endDate) {
    const range = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    return range;
  }

  return null;
};

/**
 * @desc    Generate Sales Report (Daily, Weekly, Monthly, or Custom Date Range)
 * @route   GET /api/v1/reports/sales
 * @access  Private ('reports.view')
 */
const getSalesReport = asyncHandler(async (req, res) => {
  const {
    filterType,
    dateRange,
    startDate,
    endDate,
    employee,
    employeeId,
    paymentMethod,
    category,
    medicine,
  } = req.query;

  const matchFilter = { status: 'Completed' };

  const dateQuery = buildDateRangeQuery(filterType, dateRange, startDate, endDate);
  if (dateQuery) {
    matchFilter.saleDateTime = dateQuery;
  }

  if (employee && employee !== 'all') {
    matchFilter.employeeName = { $regex: new RegExp(`^${employee.trim()}$`, 'i') };
  }
  if (employeeId && employeeId !== 'all') {
    matchFilter.employeeId = employeeId.trim();
  }
  if (paymentMethod && paymentMethod !== 'all') {
    matchFilter.paymentMethod = paymentMethod;
  }

  const sales = await Sale.find(matchFilter).sort({ saleDateTime: -1 });

  let totalInvoices = 0;
  let totalUnitsSold = 0;
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalRevenue = 0;
  let cashRevenue = 0;
  let cardRevenue = 0;

  // Group by day for timeline chart / table
  const timelineMap = new Map();

  sales.forEach((s) => {
    totalInvoices += 1;
    totalSubtotal += s.subtotal || 0;
    totalDiscount += s.totalDiscount || s.discountAmount || 0;
    totalRevenue += s.finalAmount || s.grandTotal || 0;

    if (s.paymentMethod === 'Cash') cashRevenue += s.finalAmount || 0;
    if (s.paymentMethod === 'Card') cardRevenue += s.finalAmount || 0;

    let saleUnits = 0;
    s.items?.forEach((item) => {
      saleUnits += Number(item.quantity) || 0;
    });
    totalUnitsSold += saleUnits;

    const dateKey = new Date(s.saleDateTime || s.date).toISOString().slice(0, 10);
    if (!timelineMap.has(dateKey)) {
      timelineMap.set(dateKey, {
        date: dateKey,
        invoicesCount: 0,
        unitsSold: 0,
        subtotal: 0,
        discount: 0,
        revenue: 0,
      });
    }
    const tEntry = timelineMap.get(dateKey);
    tEntry.invoicesCount += 1;
    tEntry.unitsSold += saleUnits;
    tEntry.subtotal += s.subtotal || 0;
    tEntry.discount += s.totalDiscount || 0;
    tEntry.revenue += s.finalAmount || 0;
  });

  const timeline = Array.from(timelineMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  return ApiResponse.success(res, 'Sales report generated successfully', {
    summary: {
      totalInvoices,
      totalUnitsSold,
      totalSubtotal: Math.round(totalSubtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      cashRevenue: Math.round(cashRevenue * 100) / 100,
      cardRevenue: Math.round(cardRevenue * 100) / 100,
    },
    timeline,
    sales,
  });
});

/**
 * @desc    Generate Financial Revenue Report
 * @route   GET /api/v1/reports/revenue
 * @access  Private ('reports.view')
 */
const getRevenueReport = asyncHandler(async (req, res) => {
  const { filterType, dateRange, startDate, endDate, paymentMethod, employee } = req.query;

  const matchFilter = { status: 'Completed' };
  const dateQuery = buildDateRangeQuery(filterType, dateRange, startDate, endDate);
  if (dateQuery) {
    matchFilter.saleDateTime = dateQuery;
  }
  if (paymentMethod && paymentMethod !== 'all') {
    matchFilter.paymentMethod = paymentMethod;
  }
  if (employee && employee !== 'all') {
    matchFilter.employeeName = { $regex: new RegExp(`^${employee.trim()}$`, 'i') };
  }

  const sales = await Sale.find(matchFilter).sort({ saleDateTime: -1 });

  let grossRevenue = 0;
  let totalDiscounts = 0;
  let netRevenue = 0;
  let cashSales = 0;
  let cardSales = 0;

  const monthlyAgg = new Map();

  sales.forEach((s) => {
    grossRevenue += s.subtotal || 0;
    totalDiscounts += s.totalDiscount || s.discountAmount || 0;
    netRevenue += s.finalAmount || s.grandTotal || 0;

    if (s.paymentMethod === 'Cash') cashSales += s.finalAmount || 0;
    if (s.paymentMethod === 'Card') cardSales += s.finalAmount || 0;

    const monthKey = new Date(s.saleDateTime || s.date).toISOString().slice(0, 7);
    if (!monthlyAgg.has(monthKey)) {
      monthlyAgg.set(monthKey, {
        month: monthKey,
        grossRevenue: 0,
        discounts: 0,
        netRevenue: 0,
        count: 0,
      });
    }
    const m = monthlyAgg.get(monthKey);
    m.grossRevenue += s.subtotal || 0;
    m.discounts += s.totalDiscount || 0;
    m.netRevenue += s.finalAmount || 0;
    m.count += 1;
  });

  const breakdown = Array.from(monthlyAgg.values()).sort((a, b) => b.month.localeCompare(a.month));

  return ApiResponse.success(res, 'Revenue report generated successfully', {
    summary: {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      cashSales: Math.round(cashSales * 100) / 100,
      cardSales: Math.round(cardSales * 100) / 100,
      totalSalesCount: sales.length,
    },
    monthlyBreakdown: breakdown,
  });
});

/**
 * @desc    Generate Best Selling Medicines Report
 * @route   GET /api/v1/reports/best-selling-medicines
 * @access  Private ('reports.view')
 */
const getBestSellingMedicinesReport = asyncHandler(async (req, res) => {
  const { filterType, dateRange, startDate, endDate, limit = 10, category } = req.query;

  const matchFilter = { status: 'Completed' };
  const dateQuery = buildDateRangeQuery(filterType, dateRange, startDate, endDate);
  if (dateQuery) {
    matchFilter.saleDateTime = dateQuery;
  }

  // Retrieve matching completed sales
  const sales = await Sale.find(matchFilter).select('items saleDateTime');

  const medicineSalesMap = new Map();

  sales.forEach((s) => {
    s.items?.forEach((item) => {
      const key = item.medicineId || item.medicineName;
      if (!medicineSalesMap.has(key)) {
        medicineSalesMap.set(key, {
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          genericName: item.genericName || '',
          strength: item.strength || '',
          unitsSold: 0,
          totalRevenue: 0,
          salesCount: 0,
        });
      }
      const m = medicineSalesMap.get(key);
      m.unitsSold += Number(item.quantity) || 0;
      m.totalRevenue += Number(item.total || item.finalTotal) || 0;
      m.salesCount += 1;
    });
  });

  // Fetch current batch stock to show remaining inventory alongside best-sellers
  const batches = await Batch.find().select('medicineId quantity');
  const currentStockMap = new Map();
  batches.forEach((b) => {
    const k = b.medicineId?.toString();
    currentStockMap.set(k, (currentStockMap.get(k) || 0) + (Number(b.quantity) || 0));
  });

  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const sortedResults = Array.from(medicineSalesMap.values())
    .map((item) => ({
      ...item,
      totalRevenue: Math.round(item.totalRevenue * 100) / 100,
      currentStock: currentStockMap.get(item.medicineId?.toString()) || 0,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, limitNum);

  return ApiResponse.success(res, 'Best selling medicines report generated', {
    count: sortedResults.length,
    ranking: sortedResults,
  });
});

/**
 * @desc    Generate Complete Inventory Valuation & Stock Status Report
 * @route   GET /api/v1/reports/inventory
 * @access  Private ('reports.view')
 */
const getInventoryReport = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const settings = (await Settings.findOne()) || { lowStockThreshold: 15, nearExpiryDays: 60 };
  const now = new Date();

  const medFilter = { isActive: { $ne: false } };
  if (category && category !== 'all') {
    medFilter.category = category;
  }

  const medicines = await Medicine.find(medFilter);
  const batches = await Batch.find();

  const medMap = new Map(medicines.map((m) => [m._id.toString(), m]));
  medicines.forEach((m) => {
    if (m.medicineId) medMap.set(m.medicineId, m);
  });

  let totalMedicines = medicines.length;
  let totalBatches = 0;
  let totalStockUnits = 0;
  let totalPurchaseValuation = 0;
  let totalSellingValuation = 0;

  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiredCount = 0;
  let nearExpiryCount = 0;

  const batchReportList = [];

  batches.forEach((b) => {
    const parent = medMap.get(b.medicineId?.toString());
    if (!parent && category && category !== 'all') return; // Filtered out by category

    totalBatches += 1;
    const qty = Number(b.quantity) || 0;
    const pPrice = Number(b.purchasePrice) || 0;
    const sPrice = Number(b.sellingPrice) || 0;
    const expiry = new Date(b.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    totalStockUnits += qty;
    totalPurchaseValuation += qty * pPrice;
    totalSellingValuation += qty * sPrice;

    let status = 'In Stock';
    if (daysLeft < 0) {
      status = 'Expired';
      expiredCount += 1;
    } else if (qty <= 0) {
      status = 'Out of Stock';
      outOfStockCount += 1;
    } else if (daysLeft <= settings.nearExpiryDays) {
      status = 'Near Expiry';
      nearExpiryCount += 1;
    } else if (qty <= settings.lowStockThreshold) {
      status = 'Low Stock';
      lowStockCount += 1;
    } else {
      inStockCount += 1;
    }

    batchReportList.push({
      batchId: b.batchId,
      batchNumber: b.batchNumber,
      medicineName: parent?.name || 'Unknown',
      category: parent?.category || 'General',
      quantity: qty,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      purchaseValuation: Math.round(qty * pPrice * 100) / 100,
      sellingValuation: Math.round(qty * sPrice * 100) / 100,
      expiryDate: b.expiryDate,
      daysToExpiry: daysLeft,
      status,
      rack: b.rack || parent?.rack || 'N/A',
      shelf: b.shelf || parent?.shelf || 'N/A',
    });
  });

  const potentialGrossProfit = totalSellingValuation - totalPurchaseValuation;

  return ApiResponse.success(res, 'Inventory report generated successfully', {
    summary: {
      totalMedicines,
      totalBatches,
      totalStockUnits,
      purchaseValuation: Math.round(totalPurchaseValuation * 100) / 100,
      sellingValuation: Math.round(totalSellingValuation * 100) / 100,
      potentialGrossProfit: Math.round(potentialGrossProfit * 100) / 100,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      expiredCount,
      nearExpiryCount,
    },
    batches: batchReportList,
  });
});

/**
 * @desc    Generate Stock History Audit Report
 * @route   GET /api/v1/reports/stock-history
 * @access  Private ('reports.view')
 */
const getStockHistoryReport = asyncHandler(async (req, res) => {
  const { actionType, employee, employeeId, startDate, endDate, medicineId, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (actionType && actionType !== 'all') {
    filter.actionType = actionType;
  }
  if (employee && employee !== 'all') {
    filter.employeeName = { $regex: new RegExp(`^${employee.trim()}$`, 'i') };
  }
  if (employeeId && employeeId !== 'all') {
    filter.employeeId = employeeId.trim();
  }
  if (medicineId) {
    filter.medicineId = medicineId;
  }

  const dateQuery = buildDateRangeQuery(null, null, startDate, endDate);
  if (dateQuery) {
    filter.$or = [{ dateTime: dateQuery }, { timestamp: dateQuery }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const total = await StockHistory.countDocuments(filter);
  const history = await StockHistory.find(filter)
    .sort({ dateTime: -1, timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  // Summary aggregation
  const agg = await StockHistory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        totalUnits: { $sum: '$changedQuantity' },
      },
    },
  ]);

  return ApiResponse.success(res, 'Stock history audit report generated', {
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    actionBreakdown: agg,
    records: history,
  });
});

/**
 * @desc    Generate Category-wise Inventory & Sales Report
 * @route   GET /api/v1/reports/category
 * @access  Private ('reports.view')
 */
const getCategoryReport = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find().select('_id medicineId name category');
  const batches = await Batch.find().select('medicineId quantity purchasePrice sellingPrice');
  const sales = await Sale.find({ status: 'Completed' }).select('items');

  const medCatMap = new Map();
  const categoryStats = new Map();

  medicines.forEach((m) => {
    const cat = m.category || 'General';
    medCatMap.set(m._id.toString(), cat);
    if (m.medicineId) medCatMap.set(m.medicineId, cat);

    if (!categoryStats.has(cat)) {
      categoryStats.set(cat, {
        category: cat,
        medicinesCount: 0,
        totalStockUnits: 0,
        purchaseValuation: 0,
        sellingValuation: 0,
        unitsSold: 0,
        revenue: 0,
      });
    }
    categoryStats.get(cat).medicinesCount += 1;
  });

  // Calculate stock units and valuations per category
  batches.forEach((b) => {
    const cat = medCatMap.get(b.medicineId?.toString()) || 'General';
    if (!categoryStats.has(cat)) {
      categoryStats.set(cat, {
        category: cat,
        medicinesCount: 0,
        totalStockUnits: 0,
        purchaseValuation: 0,
        sellingValuation: 0,
        unitsSold: 0,
        revenue: 0,
      });
    }
    const stat = categoryStats.get(cat);
    const qty = Number(b.quantity) || 0;
    stat.totalStockUnits += qty;
    stat.purchaseValuation += qty * (Number(b.purchasePrice) || 0);
    stat.sellingValuation += qty * (Number(b.sellingPrice) || 0);
  });

  // Calculate sold units and revenue per category
  sales.forEach((s) => {
    s.items?.forEach((item) => {
      const cat = medCatMap.get(item.medicineId?.toString()) || 'General';
      if (categoryStats.has(cat)) {
        const stat = categoryStats.get(cat);
        stat.unitsSold += Number(item.quantity) || 0;
        stat.revenue += Number(item.total || item.finalTotal) || 0;
      }
    });
  });

  const categories = Array.from(categoryStats.values()).map((c) => ({
    ...c,
    purchaseValuation: Math.round(c.purchaseValuation * 100) / 100,
    sellingValuation: Math.round(c.sellingValuation * 100) / 100,
    revenue: Math.round(c.revenue * 100) / 100,
  }));

  return ApiResponse.success(res, 'Category analysis report generated', categories);
});

/**
 * @desc    Backward-compatible generic report handler for /:reportType
 * @route   GET /api/v1/reports/:reportType
 * @access  Private ('reports.view')
 */
const getGenericReport = asyncHandler(async (req, res, next) => {
  const { reportType } = req.params;

  switch (reportType) {
    case 'sales':
      return getSalesReport(req, res);
    case 'revenue':
      return getRevenueReport(req, res);
    case 'best-selling-medicines':
    case 'best_selling':
      return getBestSellingMedicinesReport(req, res);
    case 'inventory':
    case 'total_inventory':
      return getInventoryReport(req, res);
    case 'stock-history':
      return getStockHistoryReport(req, res);
    case 'category':
    case 'category_stock':
      return getCategoryReport(req, res);
    case 'daily_sales':
      req.query.filterType = 'daily';
      return getSalesReport(req, res);
    case 'weekly_sales':
      req.query.filterType = 'weekly';
      return getSalesReport(req, res);
    case 'monthly_sales':
      req.query.filterType = 'monthly';
      return getSalesReport(req, res);
    default:
      return ApiResponse.error(res, `Report type '${reportType}' not recognized`, ['Invalid report type'], 404);
  }
});

module.exports = {
  getSalesReport,
  getRevenueReport,
  getBestSellingMedicinesReport,
  getInventoryReport,
  getStockHistoryReport,
  getCategoryReport,
  getGenericReport,
};
