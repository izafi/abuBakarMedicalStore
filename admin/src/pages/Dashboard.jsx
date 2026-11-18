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
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { TrendChart } from '../components/charts/TrendChart';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BATCH_STOCK_STATUS } from '../utils/constants';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { medicines, batches, stockHistory } = useInventory();
  const { sales } = useSales();
  const { settings } = useSettings();

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // 1. DYNAMIC SUMMARY CALCULATIONS (From actual shared application data)
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
      (b) => b.status === BATCH_STOCK_STATUS.LOW_STOCK
    ).length;

    const expiredCount = batches.filter(
      (b) => b.status === BATCH_STOCK_STATUS.EXPIRED
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
  }, [medicines, batches, sales]);

  // 2. 14-DAY SALES CHART DATA
  const sales14DaysData = useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      // Calculate total sales for this exact date
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

      // Calculate units added on this date from stock history
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
      .slice(0, 6);
  }, [batches, settings]);

  // 6. TABLE: Expiring Soon Medicines
  const expiringSoonBatches = useMemo(() => {
    return batches
      .filter((b) => b.isNearExpiry && b.quantity > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);
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
      .slice(0, 6);
  }, [stockHistory]);

  // 9. TABLE: Reorder Alerts
  const reorderAlertsList = useMemo(() => {
    return medicines
      .filter((m) => m.availableStock <= (m.minStockAlert || settings.lowStockThreshold || 15))
      .slice(0, 5);
  }, [medicines, settings]);

  // Dashboard 6 KPI Cards
  const kpiCards = [
    {
      title: 'Total Medicines',
      value: stats.totalMedicines.toLocaleString(),
      subtitle: `${stats.totalStockUnits.toLocaleString()} active units in store`,
      icon: Pill,
      iconBg: 'bg-emerald-50 text-[#1C9A58]',
      onClick: () => navigate('/medicines'),
    },
    {
      title: 'Total Stock Units',
      value: stats.totalStockUnits.toLocaleString(),
      subtitle: `${batches.length} registered batches`,
      icon: Boxes,
      iconBg: 'bg-teal-50 text-teal-700',
      onClick: () => navigate('/inventory'),
    },
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todayRevenue),
      subtitle: `${stats.todayCount} customer transactions today`,
      icon: ShoppingCart,
      iconBg: 'bg-blue-50 text-blue-600',
      onClick: () => navigate('/sales'),
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      subtitle: `Recorded in ${new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 text-[#0F3A2C]',
      onClick: () => navigate('/reports'),
    },
    {
      title: 'Low Stock Batches',
      value: stats.lowStockCount,
      subtitle: `At or below ${settings.lowStockThreshold || 15} units threshold`,
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Expired Medicines',
      value: stats.expiredCount,
      subtitle: stats.expiredCount > 0 ? 'Requires quarantine / disposal' : 'No expired stock',
      icon: ShieldAlert,
      iconBg: 'bg-red-50 text-red-600',
      onClick: () => navigate('/inventory'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-[#1C9A58]" />
            Pharmacy Operations Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time multi-batch inventory intelligence, counter sales analytics, and audit trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={Boxes}
            onClick={() => navigate('/inventory')}
          >
            Inventory Control
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={ShoppingCart}
            onClick={() => navigate('/pos')}
          >
            Open POS Counter
          </Button>
        </div>
      </div>

      {/* 6 Core KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              hoverEffect
              onClick={card.onClick}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {card.title}
                  </p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {card.value}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${card.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3 Dashboard Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 14-Day Sales Chart */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title="14-Day Revenue Trend"
              subtitle="Daily counter sales revenue over past two weeks"
            />
            <div className="mt-4">
              <TrendChart
                data={sales14DaysData}
                dataKey="value"
                labelKey="label"
                color="#1C9A58"
                secondaryColor="#0F3A2C"
                isCurrency={true}
                height={190}
              />
            </div>
          </Card>
        </div>

        {/* 14-Day Purchases / Inflow Chart */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title="14-Day Stock Purchases"
              subtitle="Stock units received into batches"
            />
            <div className="mt-4">
              <TrendChart
                data={purchases14DaysData}
                dataKey="value"
                labelKey="label"
                color="#2563EB"
                secondaryColor="#1E3A8A"
                isCurrency={false}
                height={190}
                emptyMessage="No stock received in past 14 days"
              />
            </div>
          </Card>
        </div>

        {/* Stock by Category Breakdown */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title="Stock by Category"
              subtitle="Distribution of stock units across categories"
            />
            <div className="mt-4">
              <CategoryBarChart data={categoryStockData} maxItems={6} />
            </div>
          </Card>
        </div>
      </div>

      {/* 5 Operational Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Low Stock Medicines Table */}
        <div className="lg:col-span-6">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Low Stock Medicines
                </h3>
                <p className="text-xs text-gray-500">Batches needing restocking</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-[#1C9A58] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 mt-2 text-xs">
              {lowStockBatches.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  All active batches are above minimum stock threshold.
                </div>
              ) : (
                lowStockBatches.map((b) => (
                  <div key={b.batchId || b.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{b.medicineName}</p>
                      <p className="text-[11px] text-gray-500">
                        Batch: <span className="font-mono">{b.batchNumber}</span> &bull; {b.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="warning" size="sm" className="font-bold">
                        {b.quantity} left
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Expiring Soon Medicines Table */}
        <div className="lg:col-span-6">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-500" />
                  Expiring Soon Batches
                </h3>
                <p className="text-xs text-gray-500">Expiring within warning period</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-[#1C9A58] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 mt-2 text-xs">
              {expiringSoonBatches.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  No near-expiry medicines requiring immediate attention.
                </div>
              ) : (
                expiringSoonBatches.map((b) => (
                  <div key={b.batchId || b.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{b.medicineName}</p>
                      <p className="text-[11px] text-gray-500">
                        Batch: <span className="font-mono">{b.batchNumber}</span> &bull; Exp: {formatDate(b.expiryDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {b.daysLeft} days left ({b.quantity} units)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Sales Table */}
        <div className="lg:col-span-4">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-[#1C9A58]" />
                  Recent Sales
                </h3>
                <p className="text-xs text-gray-500">Latest counter invoices</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/sales')}
                className="text-xs font-semibold text-[#1C9A58] hover:underline flex items-center gap-1"
              >
                All Sales <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 mt-2 text-xs">
              {recentSalesList.map((s) => (
                <div key={s.id || s.invoiceNumber} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-mono font-bold text-gray-900">{s.invoiceNumber}</p>
                    <p className="text-[11px] text-gray-500">
                      {s.patientName || s.customerName || 'Walk-in'} &bull; {formatDate(s.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">
                      {formatCurrency(s.grandTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(s)}
                      className="p-1 text-gray-400 hover:text-emerald-700"
                      title="View Bill"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Stock Activities Log */}
        <div className="lg:col-span-4">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Recent Stock Activities
                </h3>
                <p className="text-xs text-gray-500">Movement audit log</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 mt-2 text-xs">
              {recentActivitiesList.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  No recent stock movements recorded.
                </div>
              ) : (
                recentActivitiesList.map((act) => (
                  <div key={act.stockHistoryId || act.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 truncate max-w-[170px]">
                        {act.reason || act.actionType}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {act.employeeName || 'Staff'} &bull; {formatDate(act.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono text-xs font-bold ${
                          act.changedQuantity > 0 ? 'text-[#1C9A58]' : 'text-rose-600'
                        }`}
                      >
                        {act.changedQuantity > 0 ? `+${act.changedQuantity}` : act.changedQuantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Reorder Alerts */}
        <div className="lg:col-span-4">
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-[#0F3A2C]" />
                  Reorder Alerts
                </h3>
                <p className="text-xs text-gray-500">Restock recommendations</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 mt-2 text-xs">
              {reorderAlertsList.length === 0 ? (
                <div className="py-6 text-center text-gray-400">
                  Inventory levels are optimal across all medicines.
                </div>
              ) : (
                reorderAlertsList.map((m) => (
                  <div key={m.medicineId || m.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{m.name}</p>
                      <p className="text-[10px] text-gray-400">{m.manufacturer || m.brand}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="danger" size="sm">
                        {m.availableStock} in stock
                      </Badge>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        Alert: &le; {m.minStockAlert || 15}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Invoice Modal when clicking on any recent sale */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onNewSale={() => {
          setSelectedInvoice(null);
          navigate('/pos');
        }}
      />
    </div>
  );
};

export default Dashboard;
