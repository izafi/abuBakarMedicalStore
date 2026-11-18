import { useState, useMemo, useCallback } from 'react';
import {
  Printer,
  FileBarChart2,
  Search,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useSales } from '../hooks/useSales';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { BATCH_STOCK_STATUS, APP_INFO } from '../utils/constants';

// The 13 required reports
const REPORT_TYPES = [
  { id: 'daily_sales', name: '1. Daily Sales Report', category: 'sales' },
  { id: 'weekly_sales', name: '2. Weekly Sales Report', category: 'sales' },
  { id: 'monthly_sales', name: '3. Monthly Sales Report', category: 'sales' },
  { id: 'revenue', name: '4. Revenue Report', category: 'sales' },
  { id: 'best_selling', name: '5. Best Selling Medicines', category: 'sales' },
  { id: 'total_inventory', name: '6. Total Inventory Report', category: 'inventory' },
  { id: 'low_stock', name: '7. Low Stock Report', category: 'inventory' },
  { id: 'out_of_stock', name: '8. Out of Stock Report', category: 'inventory' },
  { id: 'expired', name: '9. Expired Medicines Report', category: 'inventory' },
  { id: 'near_expiry', name: '10. Near Expiry Report', category: 'inventory' },
  { id: 'medicine_sales', name: '11. Medicine-wise Sales', category: 'sales' },
  { id: 'category_stock', name: '12. Category-wise Stock', category: 'inventory' },
  { id: 'batch_stock', name: '13. Batch-wise Stock', category: 'inventory' },
];

