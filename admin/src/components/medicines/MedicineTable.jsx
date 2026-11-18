import { useState, useMemo } from 'react';
import { Eye, Edit2, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const MedicineTable = ({
  medicines = [],
  onViewDetails,
  onEdit,
  onDelete,
  pageSize = 10,
}) => {
  const { hasPermission } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedMedicines = useMemo(() => {
    return [...medicines].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [medicines, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedMedicines.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = sortedMedicines.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th
                onClick={() => handleSort('medicineId')}
                className="py-3.5 px-4 cursor-pointer hover:text-gray-900 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-gray-900 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Product & Generic Formula</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('type')}
                className="py-3.5 px-4 cursor-pointer hover:text-gray-900 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Type / Strength</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th className="py-3.5 px-4">Category</th>

              <th className="py-3.5 px-4">Manufacturer</th>

              <th
                onClick={() => handleSort('sellingPrice')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-gray-900 select-none"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Sell Price</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('stock')}
                className="py-3.5 px-4 text-center cursor-pointer hover:text-gray-900 select-none"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Total Stock</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              <th className="py-3.5 px-4">Location</th>

              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-gray-300" />
                    <span className="text-sm font-medium text-gray-500">
                      No medicines found
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((med) => (
                <tr
                  key={med.medicineId}
                  className="hover:bg-emerald-50/20 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-gray-600">
                    {med.medicineId}
                  </td>

                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.genericName}</p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Badge size="sm">{med.type}</Badge>
                      <span className="text-xs text-gray-600 font-medium">{med.strength}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-gray-600 font-medium">
                    {med.category}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-gray-500 truncate max-w-[150px]">
                    {med.manufacturer}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-gray-900 text-sm">
                    {formatCurrency(med.sellingPrice)}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {med.stock === 0 ? (
                      <Badge variant="danger" dot>Out of Stock</Badge>
                    ) : med.stock <= med.minStockAlert ? (
                      <Badge variant="warning" dot>Low ({med.stock})</Badge>
                    ) : (
                      <Badge variant="success" dot>{med.stock} units</Badge>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-gray-600 font-mono">
                    {med.location || 'Shelf'}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(med)}
                        className="text-gray-500 hover:text-[#1C9A58] p-1.5"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {hasPermission('medicines', 'edit') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(med)}
                          className="text-gray-500 hover:text-[#1C9A58] p-1.5"
                          title="Edit Medicine"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}

                      {hasPermission('medicines', 'delete') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(med)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5"
                          title="Delete Medicine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {sortedMedicines.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-gray-900">
              {(safePage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-gray-900">
              {Math.min(safePage * pageSize, sortedMedicines.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-gray-900">
              {sortedMedicines.length}
            </span>{' '}
            entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>
            <span className="px-2 text-xs font-semibold text-gray-800">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineTable;
