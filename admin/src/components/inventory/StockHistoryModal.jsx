import { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  User,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Receipt,
  Boxes,
  X,
  RotateCcw,
  PackagePlus,
  PackageMinus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatDateTime } from '../../utils/formatters';
import { STOCK_ACTION_TYPES } from '../../utils/constants';

export const StockHistoryModal = ({
  isOpen,
  onClose,
  history = [],
  medicines = [],
  batches = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const medicineMap = useMemo(() => {
    const map = new Map();
    medicines.forEach((m) => {
      map.set(m.medicineId, m.name);
      if (m.id) map.set(m.id, m.name);
    });
    return map;
  }, [medicines]);

  const batchMap = useMemo(() => {
    const map = new Map();
    batches.forEach((b) => {
      map.set(b.batchId, b.batchNumber || b.batchNo);
      if (b.id) map.set(b.id, b.batchNumber || b.batchNo);
    });
    return map;
  }, [batches]);

  // Dynamic Movement Analytics
  const metrics = useMemo(() => {
    let totalAdded = 0;
    let totalDeducted = 0;
    let totalEvents = history.length;

    history.forEach((h) => {
      const qty = Number(h.changedQuantity) || 0;
      if (qty > 0) totalAdded += qty;
      else if (qty < 0) totalDeducted += Math.abs(qty);
    });

    return { totalAdded, totalDeducted, totalEvents };
  }, [history]);

  // Multi-field search & action filter
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const medName = (medicineMap.get(item.medicineId) || item.medicineId || '').toLowerCase();
      const batchNum = (batchMap.get(item.batchId) || item.batchId || '').toLowerCase();
      const reason = (item.reason || '').toLowerCase();
      const emp = (item.employeeName || item.employeeId || '').toLowerCase();

      const matchesSearch =
        !q ||
        medName.includes(q) ||
        batchNum.includes(q) ||
        reason.includes(q) ||
        emp.includes(q);

      const matchesAction =
        filterAction === 'ALL' || item.actionType === filterAction;

      return matchesSearch && matchesAction;
    });
  }, [history, searchQuery, filterAction, medicineMap, batchMap]);

  // Paginated List
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedHistory = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, safePage, itemsPerPage]);

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case STOCK_ACTION_TYPES.ADD_STOCK:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs whitespace-nowrap">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
            <span>Add Stock</span>
          </span>
        );
      case STOCK_ACTION_TYPES.REMOVE_STOCK:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap">
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-700" />
            <span>Remove Stock</span>
          </span>
        );
      case STOCK_ACTION_TYPES.SALE_DEDUCTION:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs whitespace-nowrap">
            <Receipt className="w-3.5 h-3.5 text-blue-700" />
            <span>Sale Deduction</span>
          </span>
        );
      case STOCK_ACTION_TYPES.DISPOSAL:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs whitespace-nowrap">
            <Trash2 className="w-3.5 h-3.5 text-rose-700" />
            <span>Disposal</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs whitespace-nowrap">
            <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
            <span>{actionType || 'Stock Correction'}</span>
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Movement & Audit History"
      subtitle="Complete chronological audit trail of all inventory additions, corrections, and dispensing"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs font-bold text-black">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Tamper-evident verified warehouse audit trail</span>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold border-slate-300 hover:border-black text-black cursor-pointer px-4 py-2"
          >
            Close Audit Log
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 font-sans select-none">
        {/* =========================================================================
            3 COLORFUL & COMPACT KPI SUMMARY TILES (Interactive Quick Filters)
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Tile 1: Total Inbound Units */}
          <div
            onClick={() => {
              setFilterAction(STOCK_ACTION_TYPES.ADD_STOCK);
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex items-center justify-between gap-2 ${
              filterAction === STOCK_ACTION_TYPES.ADD_STOCK
                ? 'border-emerald-400 ring-2 ring-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-teal-50'
                : 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 hover:border-emerald-400'
            }`}
            title="Filter by Inbound Stock Additions"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                <PackagePlus className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-950">
                  Total Inbound
                </span>
                <span className="text-[10px] text-black font-semibold block mt-0.5">
                  Shipment received
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-emerald-950 font-mono">
                +{metrics.totalAdded.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tile 2: Total Dispensed / Outflow Units */}
          <div
            onClick={() => {
              setFilterAction(STOCK_ACTION_TYPES.SALE_DEDUCTION);
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex items-center justify-between gap-2 ${
              filterAction === STOCK_ACTION_TYPES.SALE_DEDUCTION
                ? 'border-blue-400 ring-2 ring-blue-200 bg-gradient-to-br from-blue-100 via-white to-cyan-50'
                : 'border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-white to-cyan-50/30 hover:border-blue-400'
            }`}
            title="Filter by Counter Sales Deductions"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center shrink-0 shadow-2xs">
                <Receipt className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-blue-950">
                  Total Dispensed
                </span>
                <span className="text-[10px] text-black font-semibold block mt-0.5">
                  Counter sales dispensed
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-blue-950 font-mono">
                -{metrics.totalDeducted.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tile 3: Total Audit Logs */}
          <div
            onClick={() => {
              setFilterAction('ALL');
              setSearchQuery('');
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex items-center justify-between gap-2 ${
              filterAction === 'ALL' && !searchQuery
                ? 'border-purple-400 ring-2 ring-purple-200 bg-gradient-to-br from-purple-100 via-white to-fuchsia-50'
                : 'border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-fuchsia-50/30 hover:border-purple-400'
            }`}
            title="View All Audit Logs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center shrink-0 shadow-2xs">
                <History className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block text-purple-950">
                  Audit History Logs
                </span>
                <span className="text-[10px] text-black font-semibold block mt-0.5">
                  Total logged events
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-black font-mono">
                {metrics.totalEvents}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SEARCH, ACTION FILTER CHIPS & CONTROLS
            ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-2.5 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            {/* Search Bar with Instant Clear */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by medicine, batch number, employee, invoice, or reason..."
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
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-black shrink-0" />
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-black cursor-pointer transition-colors min-w-[170px]"
              >
                <option value="ALL">All Movements ({history.length})</option>
                {Object.values(STOCK_ACTION_TYPES).map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>

              {(searchQuery || filterAction !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterAction('ALL');
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  title="Reset filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Pills (Clickable Chips) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-black uppercase tracking-wider">Quick:</span>
            {[
              { label: 'All', value: 'ALL' },
              { label: '+ Add Stock', value: STOCK_ACTION_TYPES.ADD_STOCK },
              { label: 'Sale Deduction', value: STOCK_ACTION_TYPES.SALE_DEDUCTION },
              { label: '- Remove Stock', value: STOCK_ACTION_TYPES.REMOVE_STOCK },
              { label: 'Disposal', value: STOCK_ACTION_TYPES.DISPOSAL },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setFilterAction(tab.value);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                  filterAction === tab.value
                    ? 'bg-black text-white border-black shadow-2xs'
                    : 'bg-slate-50 text-black border-slate-300 hover:border-black hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================================
            AUDIT HISTORY TABLE (Matching Medicine Counter & Inventory Standards)
            ========================================================================= */}
        <div className="w-full bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="max-h-[440px] overflow-y-auto overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse table-auto text-xs">
              <thead className="bg-slate-100/95 sticky top-0 z-10 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date & Time</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Medicine & Batch</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Action Type</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Movement (Prev → Delta → New)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Verified By</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Audit Reason & Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs bg-white">
                {paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-black">
                      <History className="w-8 h-8 mx-auto mb-2 text-neutral-400 stroke-[1.5]" />
                      <p className="font-bold text-black text-sm">No stock history records found</p>
                      <p className="text-xs text-black font-medium mt-0.5">
                        Try adjusting your search query or quick filter selection.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((item, idx) => {
                    const medName = medicineMap.get(item.medicineId) || item.medicineId;
                    const batchCode = batchMap.get(item.batchId) || item.batchId;
                    const isPositive = item.changedQuantity > 0;
                    const isNegative = item.changedQuantity < 0;

                    return (
                      <tr
                        key={item.stockHistoryId || `hist_${item.dateTime || idx}_${idx}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* 1. Date & Time */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-black">
                            <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="font-bold text-xs text-black">
                              {formatDateTime(item.dateTime)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Medicine & Batch */}
                        <td className="py-2.5 px-3">
                          <div>
                            <p className="font-bold text-black text-xs leading-tight">
                              {medName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-bold text-black bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300">
                                {batchCode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Action Type Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {getActionBadge(item.actionType)}
                        </td>

                        {/* 4. Movement (Prev → Delta → New) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                            {/* Previous Quantity */}
                            <span className="font-bold text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.previousQuantity}
                            </span>

                            {/* Delta Pill */}
                            <span
                              className={`font-black px-2 py-0.5 rounded-full border shadow-2xs text-xs ${
                                isPositive
                                  ? 'text-emerald-950 bg-emerald-100 border-emerald-300'
                                  : isNegative
                                  ? 'text-rose-950 bg-rose-100 border-rose-300'
                                  : 'text-black bg-slate-100 border-slate-300'
                              }`}
                            >
                              {isPositive ? `+${item.changedQuantity}` : item.changedQuantity}
                            </span>

                            <ArrowRight className="w-3.5 h-3.5 text-black shrink-0" />

                            {/* New Shelf Quantity */}
                            <span className="font-black text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                              {item.newQuantity}
                            </span>
                          </div>
                        </td>

                        {/* 5. Verified By (Staff User) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-black">
                            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-black" />
                            </span>
                            <span className="font-bold text-xs text-black">
                              {item.employeeName || item.employeeId || 'Staff'}
                            </span>
                          </div>
                        </td>

                        {/* 6. Reason / Audit Notes */}
                        <td className="py-2.5 px-3">
                          <p className="text-xs font-semibold text-black leading-snug">
                            {item.reason}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-t border-slate-300 text-xs text-black font-semibold select-none">
              <span>
                Showing <strong className="font-bold text-black">{(safePage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong className="font-bold text-black">{Math.min(safePage * itemsPerPage, filteredHistory.length)}</strong> of{' '}
                <strong className="font-bold text-black">{filteredHistory.length}</strong> movements
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="px-2 text-xs font-bold text-black">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StockHistoryModal;
