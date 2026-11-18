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
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
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

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case STOCK_ACTION_TYPES.ADD_STOCK:
        return (
          <Badge variant="success" iconLeft={ArrowUpRight} size="sm">
            Add Stock
          </Badge>
        );
      case STOCK_ACTION_TYPES.REMOVE_STOCK:
        return (
          <Badge variant="warning" iconLeft={ArrowDownRight} size="sm">
            Remove Stock
          </Badge>
        );
      case STOCK_ACTION_TYPES.SALE_DEDUCTION:
        return (
          <Badge variant="primary" iconLeft={Receipt} size="sm">
            Sale Deduction
          </Badge>
        );
      case STOCK_ACTION_TYPES.DISPOSAL:
        return (
          <Badge variant="danger" iconLeft={Trash2} size="sm">
            Disposal
          </Badge>
        );
      default:
        return (
          <Badge variant="default" iconLeft={RefreshCw} size="sm">
            {actionType || 'Update'}
          </Badge>
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
        <Button variant="outline" onClick={onClose}>
          Close Audit Log
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search & Action Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by medicine, batch number, employee, or reason..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-transparent text-gray-900"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-9 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] text-gray-800"
            >
              <option value="ALL">All Movements ({history.length})</option>
              {Object.values(STOCK_ACTION_TYPES).map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="max-h-[500px] overflow-y-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200/80 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Medicine & Batch</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3 text-center">Movement (Prev → New)</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="font-semibold text-gray-600">No stock history records</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Stock adjustments and sales will generate permanent log entries here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, idx) => {
                  const medName = medicineMap.get(item.medicineId) || item.medicineId;
                  const batchCode = batchMap.get(item.batchId) || item.batchId;
                  const isPositive = item.changedQuantity > 0;
                  const isNegative = item.changedQuantity < 0;

                  return (
                    <tr
                      key={item.stockHistoryId || `hist_${item.dateTime || idx}_${idx}`}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatDateTime(item.dateTime)}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div>
                          <p className="font-bold text-gray-900">{medName}</p>
                          <p className="text-[10px] font-mono text-gray-400">
                            Batch: {batchCode}
                          </p>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getActionBadge(item.actionType)}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-xs">
                          <span className="text-gray-400 font-medium">
                            {item.previousQuantity}
                          </span>
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                              isPositive
                                ? 'text-emerald-700 bg-emerald-50'
                                : isNegative
                                ? 'text-red-700 bg-red-50'
                                : 'text-gray-600 bg-gray-100'
                            }`}
                          >
                            {isPositive ? `+${item.changedQuantity}` : item.changedQuantity}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-bold text-gray-900">
                            {item.newQuantity}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-700">
                          <User className="w-3 h-3 text-gray-400" />
                          <span>{item.employeeName || item.employeeId}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-gray-600 text-xs">
                          {item.reason}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default StockHistoryModal;