export const Reports = () => {
  const { sales } = useSales();
  const { medicines, batches, categories } = useInventory();
  const { settings } = useSettings();

  const [activeReportId, setActiveReportId] = useState('daily_sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // all, today, 7days, 30days, this_month

  // Date & Search Filtering helper
  const filterByDate = useCallback((dateStr) => {
    if (!dateStr || dateRange === 'all') return true;
    const itemDate = new Date(dateStr).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (dateRange === 'today') {
      return itemDate >= todayStart;
    }
    if (dateRange === '7days') {
      return itemDate >= todayStart - 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === '30days') {
      return itemDate >= todayStart - 30 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return itemDate >= monthStart;
    }
    return true;
  }, [dateRange]);

  const matchesSearch = useCallback((...fields) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return fields.some((f) => String(f || '').toLowerCase().includes(q));
  }, [searchQuery]);

  // 1. Daily Sales Report Data
  const dailySalesData = useMemo(() => {
    const dayMap = new Map();
    sales.filter((s) => filterByDate(s.date)).forEach((s) => {
      const dateKey = s.date.slice(0, 10);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          invoicesCount: 0,
          unitsSold: 0,
          subtotal: 0,
          discount: 0,
          revenue: 0,
        });
      }
      const entry = dayMap.get(dateKey);
      entry.invoicesCount += 1;
      entry.subtotal += Number(s.subtotal) || 0;
      entry.discount += Number(s.discountAmount) || 0;
      entry.revenue += Number(s.grandTotal) || 0;
      s.items?.forEach((i) => {
        entry.unitsSold += Number(i.quantity) || 0;
      });
    });

    return Array.from(dayMap.values())
      .filter((d) => matchesSearch(d.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, filterByDate, matchesSearch]);

  // 2. Weekly Sales Report Data
  const weeklySalesData = useMemo(() => {
    const weekMap = new Map();
    sales.filter((s) => filterByDate(s.date)).forEach((s) => {
      const d = new Date(s.date);
      // Determine week start date
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff)).toISOString().slice(0, 10);
      const weekLabel = `Week of ${weekStart}`;

      if (!weekMap.has(weekLabel)) {
        weekMap.set(weekLabel, {
          week: weekLabel,
          invoicesCount: 0,
          unitsSold: 0,
          revenue: 0,
        });
      }
      const entry = weekMap.get(weekLabel);
      entry.invoicesCount += 1;
      entry.revenue += Number(s.grandTotal) || 0;
      s.items?.forEach((i) => {
        entry.unitsSold += Number(i.quantity) || 0;
      });
    });

    return Array.from(weekMap.values()).filter((w) => matchesSearch(w.week));
  }, [sales, filterByDate, matchesSearch]);

  // 3. Monthly Sales Report Data
  const monthlySalesData = useMemo(() => {
    const monthMap = new Map();
    sales.forEach((s) => {
      const monthKey = s.date.slice(0, 7); // YYYY-MM
      if (!monthMap.has(monthKey)) {
        const d = new Date(s.date);
        monthMap.set(monthKey, {
          month: d.toLocaleDateString([], { month: 'long', year: 'numeric' }),
          monthKey,
          invoicesCount: 0,
          unitsSold: 0,
          revenue: 0,
          discount: 0,
        });
      }
      const entry = monthMap.get(monthKey);
      entry.invoicesCount += 1;
      entry.revenue += Number(s.grandTotal) || 0;
      entry.discount += Number(s.discountAmount) || 0;
      s.items?.forEach((i) => {
        entry.unitsSold += Number(i.quantity) || 0;
      });
    });

    return Array.from(monthMap.values())
      .filter((m) => matchesSearch(m.month, m.monthKey))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [sales, matchesSearch]);

  // 4. Revenue Report Data
  const revenueReportData = useMemo(() => {
    return sales
      .filter((s) => filterByDate(s.date))
      .filter((s) =>
        matchesSearch(
          s.invoiceNumber,
          s.patientName,
          s.customerName,
          s.employeeName,
          s.cashierName,
          s.paymentMethod
        )
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, filterByDate, matchesSearch]);

  // 5. Best Selling Medicines Data
  const bestSellingData = useMemo(() => {
    const medMap = new Map();
    sales.filter((s) => filterByDate(s.date)).forEach((s) => {
      s.items?.forEach((item) => {
        const key = item.medicineId || item.id || item.name;
        if (!medMap.has(key)) {
          medMap.set(key, {
            id: key,
            name: item.medicineName || item.name,
            formula: item.formula || item.genericName || 'N/A',
            unitsSold: 0,
            revenue: 0,
            timesSold: 0,
          });
        }
        const entry = medMap.get(key);
        entry.unitsSold += Number(item.quantity) || 0;
        entry.revenue += Number(item.finalTotal || item.total) || 0;
        entry.timesSold += 1;
      });
    });

    return Array.from(medMap.values())
      .filter((item) => matchesSearch(item.name, item.formula))
      .sort((a, b) => b.unitsSold - a.unitsSold);
  }, [sales, filterByDate, matchesSearch]);

  // 6. Total Inventory Report Data
  const totalInventoryData = useMemo(() => {
    return medicines
      .map((m) => {
        const medBatches = batches.filter((b) => b.medicineId === m.medicineId);
        const totalUnits = medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        const retailVal = totalUnits * (Number(m.sellingPrice) || 0);
        return {
          ...m,
          batchesCount: medBatches.length,
          totalUnits,
          retailVal,
        };
      })
      .filter((m) => matchesSearch(m.name, m.genericName, m.type, m.category));
  }, [medicines, batches, matchesSearch]);

  // 7. Low Stock Report Data
  const lowStockData = useMemo(() => {
    const threshold = settings.lowStockThreshold || 15;
    return batches
      .filter(
        (b) =>
          b.quantity > 0 &&
          (b.status === BATCH_STOCK_STATUS.LOW_STOCK || b.quantity <= threshold)
      )
      .filter((b) => matchesSearch(b.medicineName, b.batchNumber, b.location));
  }, [batches, settings, matchesSearch]);

  // 8. Out of Stock Report Data
  const outOfStockData = useMemo(() => {
    return batches
      .filter(
        (b) =>
          Number(b.quantity) <= 0 || b.status === BATCH_STOCK_STATUS.OUT_OF_STOCK
      )
      .filter((b) => matchesSearch(b.medicineName, b.batchNumber, b.category, b.location));
  }, [batches, matchesSearch]);

  // 9. Expired Medicines Report Data
  const expiredData = useMemo(() => {
    return batches
      .filter((b) => b.status === BATCH_STOCK_STATUS.EXPIRED || b.daysLeft < 0)
      .filter((b) => matchesSearch(b.medicineName, b.batchNumber, b.location));
  }, [batches, matchesSearch]);

  // 10. Near Expiry Report Data
  const nearExpiryData = useMemo(() => {
    return batches
      .filter((b) => b.isNearExpiry && b.quantity > 0 && b.daysLeft >= 0)
      .filter((b) => matchesSearch(b.medicineName, b.batchNumber, b.location))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [batches, matchesSearch]);

  // 11. Medicine-wise Sales Data
  const medicineWiseSalesData = useMemo(() => {
    const map = new Map();
    sales.filter((s) => filterByDate(s.date)).forEach((s) => {
      s.items?.forEach((i) => {
        const id = i.medicineId || i.id || i.name;
        if (!map.has(id)) {
          map.set(id, {
            name: i.medicineName || i.name,
            batchNumber: i.batchNumber || i.batchNo || 'Multiple',
            unitsSold: 0,
            revenue: 0,
            lastSold: s.date,
          });
        }
        const item = map.get(id);
        item.unitsSold += Number(i.quantity) || 0;
        item.revenue += Number(i.finalTotal || i.total) || 0;
        if (new Date(s.date) > new Date(item.lastSold)) {
          item.lastSold = s.date;
        }
      });
    });
    return Array.from(map.values())
      .filter((m) => matchesSearch(m.name, m.batchNumber))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales, filterByDate, matchesSearch]);

  // 12. Category-wise Stock Data
  const categoryWiseStockData = useMemo(() => {
    const catMap = new Map();
    categories.forEach((cat) => {
      catMap.set(cat, {
        category: cat,
        medicinesCount: 0,
        totalUnits: 0,
        totalValuation: 0,
      });
    });

    batches.forEach((b) => {
      const cat = b.category || 'General';
      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, medicinesCount: 0, totalUnits: 0, totalValuation: 0 });
      }
      const entry = catMap.get(cat);
      entry.totalUnits += Number(b.quantity) || 0;
      entry.totalValuation += (Number(b.quantity) || 0) * (Number(b.sellingPrice) || 0);
    });

    medicines.forEach((m) => {
      const cat = m.category || 'General';
      if (catMap.has(cat)) {
        catMap.get(cat).medicinesCount += 1;
      }
    });

    return Array.from(catMap.values()).filter((c) => matchesSearch(c.category));
  }, [categories, batches, medicines, matchesSearch]);

  // 13. Batch-wise Stock Data
  const batchWiseStockData = useMemo(() => {
    return batches.filter((b) =>
      matchesSearch(b.batchNumber, b.medicineName, b.location, b.status)
    );
  }, [batches, matchesSearch]);

  // Get current active report title
  const activeReport = REPORT_TYPES.find((r) => r.id === activeReportId) || REPORT_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-7 h-7 text-[#1C9A58]" />
            Pharmacy Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            13 operational, financial, and inventory audit reports calculated in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={Printer}
            onClick={() => window.print()}
          >
            Print Active Report
          </Button>
        </div>
      </div>

      {/* Report Selection Dropdown & Filters Bar */}
      <Card className="no-print">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Active Report Selector */}
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Select Pharmacy Report
            </label>
            <select
              value={activeReportId}
              onChange={(e) => setActiveReportId(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20"
            >
              <optgroup label="Sales & Financial Reports">
                {REPORT_TYPES.filter((r) => r.category === 'sales').map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Inventory & Stock Audits">
                {REPORT_TYPES.filter((r) => r.category === 'inventory').map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Time Period Filter
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#1C9A58]"
            >
              <option value="all">All Available Records</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          {/* Search within Report */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              Search Within Report
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rows..."
                className="w-full py-2 pl-8 pr-3 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1C9A58]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </Card>

      {/* Printable Report Header (Visible on print & on screen) */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#1C9A58] font-bold">
            {APP_INFO.NAME} &bull; OFFICIAL AUDIT
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-0.5">
            {activeReport.name}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generated on {formatDateTime(new Date().toISOString())} &bull; Filter: <strong className="capitalize">{dateRange.replace('_', ' ')}</strong>
          </p>
        </div>
        <div className="text-right">
          <Badge variant="primary" size="md">
            {activeReport.category === 'sales' ? 'Financial Audit' : 'Inventory Audit'}
          </Badge>
        </div>
      </div>

      {/* DYNAMIC REPORT TABLES & VIEWS */}

      {/* 1. DAILY SALES REPORT */}
      {activeReportId === 'daily_sales' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Invoices Count</th>
                  <th className="py-2.5 px-3 text-center">Units Dispensed</th>
                  <th className="py-2.5 px-3 text-right">Gross Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Discounts</th>
                  <th className="py-2.5 px-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailySalesData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No sales recorded for this date filter.
                    </td>
                  </tr>
                ) : (
                  dailySalesData.map((d) => (
                    <tr key={d.date} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{formatDate(d.date)}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-gray-700">{d.invoicesCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{d.unitsSold}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatCurrency(d.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">-{formatCurrency(d.discount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(d.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2. WEEKLY SALES REPORT */}
      {activeReportId === 'weekly_sales' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Week Period</th>
                  <th className="py-2.5 px-3 text-center">Invoices</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Net Revenue</th>
                  <th className="py-2.5 px-3 text-right">Avg / Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weeklySalesData.map((w, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{w.week}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">{w.invoicesCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{w.unitsSold}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C9A58]">{formatCurrency(w.revenue)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                      {formatCurrency(w.invoicesCount > 0 ? w.revenue / w.invoicesCount : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. MONTHLY SALES REPORT */}
      {activeReportId === 'monthly_sales' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-center">Invoices</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Discounts</th>
                  <th className="py-2.5 px-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlySalesData.map((m) => (
                  <tr key={m.monthKey} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{m.month}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">{m.invoicesCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{m.unitsSold}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600">-{formatCurrency(m.discount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. REVENUE REPORT */}
      {activeReportId === 'revenue' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Net Total</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revenueReportData.map((s) => (
                  <tr key={s.invoiceNumber} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{s.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-gray-500">{formatDate(s.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{s.patientName || s.customerName}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s.employeeName || s.cashierName}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(s.subtotal)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600">-{formatCurrency(s.discountAmount || 0)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(s.grandTotal)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge size="sm" variant={s.paymentMethod === 'Card' ? 'primary' : 'success'}>
                        {s.paymentMethod}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. BEST SELLING MEDICINES */}
      {activeReportId === 'best_selling' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Generic Formula</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-center">Transactions</th>
                  <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bestSellingData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-400">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-gray-500">{item.formula}</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-700">{item.unitsSold}</td>
                    <td className="py-2.5 px-3 text-center text-gray-600">{item.timesSold}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. TOTAL INVENTORY REPORT */}
      {activeReportId === 'total_inventory' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Batches</th>
                  <th className="py-2.5 px-3 text-center">Total Stock</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Retail Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {totalInventoryData.map((m) => (
                  <tr key={m.medicineId} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{m.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{m.type}</td>
                    <td className="py-2.5 px-3 text-gray-600">{m.category}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{m.batchesCount}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-900">{m.totalUnits}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(m.sellingPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C9A58]">{formatCurrency(m.retailVal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 7. LOW STOCK REPORT */}
      {activeReportId === 'low_stock' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3 text-center">Current Quantity</th>
                  <th className="py-2.5 px-3 text-center">Alert Threshold</th>
                  <th className="py-2.5 px-3">Rack & Shelf</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockData.map((b) => (
                  <tr key={b.batchId} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{b.medicineName}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">{b.batchNumber}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">{b.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-gray-400">&le; {settings.lowStockThreshold || 15}</td>
                    <td className="py-2.5 px-3 text-gray-600">{b.location}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="warning" size="sm">Low Stock</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 8. OUT OF STOCK REPORT */}
      {activeReportId === 'out_of_stock' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3">Storage Location</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {outOfStockData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No depleted out-of-stock items in active batches.
                    </td>
                  </tr>
                ) : (
                  outOfStockData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{b.medicineName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 text-gray-600">{b.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-red-600">0</td>
                      <td className="py-2.5 px-3 text-gray-600">{b.location}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="danger" size="sm">Out of Stock</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 9. EXPIRED MEDICINES REPORT */}
      {activeReportId === 'expired' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">Cost Loss</th>
                  <th className="py-2.5 px-3 text-center">Quarantine Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expiredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Zero expired batches found in the inventory registry.
                    </td>
                  </tr>
                ) : (
                  expiredData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{b.medicineName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-red-600">{b.quantity}</td>
                      <td className="py-2.5 px-3 font-mono text-red-700">{formatDate(b.expiryDate)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                        {formatCurrency(b.quantity * (Number(b.purchasePrice) || 0))}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="danger" size="sm">Expired &bull; Unsellable</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 10. NEAR EXPIRY REPORT */}
      {activeReportId === 'near_expiry' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3 text-center">Available Qty</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-center">Days Remaining</th>
                  <th className="py-2.5 px-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nearExpiryData.map((b) => (
                  <tr key={b.batchId} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{b.medicineName}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">{b.batchNumber}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">{b.quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-700">{formatDate(b.expiryDate)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {b.daysLeft} days
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{b.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 11. MEDICINE-WISE SALES REPORT */}
      {activeReportId === 'medicine_sales' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Net Revenue</th>
                  <th className="py-2.5 px-3 text-right">Last Dispensed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medicineWiseSalesData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{m.name}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{m.unitsSold}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(m.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500">{formatDate(m.lastSold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 12. CATEGORY-WISE STOCK REPORT */}
      {activeReportId === 'category_stock' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3 text-center">Medicines Count</th>
                  <th className="py-2.5 px-3 text-center">Total Stock Units</th>
                  <th className="py-2.5 px-3 text-right">Retail Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryWiseStockData.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{c.category}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">{c.medicinesCount}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-800">{c.totalUnits}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C9A58]">{formatCurrency(c.totalValuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 13. BATCH-WISE STOCK REPORT */}
      {activeReportId === 'batch_stock' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Purchase Price</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batchWiseStockData.map((b) => (
                  <tr key={b.batchId} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{b.batchNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{b.medicineName}</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono">{b.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-500">{formatCurrency(b.purchasePrice)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">{formatCurrency(b.sellingPrice)}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">{formatDate(b.expiryDate)}</td>
                    <td className="py-2.5 px-3 text-gray-600">{b.location}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        size="sm"
                        variant={
                          b.status === BATCH_STOCK_STATUS.EXPIRED
                            ? 'danger'
                            : b.status === BATCH_STOCK_STATUS.LOW_STOCK
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Reports;
