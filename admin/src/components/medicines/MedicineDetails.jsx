import { useState } from 'react';
import {
  Pill,
  Layers,
  Plus,
  Edit2,
  Tag,
  Building2,
  Boxes,
  MapPin,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  FlaskConical,
  Copy,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { BatchForm } from '../batches/BatchForm';
import { StockAdjustModal } from '../inventory/StockAdjustModal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate, getCleanMedicineName } from '../../utils/formatters';

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
  const toast = useToast();
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [adjustingBatch, setAdjustingBatch] = useState(null);

  if (!medicine) return null;

  const cleanName = getCleanMedicineName(medicine);
  const totalStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const availableStock = batches
    .filter((b) => b.canSell)
    .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  const isOutOfStock = availableStock === 0;
  const isLowStock = availableStock > 0 && availableStock <= (medicine.minStockAlert || 15);

  const handleCopy = (text, label) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text));
      toast.showInfo(`Copied ${label}: "${text}"`);
    }
  };

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
        title={
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1C9A58] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Pill className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {cleanName}
                </span>
                {medicine.type && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {medicine.type}
                  </span>
                )}
                {medicine.strength && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {medicine.strength}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 mt-1">
                <span
                  onClick={() => handleCopy(medicine.medicineId, 'Medicine ID')}
                  className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer transition-colors"
                  title="Click to copy Medicine ID"
                >
                  {medicine.medicineId}
                </span>
                {medicine.genericName && (
                  <span
                    onClick={() => handleCopy(medicine.genericName, 'Generic Formula')}
                    className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-black cursor-pointer truncate max-w-[200px] sm:max-w-none"
                    title="Click to copy Generic Formulation"
                  >
                    <FlaskConical className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="text-slate-400">Generic:</span>
                    <strong className="text-slate-800 font-semibold truncate hover:underline">
                      {medicine.genericName}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        size="xl"
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            {/* Stock Summary Pill */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span className="truncate">
                <strong className="text-slate-900 font-bold">{totalStock}</strong> units total in{' '}
                <strong className="text-slate-900 font-bold">{batches.length}</strong> batch
                {batches.length === 1 ? '' : 'es'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none text-xs font-bold px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:text-black hover:bg-slate-100 cursor-pointer transition-all text-center"
              >
                Close
              </button>
              {hasPermission('medicines', 'edit') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(medicine);
                  }}
                  className="flex-1 sm:flex-none bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-4 py-2 rounded-lg shadow-2xs hover:shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Medicine</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-3 sm:space-y-3.5">
          {/* ========================================================
              1. CLEAN, HIGH-CONTRAST KEY METRICS (2x2 on mobile, 4 on desktop)
              ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* SELLING PRICE */}
            <div
              onClick={() => handleCopy(medicine.sellingPrice, 'Selling Price')}
              className="p-2.5 sm:p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors cursor-pointer"
              title="Click to copy selling price"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Price</span>
              </div>
              <p className="text-base sm:text-lg font-extrabold text-[#1C9A58] mt-1 tabular-nums">
                {formatCurrency(medicine.sellingPrice)}
              </p>
            </div>

            {/* AVAILABLE STOCK */}
            <div
              onClick={() => {
                toast.showInfo(`Total available inventory: ${availableStock} units across ${batches.length} batch(es)`);
              }}
              className={`p-2.5 sm:p-3 rounded-xl border transition-colors cursor-pointer ${
                isOutOfStock
                  ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70'
                  : isLowStock
                  ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                  : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
              }`}
              title="Click for stock details"
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1 text-slate-700">
                  <Boxes className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Stock</span>
                </span>
                {isOutOfStock ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-full border border-rose-300">
                    Out
                  </span>
                ) : isLowStock ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full border border-amber-300">
                    Low
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-300">
                    In Stock
                  </span>
                )}
              </div>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 tabular-nums">
                {availableStock}{' '}
                <span className="text-xs font-semibold text-slate-500">units</span>
              </p>
            </div>

            {/* CATEGORY */}
            <div
              onClick={() => handleCopy(medicine.category, 'Category')}
              className="p-2.5 sm:p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition-colors cursor-pointer"
              title="Click to copy category"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Category</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate" title={medicine.category}>
                {medicine.category || 'General'}
              </p>
            </div>

            {/* STORAGE LOCATION */}
            <div
              onClick={() => handleCopy(medicine.location, 'Shelf Location')}
              className="p-2.5 sm:p-3 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50/70 transition-colors cursor-pointer"
              title="Click to copy storage shelf"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Shelf Rack</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-1 truncate" title={medicine.location}>
                {medicine.location || 'Shelf Rack'}
              </p>
            </div>
          </div>

          {/* ========================================================
              2. ACTIVE BATCHES & DISPENSING STOCK (PRIMARY PHARMACY VIEW)
              ======================================================== */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1C9A58] border border-emerald-200 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Active Batches ({batches.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Batches in inventory with expiry dates & rates
                  </p>
                </div>
              </div>

              {hasPermission('inventory', 'add') && (
                <button
                  type="button"
                  onClick={() => setIsAddingBatch(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1C9A58] hover:text-white bg-emerald-50 hover:bg-[#1C9A58] border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Batch</span>
                </button>
              )}
            </div>

            {batches.length === 0 ? (
              <div className="p-5 rounded-lg border border-dashed border-slate-200 text-center text-slate-500 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-800">No stock batches registered yet for this medicine.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Register a batch to start dispensing at the counter.</p>
                {hasPermission('inventory', 'add') && (
                  <button
                    type="button"
                    onClick={() => setIsAddingBatch(true)}
                    className="mt-2 text-xs text-white bg-[#1C9A58] hover:bg-[#158046] font-bold px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Register Batch
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                {batches.map((b) => {
                  const daysLeft = b.daysLeft !== undefined ? b.daysLeft : 0;
                  const isExpired = b.isExpired;
                  const isNearExp = b.isNearExpiry;

                  return (
                    <div
                      key={b.batchId || b.id || b.batchNumber}
                      onClick={() => setAdjustingBatch(b)}
                      className="p-2.5 sm:p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/30 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs cursor-pointer group"
                      title="Click to adjust batch stock"
                    >
                      {/* Left: Batch Info & Expiry */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(b.batchNumber, 'Batch Number');
                          }}
                          className="font-mono text-xs font-bold text-slate-900 bg-white group-hover:border-emerald-300 px-2 py-0.5 rounded border border-slate-300 shadow-2xs transition-colors"
                          title="Click to copy batch number"
                        >
                          {b.batchNumber}
                        </span>

                        {isExpired ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Expired
                          </span>
                        ) : isNearExp ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Expires in {daysLeft}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Valid ({daysLeft}d)
                          </span>
                        )}

                        <span className="text-[11px] text-slate-600 font-medium">
                          Exp: <strong className="text-slate-900 font-semibold">{formatDate(b.expiryDate)}</strong>
                        </span>
                      </div>

                      {/* Right: Quantity, Price & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Qty:</span>
                          <span className="text-slate-900 font-extrabold text-sm">{b.quantity}</span>
                          <span className="text-[11px] text-slate-500">units</span>
                        </div>

                        <div className="text-[#1C9A58] font-bold text-sm tabular-nums">
                          {formatCurrency(b.sellingPrice)}
                        </div>

                        <div className="flex items-center gap-1 pl-1">
                          {hasPermission('inventory', 'edit') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdjustingBatch(b);
                              }}
                              className="text-[11px] font-bold text-slate-700 hover:text-[#1C9A58] bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 px-2 py-1 rounded transition-colors"
                              title="Adjust Stock Quantity"
                            >
                              Adjust
                            </button>
                          )}
                          {hasPermission('inventory', 'edit') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBatch(b);
                              }}
                              className="p-1 text-slate-400 hover:text-black hover:bg-slate-200 rounded transition-colors"
                              title="Edit Batch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              3. CLINICAL NOTES & SPECIFICATIONS (COMPACT & CLEAN)
              ======================================================== */}
          <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Clinical Details & Specifications
              </h4>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              {medicine.usage || 'Standard clinical administration as prescribed by medical practitioner.'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
              <div
                onClick={() => handleCopy(medicine.manufacturer, 'Manufacturer')}
                className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                title="Click to copy manufacturer"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-500 font-medium">Manufacturer:</span>
                <span className="font-bold text-slate-900 truncate">{medicine.manufacturer || 'N/A'}</span>
              </div>

              {medicine.formula && (
                <div
                  onClick={() => handleCopy(medicine.formula, 'Chemical Formula')}
                  className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors truncate"
                  title="Click to copy chemical formula"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-500 font-medium shrink-0">Formula:</span>
                  <span className="font-mono font-bold text-[11px] text-slate-900 truncate">
                    {medicine.formula}
                  </span>
                </div>
              )}
            </div>
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
