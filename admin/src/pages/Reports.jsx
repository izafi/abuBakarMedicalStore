import { useState, useMemo, useCallback } from 'react';
import {
  Printer,
  FileBarChart2,
  Search,
  TrendingUp,
  Receipt,
  Pill,
  BarChart3,
  Calendar,
  Layers,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import FilterDropdown from '../components/common/FilterDropdown';
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
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, sales, inventory

  const reportOptions = useMemo(
    () => [
      { label: 'Sales & Financial Reports', isHeader: true },
      ...REPORT_TYPES.filter((r) => r.category === 'sales').map((r) => ({
        label: r.name,
        value: r.id,
      })),
      { label: 'Inventory & Stock Audits', isHeader: true },
      ...REPORT_TYPES.filter((r) => r.category === 'inventory').map((r) => ({
        label: r.name,
        value: r.id,
      })),
    ],
    []
  );

  const dateRangeOptions = useMemo(
    () => [
      { label: 'All Available Records', value: 'all' },
      { label: 'Today Only', value: 'today' },
      { label: 'Last 7 Days', value: '7days' },
      { label: 'Last 30 Days', value: '30days' },
      { label: 'This Month', value: 'this_month' },
    ],
    []
  );

  // High-level KPI summary calculations
  const kpiStats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    const totalUnits = sales.reduce((sum, s) => {
      const itemsQty = s.items?.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0) || 0;
      return sum + itemsQty;
    }, 0);
    const totalDiscounts = sales.reduce((sum, s) => sum + (Number(s.discountAmount) || 0), 0);

    return {
      totalRevenue,
      invoicesCount: sales.length,
      totalUnits,
      totalDiscounts,
    };
  }, [sales]);

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

  // Filtered reports for dropdown based on category tab
  const availableReports = useMemo(() => {
    if (categoryFilter === 'all') return REPORT_TYPES;
    return REPORT_TYPES.filter((r) => r.category === categoryFilter);
  }, [categoryFilter]);

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
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <FileBarChart2 className="w-4 h-4 text-[#1C9A58]" />
            </div>
            Pharmacy Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-black font-semibold mt-0.5">
            13 operational, financial, and inventory audit reports calculated in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-black bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-black" />
            Print Active Report
          </button>
        </div>
      </div>

      {/* 4 State KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 no-print">
        {/* Card 1: Gross Revenue */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-2.5 sm:p-3 rounded-xl border border-emerald-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider">
              GROSS REVENUE
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1C9A58]" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="text-base sm:text-xl font-bold text-black font-mono tracking-tight leading-tight">
              {formatCurrency(kpiStats.totalRevenue)}
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-black mt-0.5">
              Lifetime sales revenue
            </p>
          </div>
        </div>

        {/* Card 2: Invoices Audited */}
        <div className="bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-white p-2.5 sm:p-3 rounded-xl border border-teal-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider">
              INVOICES AUDITED
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="text-base sm:text-xl font-bold text-black font-mono tracking-tight leading-tight">
              {kpiStats.invoicesCount} <span className="text-xs font-bold text-black">Invoices</span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-black mt-0.5">
              Billed transactions
            </p>
          </div>
        </div>

        {/* Card 3: Units Dispensed */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-2.5 sm:p-3 rounded-xl border border-blue-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider">
              UNITS DISPENSED
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="text-base sm:text-xl font-bold text-black font-mono tracking-tight leading-tight">
              {kpiStats.totalUnits} <span className="text-xs font-bold text-black">Units</span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-black mt-0.5">
              Across sold batches
            </p>
          </div>
        </div>

        {/* Card 4: Reports Registry */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white p-2.5 sm:p-3 rounded-xl border border-purple-500/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider">
              AUDIT REGISTRY
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <div className="text-base sm:text-xl font-bold text-black font-mono tracking-tight leading-tight">
              13 <span className="text-xs font-bold text-black">Reports</span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-black mt-0.5">
              Live automated queries
            </p>
          </div>
        </div>
      </div>

      {/* Report Selection Dropdown & Filters Bar */}
      <Card className="no-print">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Active Report Selector */}
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                Select Pharmacy Report
              </label>
              <FilterDropdown
                value={activeReportId}
                onChange={(val) => setActiveReportId(val)}
                options={reportOptions}
                placeholder="Select Pharmacy Report"
                buttonClassName="h-10 text-xs sm:text-sm font-bold bg-slate-50 hover:bg-white focus:bg-white border-slate-300 rounded-xl"
                className="w-full"
              />
            </div>

            {/* Date Filter */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                Time Period Filter
              </label>
              <FilterDropdown
                value={dateRange}
                onChange={(val) => setDateRange(val)}
                options={dateRangeOptions}
                placeholder="Time Period Filter"
                buttonClassName="h-10 text-xs sm:text-sm font-bold bg-slate-50 hover:bg-white focus:bg-white border-slate-300 rounded-xl"
                className="w-full"
              />
            </div>

            {/* Search within Report */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                Search Within Report
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rows..."
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-slate-50 hover:bg-white focus:bg-white text-black shadow-xs focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
                <Search className="w-4 h-4 text-black absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Category Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-200">
            <span className="text-[11px] font-bold text-black uppercase tracking-wider mr-1">
              CATEGORY:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-black border border-slate-200'
              }`}
            >
              All Reports ({REPORT_TYPES.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('sales');
                if (activeReport.category !== 'sales') {
                  setActiveReportId('daily_sales');
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'sales'
                  ? 'bg-[#1C9A58] text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-black border border-emerald-200'
              }`}
            >
              Sales & Financial (5)
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('inventory');
                if (activeReport.category !== 'inventory') {
                  setActiveReportId('total_inventory');
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'inventory'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 hover:bg-blue-100 text-black border border-blue-200'
              }`}
            >
              Inventory & Stock (8)
            </button>
          </div>
        </div>
      </Card>

      {/* Printable Report Header (Visible on print & on screen) */}
      <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#1C9A58] font-bold flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#1C9A58] animate-pulse"></span>
            {settings?.storeName || APP_INFO.NAME} &bull; OFFICIAL AUDIT
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-black mt-0.5">
            {activeReport.name}
          </h2>
          <p className="text-xs text-black font-semibold mt-0.5">
            Generated on {formatDateTime(new Date().toISOString())} &bull; Filter:{' '}
            <span className="capitalize font-bold text-[#1C9A58]">
              {dateRange.replace('_', ' ')}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              activeReport.category === 'sales'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}
          >
            {activeReport.category === 'sales' ? 'Financial Audit' : 'Inventory Audit'}
          </span>
        </div>
      </div>

      {/* DYNAMIC REPORT TABLES & VIEWS */}

      {/* 1. DAILY SALES REPORT */}
      {activeReportId === 'daily_sales' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Invoices Count</th>
                  <th className="py-2.5 px-3 text-center">Units Dispensed</th>
                  <th className="py-2.5 px-3 text-right">Gross Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Discounts</th>
                  <th className="py-2.5 px-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailySalesData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-black font-bold">
                      No sales recorded for this date filter.
                    </td>
                  </tr>
                ) : (
                  dailySalesData.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{formatDate(d.date)}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-black">{d.invoicesCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-black">{d.unitsSold}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">{formatCurrency(d.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">-{formatCurrency(d.discount)}</td>
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
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Week Period</th>
                  <th className="py-2.5 px-3 text-center">Invoices</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Net Revenue</th>
                  <th className="py-2.5 px-3 text-right">Avg / Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklySalesData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-black font-bold">
                      No weekly sales records found.
                    </td>
                  </tr>
                ) : (
                  weeklySalesData.map((w, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{w.week}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-black">{w.invoicesCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-black">{w.unitsSold}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C9A58]">{formatCurrency(w.revenue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">
                        {formatCurrency(w.invoicesCount > 0 ? w.revenue / w.invoicesCount : 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. MONTHLY SALES REPORT */}
      {activeReportId === 'monthly_sales' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-center">Invoices</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Discounts</th>
                  <th className="py-2.5 px-3 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlySalesData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-black font-bold">
                      No monthly records found.
                    </td>
                  </tr>
                ) : (
                  monthlySalesData.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{m.month}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-black">{m.invoicesCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-black">{m.unitsSold}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">-{formatCurrency(m.discount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(m.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. REVENUE REPORT */}
      {activeReportId === 'revenue' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
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
              <tbody className="divide-y divide-slate-100">
                {revenueReportData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-black font-bold">
                      No transactions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  revenueReportData.map((s) => (
                    <tr key={s.invoiceNumber} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{s.invoiceNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{formatDate(s.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-black">{s.patientName || s.customerName}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{s.employeeName || s.cashierName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">{formatCurrency(s.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">-{formatCurrency(s.discountAmount || 0)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(s.grandTotal)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            s.paymentMethod === 'Card'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {s.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. BEST SELLING MEDICINES */}
      {activeReportId === 'best_selling' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Generic Formula</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-center">Transactions</th>
                  <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bestSellingData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-black font-bold">
                      No sales records found.
                    </td>
                  </tr>
                ) : (
                  bestSellingData.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : idx === 2
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'text-black'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-black">{item.name}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{item.formula}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-800 bg-emerald-50/50">
                        {item.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-black">{item.timesSold}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. TOTAL INVENTORY REPORT */}
      {activeReportId === 'total_inventory' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
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
              <tbody className="divide-y divide-slate-100">
                {totalInventoryData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-black font-bold">
                      No medicines match the inventory search criteria.
                    </td>
                  </tr>
                ) : (
                  totalInventoryData.map((m) => (
                    <tr key={m.medicineId} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{m.name}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{m.type}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{m.category}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-black">{m.batchesCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-black">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {m.totalUnits} units
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">{formatCurrency(m.sellingPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C9A58]">{formatCurrency(m.retailVal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 7. LOW STOCK REPORT */}
      {activeReportId === 'low_stock' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3 text-center">Current Quantity</th>
                  <th className="py-2.5 px-3 text-center">Alert Threshold</th>
                  <th className="py-2.5 px-3">Rack & Shelf</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-black font-bold">
                      No low stock batches currently below alert threshold.
                    </td>
                  </tr>
                ) : (
                  lowStockData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{b.medicineName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-800 font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          {b.quantity} units
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-black">&le; {settings.lowStockThreshold || 15}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{b.location}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 8. OUT OF STOCK REPORT */}
      {activeReportId === 'out_of_stock' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3">Storage Location</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outOfStockData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-black font-bold">
                      No depleted out-of-stock items in active batches.
                    </td>
                  </tr>
                ) : (
                  outOfStockData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{b.medicineName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{b.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-red-700 font-mono">0</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{b.location}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          Out of Stock
                        </span>
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
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">Cost Loss</th>
                  <th className="py-2.5 px-3 text-center">Quarantine Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-black font-bold">
                      Zero expired batches found in the inventory registry.
                    </td>
                  </tr>
                ) : (
                  expiredData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{b.medicineName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-red-700 font-mono">{b.quantity}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-700">{formatDate(b.expiryDate)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700">
                        {formatCurrency(b.quantity * (Number(b.purchasePrice) || 0))}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-900 border border-red-300">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Expired &bull; Unsellable
                        </span>
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
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3 text-center">Available Qty</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-center">Days Remaining</th>
                  <th className="py-2.5 px-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nearExpiryData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-black font-bold">
                      No medicines near expiration within the alert window.
                    </td>
                  </tr>
                ) : (
                  nearExpiryData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{b.medicineName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-800 font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          {b.quantity} units
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{formatDate(b.expiryDate)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          {b.daysLeft} days
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-black">{b.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 11. MEDICINE-WISE SALES REPORT */}
      {activeReportId === 'medicine_sales' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Net Revenue</th>
                  <th className="py-2.5 px-3 text-right">Last Dispensed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicineWiseSalesData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-black font-bold">
                      No medicine-wise sales records found.
                    </td>
                  </tr>
                ) : (
                  medicineWiseSalesData.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{m.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">
                        {m.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F3A2C]">{formatCurrency(m.revenue)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-black">{formatDate(m.lastSold)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 12. CATEGORY-WISE STOCK REPORT */}
      {activeReportId === 'category_stock' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3 text-center">Medicines Count</th>
                  <th className="py-2.5 px-3 text-center">Total Stock Units</th>
                  <th className="py-2.5 px-3 text-right">Retail Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryWiseStockData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-black font-bold">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categoryWiseStockData.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-bold text-black">{c.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-black">{c.medicinesCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-black">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {c.totalUnits} units
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1C9A58]">{formatCurrency(c.totalValuation)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 13. BATCH-WISE STOCK REPORT */}
      {activeReportId === 'batch_stock' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
            <table className="w-full min-w-[650px] lg:min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none sticky top-0 z-10">
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
              <tbody className="divide-y divide-slate-100">
                {batchWiseStockData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-black font-bold">
                      No batches match the search criteria.
                    </td>
                  </tr>
                ) : (
                  batchWiseStockData.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-black">{b.medicineName}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-black">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {b.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">{formatCurrency(b.purchasePrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">{formatCurrency(b.sellingPrice)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-black">{formatDate(b.expiryDate)}</td>
                      <td className="py-2.5 px-3 font-semibold text-black">{b.location}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.status === BATCH_STOCK_STATUS.EXPIRED
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : b.status === BATCH_STOCK_STATUS.LOW_STOCK
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Reports;
