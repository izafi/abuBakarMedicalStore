import { Eye, Edit2, Trash2, MapPin, Building2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
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

  return (
    <Card hoverEffect className="flex flex-col justify-between h-full border-gray-100/90">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                {medicine.medicineId}
              </span>
              <Badge variant="primary" size="sm">
                {medicine.type}
              </Badge>
            </div>
            <h3 className="font-bold text-sm text-gray-900 leading-snug">
              {medicine.name}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {medicine.genericName}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="font-extrabold text-base text-[#1C9A58]">
              {formatCurrency(medicine.sellingPrice)}
            </span>
          </div>
        </div>

        {/* Specs & Meta */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500 text-[11px] truncate">
              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{medicine.manufacturer}</span>
            </span>
            <span className="text-[11px] font-semibold text-gray-700 shrink-0">
              {medicine.strength}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{medicine.location || 'Store Shelf'}</span>
            </span>

            <div>
              {isOutOfStock ? (
                <Badge variant="danger" size="sm" dot>
                  Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge variant="warning" size="sm" dot>
                  Low: {medicine.stock}
                </Badge>
              ) : (
                <Badge variant="success" size="sm" dot>
                  {medicine.stock} units
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
        <Button
          variant="outline"
          size="sm"
          iconLeft={Eye}
          onClick={() => onViewDetails(medicine)}
          className="text-xs font-semibold flex-1"
        >
          Details
        </Button>

        <div className="flex items-center gap-1 shrink-0">
          {hasPermission('medicines', 'edit') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(medicine)}
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
              onClick={() => onDelete(medicine)}
              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5"
              title="Delete Medicine"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MedicineCard;
