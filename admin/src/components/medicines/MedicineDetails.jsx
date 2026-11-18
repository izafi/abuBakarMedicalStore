import { useState } from 'react';
import {
  Pill,
  Layers,
  Plus,
  Edit2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BatchTable } from '../batches/BatchTable';
import { BatchForm } from '../batches/BatchForm';
import { StockAdjustModal } from '../inventory/StockAdjustModal';
import { useAuth } from '../../hooks/useAuth';

export const MedicineDetails = ({
  isOpen,
  onClose,
  medicine,
  batches = [],
  allBatches = [],
  onEdit,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
  onAdjustStock,
}) => {
  const { hasPermission } = useAuth();
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [adjustingBatch, setAdjustingBatch] = useState(null);

  if (!medicine) return null;

  const totalStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const availableStock = batches
    .filter((b) => b.canSell)
    .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  const handleSaveBatch = (batchData, reason) => {
    if (editingBatch) {
      if (onUpdateBatch) {
        onUpdateBatch(editingBatch.batchId || editingBatch.id, batchData, reason);
      }
      setEditingBatch(null);
    } else {
      if (onAddBatch) {
        onAddBatch(batchData, reason);
      }
      setIsAddingBatch(false);
    }
  };

  const handleApplyAdjustment = ({ batchId, delta, actionType, reason }) => {
    if (onAdjustStock) {
      onAdjustStock({ batchId, delta, actionType, reason });
    }
    setAdjustingBatch(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${medicine.name}`}
        subtitle={`Medicine ID: ${medicine.medicineId} • Brand: ${medicine.brand}`}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {hasPermission('medicines', 'edit') && (
              <Button
                variant="primary"
                iconLeft={Edit2}
                onClick={() => {
                  onClose();
                  onEdit(medicine);
                }}
              >
                Edit Medicine Specs
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {/* Medicine Overview Hero Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#1C9A58] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-950/10 shrink-0">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-gray-900">{medicine.name}</h3>
                  <Badge variant="primary">{medicine.type}</Badge>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Generic: <strong>{medicine.genericName}</strong> ({medicine.strength})
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Total Stock / Available
              </span>
              <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                <span className="text-2xl font-black text-gray-900">
                  {availableStock}
                  <span className="text-xs font-normal text-gray-400"> / {totalStock} units</span>
                </span>
                <Badge
                  variant={
                    availableStock === 0
                      ? 'danger'
                      : availableStock <= medicine.minStockAlert
                      ? 'warning'
                      : 'success'
                  }
                  dot
                >
                  {availableStock === 0
                    ? 'Out of Stock'
                    : availableStock <= medicine.minStockAlert
                    ? 'Low Stock'
                    : 'In Stock'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Detailed Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Formulation & Chemistry
              </span>
              <div>
                <span className="text-gray-500">Commercial Brand:</span>
                <p className="font-semibold text-gray-800">{medicine.brand || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Active Chemical Composition:</span>
                <p className="font-semibold text-gray-800 leading-relaxed">{medicine.formula || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Category Classification:</span>
                <p className="font-semibold text-gray-800">{medicine.category || 'N/A'}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Manufacturing & Clinical Application
              </span>
              <div>
                <span className="text-gray-500">Manufacturer / Company:</span>
                <p className="font-semibold text-gray-800">{medicine.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Therapeutic Indications:</span>
                <p className="font-semibold text-gray-800 leading-relaxed">{medicine.usage || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Low-Stock Alert Threshold:</span>
                <p className="font-semibold text-gray-800">{medicine.minStockAlert} units</p>
              </div>
            </div>
          </div>

          {/* Batches Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1C9A58]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Multiple Stock Batches ({batches.length})
                </h4>
              </div>

              {hasPermission('inventory', 'add') && (
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={Plus}
                  onClick={() => setIsAddingBatch(true)}
                  className="text-xs font-semibold"
                >
                  Add Batch to this Medicine
                </Button>
              )}
            </div>

            {/* Reusable BatchTable Component */}
            <BatchTable
              batches={batches}
              showMedicineCol={false}
              onEditBatch={(b) => setEditingBatch(b)}
              onDeleteBatch={(b) => onDeleteBatch && onDeleteBatch(b.batchId || b.id)}
              onAdjustStock={(b) => setAdjustingBatch(b)}
            />
          </div>
        </div>
      </Modal>

      {/* Add / Edit Batch Modal */}
      {(isAddingBatch || editingBatch) && (
        <BatchForm
          key={editingBatch ? editingBatch.batchId || editingBatch.id : 'add-batch-details'}
          isOpen={isAddingBatch || Boolean(editingBatch)}
          onClose={() => {
            setIsAddingBatch(false);
            setEditingBatch(null);
          }}
          onSave={handleSaveBatch}
          initialData={editingBatch}
          fixedMedicineId={medicine.medicineId}
          medicines={[medicine]}
          existingBatches={allBatches}
        />
      )}

      {/* Quick Stock Adjust Modal */}
      {adjustingBatch && (
        <StockAdjustModal
          isOpen={Boolean(adjustingBatch)}
          onClose={() => setAdjustingBatch(null)}
          batch={adjustingBatch}
          onApplyAdjustment={handleApplyAdjustment}
        />
      )}
    </>
  );
};

export default MedicineDetails;
