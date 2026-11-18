import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Edit2,
  Trash2,
  Boxes,
  MapPin,
  Calendar,
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
  const itemsPerPage = 8;

  const canEdit = hasPermission('inventory', 'edit');
  const canDelete = hasPermission('inventory', 'delete');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
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
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedBatches.slice(start, start + itemsPerPage);
  }, [sortedBatches, currentPage, itemsPerPage]);

  const getStatusBadge = (status, isExpired, isNearExpiry, daysLeft) => {
    if (isExpired || status === BATCH_STOCK_STATUS.EXPIRED) {
      return (
        <Badge variant="danger" dot>
          Expired
        </Badge>
      );
    }
    if (status === BATCH_STOCK_STATUS.OUT_OF_STOCK) {
      return (
        <Badge variant="default" dot>
          Out of Stock
        </Badge>
      );
    }
    if (isNearExpiry || status === BATCH_STOCK_STATUS.NEAR_EXPIRY) {
      return (
        <Badge variant="warning" dot>
          Near Expiry ({daysLeft}d)
        </Badge>
      );
    }
    if (status === BATCH_STOCK_STATUS.LOW_STOCK) {
      return (
        <Badge variant="warning" dot>
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge variant="success" dot>
        In Stock
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold select-none">
              {showMedicineCol && (
                <th
                  onClick={() => handleSort('medicineName')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Medicine Master</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
              )}

              <th
                onClick={() => handleSort('batchNumber')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Batch Number</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('quantity')}
                className="py-3 px-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Stock Quantity</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th className="py-3 px-4">
                <span>Cost / Selling</span>
              </th>

              <th className="py-3 px-4">
                <span>Rack / Shelf</span>
              </th>

              <th
                onClick={() => handleSort('expiryDate')}
                className="py-3 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Expiry Date</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th className="py-3 px-4">
                <span>Stock Status</span>
              </th>

              <th className="py-3 px-4 text-right">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-gray-700">
            {paginatedBatches.length === 0 ? (
              <tr>
                <td
                  colSpan={showMedicineCol ? 8 : 7}
                  className="py-12 text-center text-gray-400"
                >
                  <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                  <p className="font-semibold text-gray-600">No batches found</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Register a new batch to allocate stock to this medicine.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedBatches.map((batch) => {
                const isExpired = batch.isExpired;
                const isNearExpiry = batch.isNearExpiry;

                return (
                  <tr
                    key={batch.batchId || batch.id}
                    className={`hover:bg-gray-50/70 transition-colors duration-150 ${
                      isExpired
                        ? 'bg-red-50/20'
                        : isNearExpiry
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {showMedicineCol && (
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-gray-900">
                            {batch.medicineName}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {batch.medicineId} • {batch.category}
                          </p>
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md text-xs">
                          {batch.batchNumber || batch.batchNo}
                        </span>
                        {isExpired && (
                          <span
                            title="EXPIRED BATCH: Cannot be sold"
                            className="inline-flex items-center text-red-600 bg-red-100 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          >
                            <ShieldAlert className="w-3 h-3 mr-0.5" />
                            BLOCKED
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                          batch.quantity === 0
                            ? 'bg-gray-100 text-gray-500'
                            : isExpired
                            ? 'bg-red-100 text-red-700 line-through'
                            : batch.quantity <= 20
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-[#1C9A58]'
                        }`}
                      >
                        {batch.quantity} units
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <p className="text-gray-900 font-semibold">
                          {formatCurrency(batch.sellingPrice)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Cost: {formatCurrency(batch.purchasePrice)}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-gray-700">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="font-medium text-xs">
                          {batch.rack || 'Rack A'}, {batch.shelf || 'Shelf 1'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span
                            className={`font-medium ${
                              isExpired
                                ? 'text-red-600 font-bold'
                                : isNearExpiry
                                ? 'text-amber-700 font-bold'
                                : 'text-gray-700'
                            }`}
                          >
                            {formatDate(batch.expiryDate)}
                          </span>
                        </div>
                        {batch.daysLeft !== undefined && (
                          <p
                            className={`text-[10px] font-medium ${
                              isExpired
                                ? 'text-red-500'
                                : isNearExpiry
                                ? 'text-amber-600'
                                : 'text-gray-400'
                            }`}
                          >
                            {isExpired
                              ? `Expired ${Math.abs(batch.daysLeft)} days ago`
                              : `${batch.daysLeft} days remaining`}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(
                        batch.status,
                        isExpired,
                        isNearExpiry,
                        batch.daysLeft
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && onAdjustStock && (
                          <Button
                            variant="outline"
                            size="sm"
                            iconLeft={Boxes}
                            onClick={() => onAdjustStock(batch)}
                            title="Adjust / Update Stock"
                            className="text-xs px-2 py-1"
                          >
                            Stock
                          </Button>
                        )}

                        {canEdit && onEditBatch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconLeft={Edit2}
                            onClick={() => onEditBatch(batch)}
                            title="Edit Batch Specifications"
                            className="p-1.5"
                          />
                        )}

                        {canDelete && onDeleteBatch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconLeft={Trash2}
                            onClick={() => onDeleteBatch(batch)}
                            title="Delete Batch"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                          />
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, sortedBatches.length)} of{' '}
            {sortedBatches.length} batches
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-semibold text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchTable;
