import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Edit2,
  Trash2,
  Boxes,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { BATCH_STOCK_STATUS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

export const BatchTable = ({
  batches = [],
  showMedicineCol = true,
  onEditBatch,
  onDeleteBatch,
  onAdjustStock,
}) => {
  const { hasPermission } = useAuth();

  const [sortField, setSortField] = useState('expiryDate');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  const canEdit = hasPermission('inventory', 'edit');
  const canDelete = hasPermission('inventory', 'delete');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBatches = useMemo(() => {
    const sorted = [...batches].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'medicineName') {
        aVal = a.medicineName?.toLowerCase() || '';
        bVal = b.medicineName?.toLowerCase() || '';
      } else if (sortField === 'batchNumber') {
        aVal = a.batchNumber?.toLowerCase() || '';
        bVal = b.batchNumber?.toLowerCase() || '';
      } else if (sortField === 'expiryDate') {
        aVal = new Date(a.expiryDate).getTime() || 0;
        bVal = new Date(b.expiryDate).getTime() || 0;
      } else if (sortField === 'quantity' || sortField === 'purchasePrice' || sortField === 'sellingPrice') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [batches, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedBatches.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBatches = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedBatches.slice(start, start + itemsPerPage);
  }, [sortedBatches, safePage, itemsPerPage]);

  const getStatusBadge = (status, isExpired, isNearExpiry, daysLeft) => {
    if (isExpired || status === BATCH_STOCK_STATUS.EXPIRED) {
      return (
        <Badge variant="danger" dot size="sm">
          Expired
        </Badge>
      );
    }
    if (status === BATCH_STOCK_STATUS.OUT_OF_STOCK) {
      return (
        <Badge variant="danger" dot size="sm">
          Out of Stock
        </Badge>
      );
    }
    if (isNearExpiry || status === BATCH_STOCK_STATUS.NEAR_EXPIRY) {
      return (
        <Badge variant="warning" dot size="sm">
          Near Expiry ({daysLeft}d)
        </Badge>
      );
    }
    if (status === BATCH_STOCK_STATUS.LOW_STOCK) {
      return (
        <Badge variant="warning" dot size="sm">
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge variant="success" dot size="sm">
        In Stock
      </Badge>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden font-sans">
      <div className="w-full overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse table-auto text-xs">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none">
              {showMedicineCol && (
                <th
                  onClick={() => handleSort('medicineName')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1 text-black font-bold">
                    <span>Medicine</span>
                    <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                  </div>
                </th>
              )}

              <th
                onClick={() => handleSort('batchNumber')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1 text-black font-bold">
                  <span>Batch</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              <th
                onClick={() => handleSort('quantity')}
                className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1 text-black font-bold">
                  <span>Stock</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              <th className="py-2.5 px-3 whitespace-nowrap text-black font-bold">
                <span>Selling</span>
              </th>

              <th className="py-2.5 px-3 whitespace-nowrap text-black font-bold">
                <span>Rack / Shelf</span>
              </th>

              <th
                onClick={() => handleSort('expiryDate')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1 text-black font-bold">
                  <span>Expiry</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              <th className="py-2.5 px-3 text-center whitespace-nowrap text-black font-bold">
                <span>Status</span>
              </th>

              <th className="py-2.5 px-3 text-right whitespace-nowrap text-black font-bold">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs bg-white">
            {paginatedBatches.length === 0 ? (
              <tr>
                <td
                  colSpan={showMedicineCol ? 8 : 7}
                  className="py-12 text-center text-black"
                >
                  <Layers className="w-8 h-8 mx-auto mb-2 text-neutral-400 stroke-[1.5]" />
                  <p className="font-bold text-black text-sm">No batches found</p>
                  <p className="text-xs text-black font-medium mt-0.5">
                    Register a new batch to allocate stock to this medicine.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedBatches.map((batch) => {
                const isExpired = batch.isExpired;
                const isNearExpiry = batch.isNearExpiry;
                const cleanRack = String(batch.rack || 'A-1').replace(/^(rack|r)\s*[:-]?\s*/i, '').trim() || '-';
                const cleanShelf = String(batch.shelf || '1').replace(/^(shelf|s)\s*[:-]?\s*/i, '').trim() || '-';

                return (
                  <tr
                    key={batch.batchId || batch.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isExpired
                        ? 'bg-red-50/30'
                        : isNearExpiry
                        ? 'bg-amber-50/30'
                        : ''
                    }`}
                  >
                    {/* 1. Medicine */}
                    {showMedicineCol && (
                      <td className="py-2.5 px-3">
                        <div>
                          <p className="font-bold text-black text-xs leading-tight">
                            {batch.medicineName}
                          </p>
                          <p className="text-[10px] text-black font-semibold font-mono mt-0.5 truncate max-w-[170px]">
                            {batch.medicineId} • {batch.category || 'General'}
                          </p>
                        </div>
                      </td>
                    )}

                    {/* 2. Batch Number */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-black bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-xs">
                          {batch.batchNumber || batch.batchNo}
                        </span>
                        {isExpired && (
                          <span
                            title="EXPIRED BATCH: Blocked from dispensing"
                            className="inline-flex items-center text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded text-[10px] font-bold"
                          >
                            <ShieldAlert className="w-3 h-3 mr-0.5 text-rose-600" />
                            BLOCKED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Stock Quantity */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {batch.quantity === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          0 units
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-900 border border-rose-300 line-through">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          {batch.quantity} units
                        </span>
                      ) : batch.quantity <= 20 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          {batch.quantity} units
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          {batch.quantity} units
                        </span>
                      )}
                    </td>

                    {/* 4. Cost / Selling */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-[#1C9A58] tabular-nums">
                          {formatCurrency(batch.sellingPrice)}
                        </p>
                        <p className="text-[10px] text-black font-semibold tabular-nums">
                          Cost: {formatCurrency(batch.purchasePrice)}
                        </p>
                      </div>
                    </td>

                    {/* 5. Rack / Shelf */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs text-black">
                        {cleanRack}, {cleanShelf}
                      </span>
                    </td>

                    {/* 6. Expiry Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span
                          className={`text-[11px] font-bold block ${
                            isExpired
                              ? 'text-rose-600 font-extrabold'
                              : isNearExpiry
                              ? 'text-amber-700 font-extrabold'
                              : 'text-black'
                          }`}
                        >
                          {formatDate(batch.expiryDate)}
                        </span>
                        {batch.daysLeft !== undefined && (
                          <p
                            className={`text-[10px] font-bold ${
                              isExpired
                                ? 'text-rose-600'
                                : isNearExpiry
                                ? 'text-amber-700'
                                : 'text-black font-semibold'
                            }`}
                          >
                            {isExpired
                              ? `Expired ${Math.abs(batch.daysLeft)} days ago`
                              : `${batch.daysLeft} days remaining`}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* 7. Stock Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(
                        batch.status,
                        isExpired,
                        isNearExpiry,
                        batch.daysLeft
                      )}
                    </td>

                    {/* 8. Actions (Readable Well-Sized Action Buttons) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && onAdjustStock && (
                          <button
                            type="button"
                            onClick={() => onAdjustStock(batch)}
                            title="Adjust / Update Physical Stock"
                            className="px-2.5 py-1 text-xs font-bold text-[#1C9A58] bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Boxes className="w-3.5 h-3.5 stroke-[2.2]" />
                            <span>Stock</span>
                          </button>
                        )}

                        {canEdit && onEditBatch && (
                          <button
                            type="button"
                            onClick={() => onEditBatch(batch)}
                            title="Edit Batch Specifications"
                            className="p-1 text-black hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[2.2]" />
                          </button>
                        )}

                        {canDelete && onDeleteBatch && (
                          <button
                            type="button"
                            onClick={() => onDeleteBatch(batch)}
                            title="Delete Batch from Inventory"
                            className="p-1 text-black hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Rows-Per-Page Footer (Matching Medicine Counter) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-300 text-xs text-black font-semibold select-none">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="font-bold text-black">{(safePage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="font-bold text-black">{Math.min(safePage * itemsPerPage, sortedBatches.length)}</strong> of{' '}
            <strong className="font-bold text-black">{sortedBatches.length}</strong> batches
          </span>

          {/* Rows Per Page Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-black font-bold text-xs">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-black font-bold focus:outline-none focus:border-black cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <span className="text-black font-bold text-xs">per page</span>
          </div>
        </div>

        {/* Pagination Controls */}
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
    </div>
  );
};

export default BatchTable;
