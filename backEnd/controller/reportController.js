const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Filter sales by date range query
 */
const buildDateFilter = (dateRange) => {
  if (!dateRange || dateRange === 'all') return {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange === 'today') return { date: { $gte: todayStart } };
  if (dateRange === '7days') return { date: { $gte: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000) } };
  if (dateRange === '30days') return { date: { $gte: new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000) } };
  if (dateRange === 'this_month') return { date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
  return {};
};

/**
 * @desc    Get any of the 13 official pharmacy reports
 * @route   GET /api/v1/reports/:reportType
 * @access  Private ('reports.view')
 */
const getReport = asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const { dateRange = 'all' } = req.query;
  const dateFilter = buildDateFilter(dateRange);

  const settings = (await Settings.findOne()) || { lowStockThreshold: 15, nearExpiryDays: 60 };
  const now = new Date();

  switch (reportType) {
    case 'daily_sales': {
      const sales = await Sale.find(dateFilter);
      const dayMap = new Map();
      sales.forEach((s) => {
        const key = new Date(s.date).toISOString().slice(0, 10);
        if (!dayMap.has(key)) {
          dayMap.set(key, { date: key, invoicesCount: 0, unitsSold: 0, subtotal: 0, discount: 0, revenue: 0 });
        }
        const item = dayMap.get(key);
        item.invoicesCount += 1;
        item.subtotal += s.subtotal;
        item.discount += s.discountAmount;
        item.revenue += s.grandTotal;
        s.items?.forEach((i) => {
          item.unitsSold += i.quantity;
        });
      });
      const data = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      return ApiResponse.success(res, 'Daily Sales Report generated', data);
    }

    case 'weekly_sales': {
      const sales = await Sale.find(dateFilter);
      const weekMap = new Map();
      sales.forEach((s) => {
        const d = new Date(s.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff)).toISOString().slice(0, 10);
        const key = `Week of ${weekStart}`;

        if (!weekMap.has(key)) {
          weekMap.set(key, { week: key, invoicesCount: 0, unitsSold: 0, revenue: 0 });
        }
        const entry = weekMap.get(key);
        entry.invoicesCount += 1;
        entry.revenue += s.grandTotal;
        s.items?.forEach((i) => {
          entry.unitsSold += i.quantity;
        });
      });
      return ApiResponse.success(res, 'Weekly Sales Report generated', Array.from(weekMap.values()));
    }

    case 'monthly_sales': {
      const sales = await Sale.find();
      const monthMap = new Map();
      sales.forEach((s) => {
        const d = new Date(s.date);
        const key = d.toISOString().slice(0, 7);
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            month: d.toLocaleDateString([], { month: 'long', year: 'numeric' }),
            monthKey: key,
            invoicesCount: 0,
            unitsSold: 0,
            revenue: 0,
            discount: 0,
          });
        }
        const entry = monthMap.get(key);
        entry.invoicesCount += 1;
        entry.revenue += s.grandTotal;
        entry.discount += s.discountAmount;
        s.items?.forEach((i) => {
          entry.unitsSold += i.quantity;
        });
      });
      const data = Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      return ApiResponse.success(res, 'Monthly Sales Report generated', data);
    }

    case 'revenue': {
      const sales = await Sale.find(dateFilter).sort({ date: -1 });
      return ApiResponse.success(res, 'Revenue Report generated', sales);
    }

    case 'best_selling': {
      const sales = await Sale.find(dateFilter);
      const medMap = new Map();
      sales.forEach((s) => {
        s.items?.forEach((item) => {
          const key = item.medicineId || item.medicineName;
          if (!medMap.has(key)) {
            medMap.set(key, {
              id: key,
              name: item.medicineName,
              formula: item.formula || 'N/A',
              unitsSold: 0,
              revenue: 0,
              timesSold: 0,
            });
          }
          const entry = medMap.get(key);
          entry.unitsSold += item.quantity;
          entry.revenue += item.finalTotal;
          entry.timesSold += 1;
        });
      });
      const data = Array.from(medMap.values()).sort((a, b) => b.unitsSold - a.unitsSold);
      return ApiResponse.success(res, 'Best Selling Medicines Report generated', data);
    }

    case 'total_inventory': {
      const medicines = await Medicine.find().sort({ name: 1 });
      const batches = await Batch.find();
      const data = medicines.map((m) => {
        const medBatches = batches.filter((b) => b.medicineId === m.medicineId);
        const totalUnits = medBatches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          ...m.toObject(),
          batchesCount: medBatches.length,
          totalUnits,
          retailVal: totalUnits * m.sellingPrice,
        };
      });
      return ApiResponse.success(res, 'Total Inventory Report generated', data);
    }

    case 'low_stock': {
      const batches = await Batch.find({ quantity: { $gt: 0, $lte: settings.lowStockThreshold } });
      const meds = await Medicine.find();
      const medMap = new Map(meds.map((m) => [m.medicineId, m.name]));
      const data = batches.map((b) => ({
        ...b.toObject(),
        medicineName: medMap.get(b.medicineId) || 'Unknown',
        alertThreshold: settings.lowStockThreshold,
      }));
      return ApiResponse.success(res, 'Low Stock Report generated', data);
    }

    case 'out_of_stock': {
      const batches = await Batch.find({ quantity: { $lte: 0 } });
      const meds = await Medicine.find();
      const medMap = new Map(meds.map((m) => [m.medicineId, m]));
      const data = batches.map((b) => ({
        ...b.toObject(),
        medicineName: medMap.get(b.medicineId)?.name || 'Unknown',
        category: medMap.get(b.medicineId)?.category || 'General',
      }));
      return ApiResponse.success(res, 'Out of Stock Report generated', data);
    }

    case 'expired': {
      const batches = await Batch.find({ expiryDate: { $lt: now } });
      const meds = await Medicine.find();
      const medMap = new Map(meds.map((m) => [m.medicineId, m.name]));
      const data = batches.map((b) => ({
        ...b.toObject(),
        medicineName: medMap.get(b.medicineId) || 'Unknown',
        costLoss: b.quantity * b.purchasePrice,
      }));
      return ApiResponse.success(res, 'Expired Medicines Report generated', data);
    }

    case 'near_expiry': {
      const futureDate = new Date(now.getTime() + settings.nearExpiryDays * 24 * 60 * 60 * 1000);
      const batches = await Batch.find({
        expiryDate: { $gte: now, $lte: futureDate },
        quantity: { $gt: 0 },
      }).sort({ expiryDate: 1 });

      const meds = await Medicine.find();
      const medMap = new Map(meds.map((m) => [m.medicineId, m.name]));
      const data = batches.map((b) => {
        const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...b.toObject(),
          medicineName: medMap.get(b.medicineId) || 'Unknown',
          daysLeft,
        };
      });
      return ApiResponse.success(res, 'Near Expiry Report generated', data);
    }

    case 'medicine_sales': {
      const sales = await Sale.find(dateFilter);
      const map = new Map();
      sales.forEach((s) => {
        s.items?.forEach((i) => {
          const key = i.medicineId || i.medicineName;
          if (!map.has(key)) {
            map.set(key, {
              name: i.medicineName,
              batchNumber: i.batchNumber,
              unitsSold: 0,
              revenue: 0,
              lastSold: s.date,
            });
          }
          const item = map.get(key);
          item.unitsSold += i.quantity;
          item.revenue += i.finalTotal;
          if (new Date(s.date) > new Date(item.lastSold)) {
            item.lastSold = s.date;
          }
        });
      });
      const data = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      return ApiResponse.success(res, 'Medicine-wise Sales Report generated', data);
    }

    case 'category_stock': {
      const medicines = await Medicine.find();
      const batches = await Batch.find();
      const catMap = new Map();

      medicines.forEach((m) => {
        const cat = m.category || 'General';
        if (!catMap.has(cat)) {
          catMap.set(cat, { category: cat, medicinesCount: 0, totalUnits: 0, totalValuation: 0 });
        }
        catMap.get(cat).medicinesCount += 1;
      });

      const medMap = new Map(medicines.map((m) => [m.medicineId, m]));
      batches.forEach((b) => {
        const cat = medMap.get(b.medicineId)?.category || 'General';
        if (!catMap.has(cat)) {
          catMap.set(cat, { category: cat, medicinesCount: 0, totalUnits: 0, totalValuation: 0 });
        }
        const entry = catMap.get(cat);
        entry.totalUnits += b.quantity;
        entry.totalValuation += b.quantity * b.sellingPrice;
      });

      return ApiResponse.success(res, 'Category-wise Stock Report generated', Array.from(catMap.values()));
    }

    case 'batch_stock': {
      const batches = await Batch.find().sort({ expiryDate: 1 });
      const meds = await Medicine.find();
      const medMap = new Map(meds.map((m) => [m.medicineId, m.name]));
      const data = batches.map((b) => ({
        ...b.toObject(),
        medicineName: medMap.get(b.medicineId) || 'Unknown',
      }));
      return ApiResponse.success(res, 'Batch-wise Stock Report generated', data);
    }

    default:
      return ApiResponse.error(res, `Unknown report type: '${reportType}'`, ['Invalid reportType parameter'], 400);
  }
});

module.exports = {
  getReport,
};
