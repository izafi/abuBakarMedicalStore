import { useState, useMemo } from 'react';
import { Eye, Edit2, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency, getCleanMedicineName } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const MedicineTable = ({
  medicines = [],
  onViewDetails,
  onEdit,
  onDelete,
  pageSize = 30,
}) => {
  const { hasPermission } = useAuth();
  const [itemsPerPage, setItemsPerPage] = useState(pageSize || 30);
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

  const totalPages = Math.ceil(sortedMedicines.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = sortedMedicines.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  return (
    <div className="w-full bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
      <div className="w-full">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider">
              {/* ID */}
              <th
                onClick={() => handleSort('medicineId')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none w-18 whitespace-nowrap"
              >
                <div className="flex items-center gap-1 whitespace-nowrap text-black font-bold">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              {/* Product Name & Generic Formula */}
              <th
                onClick={() => handleSort('name')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1 whitespace-nowrap text-black font-bold">
                  <span>Product & Generic Formula</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              {/* Type / Strength */}
              <th
                onClick={() => handleSort('type')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none w-32 whitespace-nowrap"
              >
                <div className="flex items-center gap-1 whitespace-nowrap text-black font-bold">
                  <span>Type / Strength</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              {/* Sell Price */}
              <th
                onClick={() => handleSort('sellingPrice')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none w-22 whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1 whitespace-nowrap text-black font-bold">
                  <span>Sell Price</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              {/* Total Stock */}
              <th
                onClick={() => handleSort('stock')}
                className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/60 select-none w-26 whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1 whitespace-nowrap text-black font-bold">
                  <span>Total Stock</span>
                  <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                </div>
              </th>

              {/* Storage Location */}
              <th className="py-2.5 px-3 w-24 whitespace-nowrap text-black font-bold">
                <span>Location</span>
              </th>

              {/* Actions */}
              <th className="py-2.5 px-3 text-right w-20 whitespace-nowrap text-black font-bold">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm bg-white">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-black">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-neutral-400" />
                    <span className="text-sm font-bold text-black">
                      No medicines found
                    </span>
                    <span className="text-xs text-neutral-700">
                      Try adjusting your search query or filters
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((med) => {
                const cleanName = getCleanMedicineName(med);
                return (
                  <tr
                    key={med.medicineId}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* ID */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                        {med.medicineId}
                      </span>
                    </td>

                    {/* Product Name (clean) & Generic Formula */}
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-bold text-black text-xs leading-tight">
                          {cleanName}
                        </p>
                        <p className="text-[11px] text-neutral-900 font-medium leading-tight mt-0.5 truncate max-w-[240px]">
                          {med.genericName}
                        </p>
                      </div>
                    </td>

                    {/* Type / Strength */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-black bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                          {med.type}
                        </span>
                        <span className="text-[11px] text-black font-semibold">
                          {med.strength}
                        </span>
                      </div>
                    </td>

                    {/* Sell Price */}
                    <td className="py-2.5 px-3 text-right font-bold text-black text-xs whitespace-nowrap tabular-nums">
                      {formatCurrency(med.sellingPrice)}
                    </td>

                    {/* Total Stock */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {med.stock === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          Out of Stock
                        </span>
                      ) : med.stock <= med.minStockAlert ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          Low ({med.stock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          {med.stock} units
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3 text-[11px] text-black font-mono font-bold whitespace-nowrap">
                      {med.location || 'Shelf'}
                    </td>

                    {/* Actions (Always fully visible, no cut off) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewDetails(med)}
                          className="p-1 text-black hover:text-[#1C9A58] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {hasPermission('medicines', 'edit') && (
                          <button
                            type="button"
                            onClick={() => onEdit(med)}
                            className="p-1 text-black hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasPermission('medicines', 'delete') && (
                          <button
                            type="button"
                            onClick={() => onDelete(med)}
                            className="p-1 text-black hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Pagination & Rows-Per-Page Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-300 text-xs text-black font-semibold">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="font-bold text-black">{(safePage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="font-bold text-black">{Math.min(safePage * itemsPerPage, sortedMedicines.length)}</strong> of{' '}
            <strong className="font-bold text-black">{sortedMedicines.length}</strong> items
          </span>

          {/* Rows Per Page Selector (5, 10, 15, 20, 30, 50) */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
            <span className="text-[11px] text-black font-bold">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-6 px-1.5 text-xs font-bold text-black bg-white border border-slate-300 rounded hover:border-black focus:outline-none focus:border-black cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <span className="text-[11px] text-black font-bold">per page</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="text-xs h-7 px-2 font-bold border-slate-300 text-black hover:bg-white hover:border-black disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5 text-black" />
            Prev
          </Button>
          <span className="px-2 text-xs font-bold text-black">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="text-xs h-7 px-2 font-bold border-slate-300 text-black hover:bg-white hover:border-black disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-black" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MedicineTable;
