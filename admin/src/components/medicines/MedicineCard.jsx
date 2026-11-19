import { Eye, Edit2, Trash2, MapPin, Building2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency, getCleanMedicineName } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const MedicineCard = ({
  medicine,
  onViewDetails,
  onEdit,
  onDelete,
}) => {
  const { hasPermission } = useAuth();
  const isOutOfStock = medicine.stock === 0;
  const isLowStock = medicine.stock > 0 && medicine.stock <= medicine.minStockAlert;
  const cleanName = getCleanMedicineName(medicine);

  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-xl border border-slate-300 p-4 shadow-xs hover:border-black transition-all group">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="font-mono text-[10px] font-bold text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                {medicine.medicineId}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-black border border-slate-300">
                {medicine.type}
              </span>
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-black leading-snug">
              {cleanName}
            </h3>
            <p className="text-[11px] text-black font-semibold mt-0.5">
              {medicine.genericName}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="font-black text-sm sm:text-base text-black tabular-nums">
              {formatCurrency(medicine.sellingPrice)}
            </span>
          </div>
        </div>

        {/* Specs & Meta */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-black font-semibold text-[11px] truncate">
              <Building2 className="w-3.5 h-3.5 text-black shrink-0" />
              <span className="truncate">{medicine.manufacturer || 'N/A'}</span>
            </span>
            <span className="text-[11px] font-bold text-black shrink-0">
              {medicine.strength}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-black font-bold text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
              <span>{medicine.location || 'Store Shelf'}</span>
            </span>

            <div>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  Low ({medicine.stock})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  {medicine.stock} units
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-1.5">
        <Button
          variant="outline"
          size="sm"
          iconLeft={Eye}
          onClick={() => onViewDetails(medicine)}
          className="text-xs font-bold text-black border-slate-300 hover:border-black flex-1 h-7"
        >
          Details
        </Button>

        <div className="flex items-center gap-1 shrink-0">
          {hasPermission('medicines', 'edit') && (
            <button
              type="button"
              onClick={() => onEdit(medicine)}
              className="text-black hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-md transition-colors cursor-pointer"
              title="Edit Medicine"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {hasPermission('medicines', 'delete') && (
            <button
              type="button"
              onClick={() => onDelete(medicine)}
              className="text-black hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-md transition-colors cursor-pointer"
              title="Delete Medicine"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicineCard;
