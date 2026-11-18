import { useState, useMemo } from 'react';
import {
  Eye,
  Printer,
  ArrowUpDown,
  Search,
  User,
  Stethoscope,
  Pill,
  CreditCard,
  Banknote,
  Receipt,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';

export const SalesHistory = () => {
  const { sales } = useSales();
  const { users } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // all, today, week, month
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, Cash, Card
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filter & Search Logic
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Search by: Invoice Number, Patient Name, Medicine Name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const matchesInvoice = s.invoiceNumber?.toLowerCase().includes(q);
        const matchesPatient =
          s.patientName?.toLowerCase().includes(q) ||
          s.customerName?.toLowerCase().includes(q);
        const matchesDoctor = s.doctorName?.toLowerCase().includes(q);
        const matchesMedicine = s.items?.some(
          (item) =>
            item.medicineName?.toLowerCase().includes(q) ||
            item.name?.toLowerCase().includes(q) ||
            item.genericName?.toLowerCase().includes(q) ||
            item.batchNumber?.toLowerCase().includes(q) ||
            item.batchNo?.toLowerCase().includes(q)
        );

        return matchesInvoice || matchesPatient || matchesDoctor || matchesMedicine;
      });
    }

    // Filter by Employee
    if (employeeFilter !== 'all') {
      result = result.filter(
        (s) =>
          s.employeeName === employeeFilter ||
          s.cashierName === employeeFilter ||
          s.employeeId === employeeFilter
      );
    }

    // Filter by Payment Method
    if (paymentFilter !== 'all') {
      result = result.filter((s) => s.paymentMethod === paymentFilter);
    }

    // Filter by Date Range
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (dateRangeFilter === 'today') {
        result = result.filter((s) => new Date(s.date).getTime() >= todayStart);
      } else if (dateRangeFilter === 'week') {
        const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
        result = result.filter((s) => new Date(s.date).getTime() >= sevenDaysAgo);
      } else if (dateRangeFilter === 'month') {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        result = result.filter((s) => new Date(s.date).getTime() >= firstOfMonth);
      }
    }

    // Sort by Newest or Oldest
    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [sales, searchQuery, employeeFilter, dateRangeFilter, paymentFilter, sortOrder]);

  // Aggregate stats from filtered sales
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalDiscountGiven = 0;
    let totalUnitsSold = 0;

    filteredSales.forEach((s) => {
      totalRevenue += Number(s.grandTotal) || 0;
      totalDiscountGiven += Number(s.discountAmount) || 0;
      s.items?.forEach((i) => {
        totalUnitsSold += Number(i.quantity) || 0;
      });
    });

    return {
      count: filteredSales.length,
      revenue: totalRevenue,
      discount: totalDiscountGiven,
      units: totalUnitsSold,
    };
  }, [filteredSales]);

  // Table Columns
  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      render: (s) => (
        <div>
          <span className="font-mono font-bold text-gray-900 text-xs">
            {s.invoiceNumber}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
            <span>{formatDate(s.date)}</span>
            <span>&bull;</span>
            <span>{new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Patient & Doctor',
      render: (s) => (
        <div className="space-y-0.5">
          <p className="font-bold text-gray-900 text-xs flex items-center gap-1">
            <User className="w-3 h-3 text-[#1C9A58]" />
            {s.patientName || s.customerName || 'Walk-in'}
          </p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-gray-400" />
            {s.doctorName || 'Self / OTC'}
          </p>
        </div>
      ),
    },
    {
      header: 'Medicines Dispensed',
      render: (s) => {
        const count = s.items?.length || 0;
        const totalQty = s.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0;
        const firstTwo = s.items?.slice(0, 2) || [];
        const remaining = count - firstTwo.length;

        return (
          <div className="space-y-0.5 max-w-[200px]">
            <div className="text-xs font-semibold text-gray-800 truncate">
              {firstTwo.map((i) => i.medicineName || i.name).join(', ')}
              {remaining > 0 && (
                <span className="text-[10px] text-gray-400 font-normal"> +{remaining} more</span>
              )}
            </div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <Pill className="w-2.5 h-2.5 text-emerald-600" />
              <span>{count} line item{count > 1 ? 's' : ''} &bull; <strong>{totalQty} units</strong></span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Subtotal / Disc',
      align: 'right',
      render: (s) => (
        <div className="text-right text-xs">
          <p className="font-mono text-gray-600">{formatCurrency(s.subtotal)}</p>
          {s.discountAmount > 0 ? (
            <p className="font-mono text-[10px] text-emerald-600 font-semibold">
              -{formatCurrency(s.discountAmount)}
            </p>
          ) : (
            <p className="font-mono text-[10px] text-gray-400">-</p>
          )}
        </div>
      ),
    },
    {
      header: 'Final Amount',
      align: 'right',
      render: (s) => (
        <div className="text-right">
          <span className="font-mono font-black text-sm text-[#0F3A2C]">
            {formatCurrency(s.grandTotal)}
          </span>
        </div>
      ),
    },
    {
      header: 'Payment',
      align: 'center',
      render: (s) => (
        <Badge
          variant={s.paymentMethod === 'Card' ? 'primary' : 'success'}
          size="sm"
          className="font-bold"
        >
          {s.paymentMethod === 'Card' ? (
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Card
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3" /> Cash
            </span>
          )}
        </Badge>
      ),
    },
    {
      header: 'Dispensed By',
      render: (s) => (
        <div className="text-xs">
          <p className="font-semibold text-gray-900">{s.employeeName || s.cashierName}</p>
          {s.employeeUsername && (
            <p className="font-mono text-[10px] text-gray-400">@{s.employeeUsername}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            iconLeft={Eye}
            onClick={() => setSelectedInvoice(s)}
            className="text-xs py-1 px-2.5 h-8"
          >
            Invoice
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Printer}
            onClick={() => {
              setSelectedInvoice(s);
              setTimeout(() => window.print(), 300);
            }}
            title="Print Receipt"
            className="text-xs py-1 px-2 h-8 text-gray-600 hover:text-emerald-700"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-[#1C9A58]" />
            Sales History & Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Immutable financial records of all completed counter dispensing and prescription sales.
          </p>
        </div>

        {/* Aggregate Quick Metric Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-gray-400">Completed Sales</p>
            <p className="text-lg font-black text-gray-900">{stats.count}</p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Net Revenue</p>
            <p className="text-lg font-black text-[#1C9A58]">{formatCurrency(stats.revenue)}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice #, patient, doctor, medicine, or batch..."
                className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Employee Filter */}
            <div className="md:col-span-2">
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#1C9A58]"
              >
                <option value="all">All Employees</option>
                {users.map((u) => (
                  <option key={u.id || u.employeeId} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="md:col-span-2">
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#1C9A58]"
              >
                <option value="all">All Dates</option>
                <option value="today">Today's Sales</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="md:col-span-2">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:border-[#1C9A58]"
              >
                <option value="all">All Payments</option>
                <option value="Cash">Cash Only</option>
                <option value="Card">Card Only</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="w-full py-2 px-2 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 flex items-center justify-center gap-1 font-semibold text-gray-700 transition-colors"
                title={`Sorted by: ${sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <span className="capitalize">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Historical Sales Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredSales}
          onRowClick={(s) => setSelectedInvoice(s)}
          emptyMessage="No historical sales invoices found matching your filters."
        />
      </Card>

      {/* Printable Invoice Modal (Immutable View) */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onNewSale={() => setSelectedInvoice(null)}
      />
    </div>
  );
};

export default SalesHistory;
