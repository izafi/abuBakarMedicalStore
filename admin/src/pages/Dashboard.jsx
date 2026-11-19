import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Clock,
  ArrowRight,
  ShieldAlert,
  Activity,
  Eye,
  Tag,
  DollarSign,
  PackageCheck,
  Plus,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { AreaTrendChart } from '../components/charts/AreaTrendChart';
import { TrendChart } from '../components/charts/TrendChart';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { BatchForm } from '../components/batches/BatchForm';
import { MedicineDetails } from '../components/medicines/MedicineDetails';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BATCH_STOCK_STATUS } from '../utils/constants';

export const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { medicines, batches, stockHistory, addBatch, updateBatch, adjustBatchStock, deleteBatch } = useInventory();
  const { sales } = useSales();
  const { settings } = useSettings();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [restockMedicine, setRestockMedicine] = useState(null);

  // 1. DYNAMIC SUMMARY CALCULATIONS
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todaySalesRevenue = 0;
    let todaySalesCount = 0;
    let monthRevenue = 0;

    sales.forEach((s) => {
      const saleDate = new Date(s.date);
      const amount = Number(s.grandTotal) || 0;

      if (saleDate.toDateString() === todayStr) {
        todaySalesRevenue += amount;
        todaySalesCount += 1;
      }

      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        monthRevenue += amount;
      }
    });

    const totalStockUnits = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    const lowStockCount = batches.filter(
      (b) => b.status === BATCH_STOCK_STATUS.LOW_STOCK || Number(b.quantity) <= (settings.lowStockThreshold || 15)
    ).length;

    const expiredCount = batches.filter(
      (b) => b.status === BATCH_STOCK_STATUS.EXPIRED || (b.isExpired && Number(b.quantity) > 0)
    ).length;

    return {
      totalMedicines: medicines.length,
      totalStockUnits,
      todayRevenue: todaySalesRevenue,
      todayCount: todaySalesCount,
      monthlyRevenue: monthRevenue,
      lowStockCount,
      expiredCount,
    };
  }, [medicines, batches, sales, settings]);

  // 2. 14-DAY SALES CHART DATA
  const sales14DaysData = useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const dayTotal = sales
        .filter((s) => s.date?.slice(0, 10) === dateStr)
        .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

      days.push({
        date: dateStr,
        label,
        value: dayTotal,
      });
    }
    return days;
  }, [sales]);

  // 3. 14-DAY PURCHASES / STOCK INFLOW CHART DATA
  const purchases14DaysData = useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const dayUnits = stockHistory
        .filter((h) => {
          const entryDate = (h.timestamp || h.createdAt || '').slice(0, 10);
          return (
            entryDate === dateStr &&
            (h.actionType === 'Add Stock' || Number(h.changedQuantity) > 0)
          );
        })
        .reduce((sum, h) => sum + Math.max(0, Number(h.changedQuantity) || 0), 0);

      days.push({
        date: dateStr,
        label,
        value: dayUnits,
      });
    }
    return days;
  }, [stockHistory]);

  // 4. STOCK BY CATEGORY DATA
  const categoryStockData = useMemo(() => {
    const catMap = new Map();

    batches.forEach((b) => {
      const cat = b.category || 'General';
      const qty = Number(b.quantity) || 0;
      catMap.set(cat, (catMap.get(cat) || 0) + qty);
    });

    return Array.from(catMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }, [batches]);

  // 5. TABLE: Low Stock Medicines
  const lowStockBatches = useMemo(() => {
    return batches
      .filter((b) => b.status === BATCH_STOCK_STATUS.LOW_STOCK || b.quantity <= (settings.lowStockThreshold || 15))
      .filter((b) => b.quantity > 0)
      .slice(0, 5);
  }, [batches, settings]);

  // 6. TABLE: Expiring Soon Medicines
  const expiringSoonBatches = useMemo(() => {
    return batches
      .filter((b) => b.isNearExpiry && b.quantity > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [batches]);

  // 7. TABLE: Recent Sales
  const recentSalesList = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  // 8. TABLE: Recent Stock Activities
  const recentActivitiesList = useMemo(() => {
    return [...stockHistory]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [stockHistory]);

  // 9. TABLE: Reorder Alerts
  const reorderAlertsList = useMemo(() => {
    return medicines
      .filter((m) => m.availableStock <= (m.minStockAlert || settings.lowStockThreshold || 15))
      .slice(0, 5);
  }, [medicines, settings]);

  // Quick batch save handler
  const handleSaveBatch = (batchData, reason) => {
    try {
      addBatch(batchData, reason);
      toast.showSuccess(`Batch ${batchData.batchNumber} added successfully!`);
      setRestockMedicine(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  // The 6 Small, Sleek, Colorful, and Responsive KPI Cards
  const kpiCards = [
    {
      title: 'Total Medicines',
      value: stats.totalMedicines.toLocaleString(),
      subtitle: `${stats.totalStockUnits.toLocaleString()} units in catalog`,
      icon: Pill,
      cardTheme: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 hover:border-emerald-400',
      iconBox: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      titleColor: 'text-emerald-950',
      valueColor: 'text-black',
      onClick: () => navigate('/medicines'),
    },
    {
      title: 'Total Stock Units',
      value: stats.totalStockUnits.toLocaleString(),
      subtitle: `${batches.length} physical batches`,
      icon: Boxes,
      cardTheme: 'border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-white to-cyan-50/30 hover:border-blue-400',
      iconBox: 'bg-blue-100 text-blue-800 border-blue-300',
      titleColor: 'text-blue-950',
      valueColor: 'text-black',
      onClick: () => navigate('/inventory'),
    },
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todayRevenue),
      subtitle: `${stats.todayCount} counter receipts today`,
      icon: ShoppingCart,
      cardTheme: 'border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 hover:border-indigo-400',
      iconBox: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      titleColor: 'text-indigo-950',
      valueColor: 'text-indigo-950',
      onClick: () => navigate('/sales'),
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      subtitle: `Recorded in ${new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}`,
      icon: TrendingUp,
      cardTheme: 'border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/30 hover:border-teal-400',
      iconBox: 'bg-teal-100 text-teal-800 border-teal-300',
      titleColor: 'text-teal-950',
      valueColor: 'text-[#1C9A58]',
      onClick: () => navigate('/reports'),
    },
    {
      title: 'Low Stock Batches',
      value: stats.lowStockCount,
      subtitle: stats.lowStockCount > 0 ? `At/below ${settings.lowStockThreshold || 15} units limit` : 'All batches sufficient',
      icon: AlertTriangle,
      cardTheme: 'border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 hover:border-amber-400',
      iconBox: 'bg-amber-100 text-amber-800 border-amber-300',
      titleColor: 'text-amber-950',
      valueColor: 'text-amber-950',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Expired Medicines',
      value: stats.expiredCount,
      subtitle: stats.expiredCount > 0 ? 'Requires quarantine disposal' : 'Zero expired medicines',
      icon: ShieldAlert,
      cardTheme: 'border-rose-200/90 bg-gradient-to-br from-rose-50/70 via-white to-red-50/30 hover:border-rose-400',
      iconBox: 'bg-rose-100 text-rose-800 border-rose-300',
      titleColor: 'text-rose-950',
      valueColor: 'text-rose-950',
      onClick: () => navigate('/inventory'),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 select-none font-sans">
      {/* ========================================================
          TOP BANNER & QUICK ACTIONS
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
              Pharmacy Operations Dashboard
            </h1>
            <p className="text-xs text-neutral-700 font-medium mt-0.5">
              Live multi-batch inventory intelligence, counter revenue analytics, and stock health.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="text-xs font-bold px-3.5 py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Boxes className="w-4 h-4 text-emerald-700" />
            <span>Inventory Control</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="bg-gradient-to-r from-emerald-600 via-[#1C9A58] to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Counter</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          6 COMPACT, COLORFUL, SMALL & RESPONSIVE KPI CARDS
          ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`p-3 rounded-xl border shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 ${card.cardTheme}`}
              title={`Click to view ${card.title}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${card.titleColor}`}>
                  {card.title}
                </span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${card.iconBox}`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
              </div>

              <div>
                <p className={`text-base sm:text-lg lg:text-xl font-extrabold tabular-nums tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
                <p className="text-[10px] sm:text-[11px] text-neutral-600 font-medium truncate mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          3 DISTINCT CHARTS: 1 AREA GRAPH, 1 BAR CHART, 1 PROGRESS
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* CHART 1: 14-Day Revenue Trend (SMOOTH AREA/LINE GRAPH) */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/30 via-white to-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Revenue Curve (14 Days)
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Daily counter revenue trend graph</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              Graph
            </span>
          </div>
          <div className="pt-1">
            <AreaTrendChart
              data={sales14DaysData}
              dataKey="value"
              labelKey="label"
              color="#1C9A58"
              isCurrency={true}
              height={180}
            />
          </div>
        </div>

        {/* CHART 2: 14-Day Purchases (VERTICAL COLUMN/BAR CHART) */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/30 via-white to-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs">
                <Boxes className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Stock Purchases (14 Days)
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Inbound shipment units received</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
              Bar Chart
            </span>
          </div>
          <div className="pt-1">
            <TrendChart
              data={purchases14DaysData}
              dataKey="value"
              labelKey="label"
              color="#2563EB"
              secondaryColor="#1D4ED8"
              isCurrency={false}
              height={180}
              emptyMessage="No inbound stock recorded in past 14 days"
            />
          </div>
        </div>

        {/* CHART 3: Stock by Category (HORIZONTAL DISTRIBUTION PROGRESS) */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/30 via-white to-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white p-1 rounded-md shadow-2xs">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Stock by Category
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Therapeutic class inventory share</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-300">
              Distribution
            </span>
          </div>
          <div className="pt-1">
            <CategoryBarChart data={categoryStockData} maxItems={6} />
          </div>
        </div>
      </div>

      {/* ========================================================
          OPERATIONAL ALERTS: LOW STOCK & EXPIRING BATCHES
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Low Stock Alert Table */}
        <div className="lg:col-span-6 p-3.5 sm:p-4 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-1 rounded-md shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Low Stock Medicines Alert
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Batches requiring restock shipments</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {lowStockBatches.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 font-medium">
                All active batches are above minimum stock threshold.
              </div>
            ) : (
              lowStockBatches.map((b) => {
                const targetMed = medicines.find((m) => m.medicineId === b.medicineId);
                return (
                  <div
                    key={b.batchId || b.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-lg px-2 cursor-pointer transition-colors group"
                    onClick={() => {
                      if (targetMed) setViewingMedicine(targetMed);
                      else navigate('/inventory');
                    }}
                    title="Click to view medicine specs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-black text-xs group-hover:text-emerald-800 transition-colors truncate">
                        {b.medicineName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-600 font-medium mt-0.5">
                        <span className="font-mono font-bold text-black bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300">
                          {b.batchNumber}
                        </span>
                        <span>•</span>
                        <span>{b.location || 'Shelf'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        {b.quantity} left
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (targetMed) setRestockMedicine(targetMed);
                          else navigate('/inventory');
                        }}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        title="Add Incoming Batch"
                      >
                        + Restock
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expiring Soon Alert Table */}
        <div className="lg:col-span-6 p-3.5 sm:p-4 rounded-xl border border-rose-200/90 bg-gradient-to-br from-rose-50/40 via-white to-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-rose-200/80">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-rose-500 to-red-500 text-white p-1 rounded-md shadow-2xs">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Expiring Soon Batches
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Batches nearing shelf life expiry limit</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {expiringSoonBatches.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 font-medium">
                No near-expiry medicines requiring quarantine attention.
              </div>
            ) : (
              expiringSoonBatches.map((b) => {
                const targetMed = medicines.find((m) => m.medicineId === b.medicineId);
                return (
                  <div
                    key={b.batchId || b.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-lg px-2 cursor-pointer transition-colors group"
                    onClick={() => {
                      if (targetMed) setViewingMedicine(targetMed);
                      else navigate('/inventory');
                    }}
                    title="Click to view medicine specs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-black text-xs group-hover:text-rose-800 transition-colors truncate">
                        {b.medicineName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-600 font-medium mt-0.5">
                        <span className="font-mono font-bold text-black bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300">
                          {b.batchNumber}
                        </span>
                        <span>•</span>
                        <span>Exp: {formatDate(b.expiryDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                        {b.daysLeft}d left ({b.quantity}u)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          RECENT SALES, STOCK AUDIT FEED & REORDER ALERTS
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* 1. Recent Invoices */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 bg-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                <ShoppingCart className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Recent Invoices
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Latest counter customer bills</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>All Sales</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentSalesList.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 font-medium">
                No recent customer bills recorded yet.
              </div>
            ) : (
              recentSalesList.map((s) => (
                <div
                  key={s.id || s.invoiceNumber}
                  onClick={() => setSelectedInvoice(s)}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 rounded-lg px-1.5 cursor-pointer transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-black text-xs group-hover:text-emerald-800 transition-colors">
                      {s.invoiceNumber}
                    </p>
                    <p className="text-[11px] text-neutral-600 font-medium truncate mt-0.5">
                      {s.patientName || s.customerName || 'Walk-in'} • {formatDate(s.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-black text-xs tabular-nums">
                      {formatCurrency(s.grandTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(s);
                      }}
                      className="p-1 text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors"
                      title="View Bill Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Stock Movements Audit Feed */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl border border-blue-200/90 bg-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs">
                <Activity className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Stock Audit Feed
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Verified warehouse movements</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>History</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentActivitiesList.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 font-medium">
                No recent stock movements recorded.
              </div>
            ) : (
              recentActivitiesList.map((act) => (
                <div key={act.stockHistoryId || act.id} className="py-2.5 flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-black text-xs truncate">
                      {act.reason || act.actionType}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                      {act.employeeName || 'Staff'} • {formatDate(act.timestamp)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                        act.changedQuantity > 0
                          ? 'text-emerald-900 bg-emerald-100 border-emerald-300'
                          : 'text-rose-900 bg-rose-100 border-rose-300'
                      }`}
                    >
                      {act.changedQuantity > 0 ? `+${act.changedQuantity}` : act.changedQuantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Reorder Recommendations */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl border border-indigo-200/90 bg-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-1 rounded-md shadow-2xs">
                <Boxes className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Reorder Alerts
                </h3>
                <p className="text-[11px] text-neutral-600 font-medium">Smart restock recommendations</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Inventory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {reorderAlertsList.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 font-medium">
                Inventory levels are optimal across all catalog medicines.
              </div>
            ) : (
              reorderAlertsList.map((m) => (
                <div
                  key={m.medicineId || m.id}
                  onClick={() => setViewingMedicine(m)}
                  className="py-2.5 flex items-center justify-between gap-2 px-1 hover:bg-slate-50/80 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-black text-xs group-hover:text-indigo-900 transition-colors truncate">
                      {m.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-medium truncate mt-0.5">
                      {m.manufacturer || m.brand} • Target threshold: {m.minStockAlert || 15}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                      {m.availableStock} in stock
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRestockMedicine(m);
                      }}
                      className="p-1 rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 transition-colors cursor-pointer"
                      title="Add Batch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          MODALS INTEGRATED INTO DASHBOARD FOR SEAMLESS 1-CLICK UX
          ======================================================== */}
      {/* 1. Invoice Modal when clicking on any recent sale */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onNewSale={() => {
          setSelectedInvoice(null);
          navigate('/pos');
        }}
      />

      {/* 2. Medicine Specs Modal when clicking any alert medicine */}
      {viewingMedicine && (
        <MedicineDetails
          isOpen={Boolean(viewingMedicine)}
          onClose={() => setViewingMedicine(null)}
          medicine={viewingMedicine}
          batches={batches.filter((b) => b.medicineId === viewingMedicine.medicineId)}
          allBatches={batches}
          onEdit={() => navigate('/medicines')}
          onAddBatch={(batchData, reason) => {
            try {
              addBatch(batchData, reason);
              toast.showSuccess(`Batch added successfully!`);
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onUpdateBatch={(batchId, batchData, reason) => {
            try {
              updateBatch(batchId, batchData, reason);
              toast.showSuccess('Batch updated successfully!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onDeleteBatch={(batchId, reason) => {
            try {
              deleteBatch(batchId, reason);
              toast.showSuccess('Batch removed successfully!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onAdjustStock={({ batchId, delta, actionType, reason }) => {
            try {
              adjustBatchStock(batchId, delta, actionType, reason);
              toast.showSuccess('Stock adjustment applied!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
        />
      )}

      {/* 3. Quick Restock Batch Form */}
      {restockMedicine && (
        <BatchForm
          isOpen={Boolean(restockMedicine)}
          onClose={() => setRestockMedicine(null)}
          onSave={handleSaveBatch}
          fixedMedicineId={restockMedicine.medicineId}
          medicines={[restockMedicine]}
          existingBatches={batches}
        />
      )}
    </div>
  );
};

export default Dashboard;
