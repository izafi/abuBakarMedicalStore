import { useState, useMemo, useEffect } from 'react';
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
  X,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Filter,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InvoiceModal } from '../components/common/InvoiceModal';
import FilterDropdown from '../components/common/FilterDropdown';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';

export const SalesHistory = () => {
  const navigate = useNavigate();
  const { sales, refreshSales } = useSales();
  const { users } = useAuth();

  // Instantly ensure latest sales records on mount without needing refresh
  useEffect(() => {
    if (refreshSales) {
      refreshSales();
    }
  }, [refreshSales]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // all, today, week, month
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, Cash, Card
  const [sortField, setSortField] = useState('date'); // date, grandTotal, invoiceNumber
  const [sortOrder, setSortOrder] = useState('desc'); // desc (newest), asc (oldest)

  // Options for custom FilterDropdowns
  const employeeOptions = useMemo(
    () => [
      { label: 'All Employees', value: 'all' },
      ...users.map((u) => ({
        label: `${u.name} (${u.role})`,
        value: u.name,
      })),
    ],
    [users]
  );

  const dateRangeOptions = useMemo(
    () => [
      { label: 'All Dates', value: 'all' },
      { label: "Today's Sales", value: 'today' },
      { label: 'Last 7 Days', value: 'week' },
      { label: 'This Month', value: 'month' },
    ],
    []
  );

  const paymentOptions = useMemo(
    () => [
      { label: 'All Payments', value: 'all' },
      { label: 'Cash Only', value: 'Cash' },
      { label: 'Card Only', value: 'Card' },
    ],
    []
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filter & Search Logic
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Search by: Invoice Number, Patient Name, Customer Name, Doctor Name, Medicine Name, Batch Number
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

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (sortField === 'grandTotal') {
        valA = Number(a.grandTotal) || 0;
        valB = Number(valB) || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [sales, searchQuery, employeeFilter, dateRangeFilter, paymentFilter, sortField, sortOrder]);

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

  // Handle Header Sort Click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setEmployeeFilter('all');
    setDateRangeFilter('all');
    setPaymentFilter('all');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Paginated Sales
  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSales = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, safePage, pageSize]);

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Top Header & New Sale Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#1C9A58] stroke-[2.2]" />
            <span>Sales History & Audit Logs</span>
          </h1>
          <p className="text-xs text-black font-semibold mt-0.5">
            Immutable financial records of all completed counter dispensing and prescription sales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/pos')}
          className="bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Dispensing Sale</span>
        </button>
      </div>

      {/* =========================================================================
          ADJUSTED KPI STATE CARDS (Small, Sleek, Colorful & Responsive)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Completed Sales */}
        <div
          onClick={handleResetFilters}
          className="p-3 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 hover:border-emerald-400 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 group"
          title="Click to view all completed sales"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate text-emerald-950">
              Completed Sales
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-emerald-300 bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold tabular-nums tracking-tight text-black truncate">
              {stats.count}
            </p>
            <p className="text-[10px] sm:text-[11px] text-neutral-700 font-semibold truncate mt-0.5">
              Billed transactions
            </p>
          </div>
        </div>

        {/* Card 2: Total Net Revenue */}
        <div
          onClick={() => {
            setSortField('grandTotal');
            setSortOrder('desc');
          }}
          className="p-3 rounded-xl border border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/30 hover:border-teal-400 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 group"
          title="Click to sort by highest revenue sales"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate text-teal-950">
              Net Revenue
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-teal-300 bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold tabular-nums tracking-tight text-[#1C9A58] truncate">
              {formatCurrency(stats.revenue)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-neutral-700 font-semibold truncate mt-0.5">
              Counter collections
            </p>
          </div>
        </div>

        {/* Card 3: Total Units Dispensed */}
        <div
          className="p-3 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-white to-cyan-50/30 hover:border-blue-400 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 group"
          title="Total quantity of medicine packs dispensed"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate text-blue-950">
              Units Dispensed
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-blue-300 bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold tabular-nums tracking-tight text-black truncate">
              {stats.units} <span className="text-xs font-bold text-neutral-800">units</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-neutral-700 font-semibold truncate mt-0.5">
              Across {stats.count} invoices
            </p>
          </div>
        </div>

        {/* Card 4: Total Discount Given */}
        <div
          onClick={() => setSearchQuery('')}
          className="p-3 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/30 hover:border-amber-400 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 group"
          title="Customer savings granted"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider truncate text-amber-950">
              Total Discounts
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-amber-300 bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold tabular-nums tracking-tight text-amber-950 truncate">
              {formatCurrency(stats.discount)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-neutral-700 font-semibold truncate mt-0.5">
              Customer savings
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEARCH & FILTER TOOLBAR
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-2.5 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          {/* Search Input with Instant Clear */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by invoice #, patient, doctor, medicine, or batch..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] text-black font-medium transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-black hover:bg-slate-200 rounded transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns - 2x2 grid on mobile/small screens, inline flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
            {/* Employee Filter */}
            <FilterDropdown
              value={employeeFilter}
              onChange={(val) => {
                setEmployeeFilter(val);
                setCurrentPage(1);
              }}
              options={employeeOptions}
              placeholder="All Employees"
              className="w-full sm:w-auto min-w-[130px]"
            />

            {/* Date Range Filter */}
            <FilterDropdown
              value={dateRangeFilter}
              onChange={(val) => {
                setDateRangeFilter(val);
                setCurrentPage(1);
              }}
              options={dateRangeOptions}
              placeholder="All Dates"
              className="w-full sm:w-auto min-w-[120px]"
            />

            {/* Payment Filter */}
            <FilterDropdown
              value={paymentFilter}
              onChange={(val) => {
                setPaymentFilter(val);
                setCurrentPage(1);
              }}
              options={paymentOptions}
              placeholder="All Payments"
              align="left"
              className="w-full sm:w-auto min-w-[120px]"
            />

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              }}
              className="w-full sm:w-auto h-9 px-3 text-xs border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 font-bold text-black transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={`Sorted by: ${sortOrder === 'desc' ? 'Newest / Highest' : 'Oldest / Lowest'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-black stroke-[2.2]" />
              <span className="capitalize">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Chips & Reset Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-black uppercase tracking-wider shrink-0">Quick:</span>
            {[
              { label: 'All Invoices', action: () => handleResetFilters(), active: dateRangeFilter === 'all' && paymentFilter === 'all' && !searchQuery },
              { label: "Today's Sales", action: () => { setDateRangeFilter('today'); setCurrentPage(1); }, active: dateRangeFilter === 'today' },
              { label: 'Cash Payments', action: () => { setPaymentFilter('Cash'); setCurrentPage(1); }, active: paymentFilter === 'Cash' },
              { label: 'Card Payments', action: () => { setPaymentFilter('Card'); setCurrentPage(1); }, active: paymentFilter === 'Card' },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={chip.action}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  chip.active
                    ? 'bg-black text-white border-black shadow-2xs'
                    : 'bg-slate-50 text-black border-slate-300 hover:border-black hover:bg-slate-100'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {(searchQuery || employeeFilter !== 'all' || dateRangeFilter !== 'all' || paymentFilter !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.2]" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MAIN SALES TABLE (Matching Medicine Counter & Inventory Standards)
          ========================================================================= */}
      <div className="w-full bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
          <table className="w-full min-w-[780px] lg:min-w-full text-left border-collapse table-auto text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none">
                {/* 1. Invoice */}
                <th
                  onClick={() => handleSort('invoiceNumber')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1 text-black font-bold">
                    <span>Invoice</span>
                    <ArrowUpDown className="w-3 h-3 text-black shrink-0 stroke-[2.2]" />
                  </div>
                </th>

                {/* 2. Customer */}
                <th className="py-2.5 px-3 text-black font-bold whitespace-nowrap">
                  <span>Customer</span>
                </th>

                {/* 3. Medicines */}
                <th className="py-2.5 px-3 text-black font-bold whitespace-nowrap">
                  <span>Medicines Dispensed</span>
                </th>

                {/* 4. Total Amount */}
                <th
                  onClick={() => handleSort('grandTotal')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1 text-black font-bold">
                    <span>Total Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-black shrink-0 stroke-[2.2]" />
                  </div>
                </th>

                {/* 5. Payment */}
                <th className="py-2.5 px-2 text-center text-black font-bold whitespace-nowrap">
                  <span>Payment</span>
                </th>

                {/* 6. Cashier */}
                <th className="py-2.5 px-3 text-black font-bold whitespace-nowrap">
                  <span>Cashier</span>
                </th>

                {/* 7. Actions */}
                <th className="py-2.5 px-3 text-right text-black font-bold whitespace-nowrap">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs bg-white">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-black">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-neutral-400 stroke-[1.8]" />
                    <p className="font-bold text-black text-sm">No sales invoices found</p>
                    <p className="text-xs text-black font-medium mt-0.5">
                      Try adjusting your search query or quick filter selection.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-3 py-1.5 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedSales.map((s) => {
                  const itemCount = s.items?.length || 0;
                  const totalQty = s.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0;
                  const firstTwo = s.items?.slice(0, 2) || [];
                  const remaining = itemCount - firstTwo.length;

                  return (
                    <tr
                      key={s.id || s.invoiceNumber}
                      onClick={() => setSelectedInvoice(s)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {/* 1. Invoice & Timestamp */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#1C9A58] group-hover:underline text-xs block">
                          {s.invoiceNumber}
                        </span>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                          <span>{formatDate(s.date)}</span>
                          <span className="mx-1">&bull;</span>
                          <span>{new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* 2. Customer */}
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-black text-xs truncate max-w-[150px]">
                          {s.patientName || s.customerName || 'Walk-in Customer'}
                        </p>
                        {s.doctorName && !['self', 'self / counter', 'counter', 'n/a', ''].includes(s.doctorName.toLowerCase().trim()) ? (
                          <p className="text-[11px] text-emerald-700 font-semibold truncate max-w-[150px] mt-0.5">
                            Dr. {s.doctorName.replace(/^dr\.?\s*/i, '')}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px] mt-0.5">
                            Counter Sale
                          </p>
                        )}
                      </td>

                      {/* 3. Medicines Dispensed */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5 max-w-[200px]">
                          <p className="text-xs font-bold text-black truncate">
                            {firstTwo.map((i) => i.medicineName || i.name).join(', ')}
                            {remaining > 0 && (
                              <span className="text-[10px] text-slate-600 font-bold ml-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                +{remaining}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                            <span className="mx-1">&bull;</span>
                            <span className="font-semibold text-slate-700">{totalQty} units</span>
                          </p>
                        </div>
                      </td>

                      {/* 4. Total Amount (Clean & Consolidated) */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-mono font-black text-sm text-black block tabular-nums">
                          {Number(s.grandTotal || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {Number(s.discountAmount) > 0 ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                            Save {Number(s.discountAmount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            No discount
                          </span>
                        )}
                      </td>

                      {/* 5. Payment Badge */}
                      <td className="py-2.5 px-2 text-center">
                        {s.paymentMethod === 'Card' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs whitespace-nowrap">
                            <CreditCard className="w-3 h-3 text-blue-800 stroke-[2.2]" />
                            <span>Card</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs whitespace-nowrap">
                            <Banknote className="w-3 h-3 text-emerald-800 stroke-[2.2]" />
                            <span>Cash</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Cashier */}
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-black text-xs capitalize">
                          {s.employeeName || s.cashierName || 'Staff'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {s.employeeRole || (s.employeeName?.toLowerCase().includes('admin') || s.cashierName?.toLowerCase().includes('admin') ? 'Admin' : 'Cashier')}
                        </p>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(s)}
                            className="h-7 px-2 flex items-center gap-1 text-slate-700 hover:text-[#1C9A58] hover:bg-emerald-50 rounded-md border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer text-xs font-semibold"
                            title="View invoice details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(s);
                              setTimeout(() => window.print(), 300);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer"
                            title="Print receipt"
                          >
                            <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* =========================================================================
            PAGINATION & METRICS FOOTER (Matching Medicine Counter & Catalog)
            ========================================================================= */}
        <div className="px-3.5 py-2.5 border-t border-slate-300 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
          {/* Showing Count */}
          <div className="text-black font-bold text-xs flex items-center gap-2 text-center sm:text-left">
            <span>
              Showing{' '}
              <strong className="text-black font-black">
                {filteredSales.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-black font-black">
                {Math.min(safePage * pageSize, filteredSales.length)}
              </strong>{' '}
              of <strong className="text-black font-black">{filteredSales.length}</strong> invoices
            </span>
          </div>

          {/* Page Controls & Page Size */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-black font-bold">Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-2 text-xs bg-white border border-slate-300 rounded font-bold text-black focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[11px] text-black font-bold">per page</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className={`p-1 rounded border transition-colors flex items-center gap-1 text-xs font-bold px-2 cursor-pointer ${
                  safePage === 1
                    ? 'border-slate-200 text-neutral-300 cursor-not-allowed bg-slate-100'
                    : 'border-slate-300 bg-white text-black hover:bg-slate-100 hover:border-black shadow-2xs'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <span className="text-xs font-bold text-black px-1.5 sm:px-2 whitespace-nowrap">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className={`p-1 rounded border transition-colors flex items-center gap-1 text-xs font-bold px-2 cursor-pointer ${
                  safePage >= totalPages
                    ? 'border-slate-200 text-neutral-300 cursor-not-allowed bg-slate-100'
                    : 'border-slate-300 bg-white text-black hover:bg-slate-100 hover:border-black shadow-2xs'
                }`}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
