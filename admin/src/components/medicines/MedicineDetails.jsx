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
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
                  {cleanName}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs cursor-pointer hover:bg-emerald-200 transition-colors"
                  title="Medicine Dosage Form"
                >
                  {medicine.type}
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs cursor-pointer hover:bg-blue-200 transition-colors"
                  title="Dosage Strength"
                >
                  {medicine.strength}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-800 font-medium mt-1">
                <span
                  onClick={() => handleCopy(medicine.medicineId, 'Medicine ID')}
                  className="font-mono text-black font-bold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 shadow-2xs cursor-pointer transition-all"
                  title="Click to copy Medicine ID"
                >
                  {medicine.medicineId}
                </span>
                <span
                  onClick={() => handleCopy(medicine.genericName, 'Generic Formula')}
                  className="flex items-center gap-1 cursor-pointer hover:text-black transition-colors"
                  title="Click to copy Generic Formulation"
                >
                  <FlaskConical className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Generic:</span>
                  <strong className="text-black font-bold hover:underline">{medicine.genericName}</strong>
                </span>
              </div>
            </div>
          </div>
        }
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                {batches.length} stock batch{batches.length === 1 ? '' : 'es'} linked • Physical Stock:{' '}
                <strong className="text-black font-bold">{totalStock}</strong> units
              </span>
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold px-4 py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100 cursor-pointer transition-all"
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
                  className="bg-gradient-to-r from-emerald-600 via-[#1C9A58] to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Medicine</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-3.5">
          {/* ========================================================
              4 COLORFUL, VIBRANT, EYE-CATCHING STAT CARDS
              ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. SELLING PRICE (Emerald Theme) */}
            <div
              onClick={() => handleCopy(medicine.sellingPrice, 'Selling Price')}
              className="p-3 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 shadow-2xs space-y-1 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer"
              title="Click to copy selling price"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Selling Price</span>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-[#1C9A58] tabular-nums tracking-tight">
                {formatCurrency(medicine.sellingPrice)}
              </p>
              <span className="text-[10px] text-neutral-600 font-medium block">
                Standard retail rate
              </span>
            </div>

            {/* 2. AVAILABLE PHYSICAL STOCK (Amber/Emerald Theme) */}
            <div
              onClick={() => {
                toast.showInfo(`Total available inventory: ${availableStock} units across ${batches.length} batch(es)`);
              }}
              className={`p-3 rounded-xl border shadow-2xs space-y-1 transition-all cursor-pointer hover:shadow-xs ${
                isOutOfStock
                  ? 'border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/20 hover:border-rose-400'
                  : isLowStock
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/20 hover:border-amber-400'
                  : 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/20 hover:border-emerald-400'
              }`}
              title="Click for stock summary"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-black uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-black" />
                  <span>Stock Units</span>
                </span>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    Out
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Low
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    In Stock
                  </span>
                )}
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-black tabular-nums tracking-tight">
                {availableStock} <span className="text-xs font-semibold text-neutral-700">units</span>
              </p>
              <span className="text-[10px] text-neutral-600 font-medium block">
                Alert limit: {medicine.minStockAlert || 15} units
              </span>
            </div>

            {/* 3. THERAPEUTIC CATEGORY (Royal Blue Theme) */}
            <div
              onClick={() => handleCopy(medicine.category, 'Category')}
              className="p-3 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 shadow-2xs space-y-1 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
              title="Click to copy category"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Category</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-black truncate" title={medicine.category}>
                {medicine.category || 'General'}
              </p>
              <span className="text-[10px] text-neutral-600 font-medium block">
                Therapeutic class
              </span>
            </div>

            {/* 4. STORAGE SHELF LOCATION (Purple Theme) */}
            <div
              onClick={() => handleCopy(medicine.location, 'Storage Shelf')}
              className="p-3 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-fuchsia-50/30 shadow-2xs space-y-1 hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer"
              title="Click to copy shelf location"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                <span>Storage Shelf</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-black font-mono truncate" title={medicine.location}>
                {medicine.location || 'Shelf Rack'}
              </p>
              <span className="text-[10px] text-neutral-600 font-medium block">
                Store location
              </span>
            </div>
          </div>

          {/* ========================================================
              CLINICAL INDICATIONS & PHARMACEUTICAL SPECS
              ======================================================== */}
          <div className="p-3.5 rounded-xl border border-emerald-100 bg-gradient-to-br from-white via-slate-50/40 to-emerald-50/20 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-black uppercase tracking-wider">
                    Clinical Indications & Specifications
                  </h4>
                  <p className="text-[11px] text-neutral-800 font-medium">
                    Therapeutic medical usage notes and active chemical formulation
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-black font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              {medicine.usage || 'Standard clinical administration as prescribed by medical practitioner.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div
                onClick={() => handleCopy(medicine.manufacturer, 'Manufacturer')}
                className="flex items-center gap-2 p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200/80 hover:border-blue-300 shadow-2xs cursor-pointer transition-all"
                title="Click to copy manufacturer"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-neutral-700 font-medium">Manufacturer:</span>
                <span className="font-bold text-black truncate">{medicine.manufacturer || 'N/A'}</span>
              </div>

              {medicine.formula && (
                <div
                  onClick={() => handleCopy(medicine.formula, 'Chemical Formula')}
                  className="flex items-center gap-2 p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200/80 hover:border-emerald-300 shadow-2xs cursor-pointer transition-all truncate"
                  title="Click to copy chemical formula"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-neutral-700 font-medium shrink-0">Formula:</span>
                  <span
                    className="font-mono font-bold text-[11px] text-black bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate hover:bg-emerald-50"
                  >
                    {medicine.formula}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              ACTIVE INVENTORY BATCHES (VIBRANT & COMPACT)
              ======================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                    Active Batches ({batches.length})
                  </h4>
                  <p className="text-[11px] text-neutral-800 font-medium">
                    Batches currently in stock with expiry dates
                  </p>
                </div>
              </div>

              {hasPermission('inventory', 'add') && (
                <button
                  type="button"
                  onClick={() => setIsAddingBatch(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C9A58] hover:text-white bg-emerald-50 hover:bg-[#1C9A58] border border-emerald-300 px-3 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Batch</span>
                </button>
              )}
            </div>

            {batches.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 bg-slate-50/60">
                <p className="text-xs font-bold text-black">No stock batches registered yet for this medicine.</p>
                <p className="text-[11px] text-neutral-600 mt-0.5">Register an incoming batch to activate dispensing.</p>
                {hasPermission('inventory', 'add') && (
                  <button
                    type="button"
                    onClick={() => setIsAddingBatch(true)}
                    className="mt-2.5 text-xs text-white bg-[#1C9A58] hover:bg-[#158046] font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Register First Batch
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                {batches.map((b) => {
                  const daysLeft = b.daysLeft !== undefined ? b.daysLeft : 0;
                  const isExpired = b.isExpired;
                  const isNearExp = b.isNearExpiry;

                  return (
                    <div
                      key={b.batchId || b.id || b.batchNumber}
                      onClick={() => setAdjustingBatch(b)}
                      className="p-3 rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50/40 to-emerald-50/20 hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer group"
                      title="Click to adjust batch stock"
                    >
                      {/* Left: Batch ID & Expiry */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(b.batchNumber, 'Batch Number');
                          }}
                          className="font-mono text-xs font-bold text-black bg-slate-100 group-hover:bg-emerald-50 px-2 py-0.5 rounded border border-slate-300 shadow-2xs cursor-pointer transition-all"
                          title="Click to copy batch number"
                        >
                          {b.batchNumber}
                        </span>
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 cursor-pointer">
                            Expired
                          </span>
                        ) : isNearExp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer">
                            Expires Soon ({daysLeft}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-pointer">
                            Valid ({daysLeft}d)
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-800 font-medium">
                          Exp: <strong className="text-black font-bold">{formatDate(b.expiryDate)}</strong>
                        </span>
                      </div>

                      {/* Right: Quantity, Price & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">Qty:</span>
                          <strong className="text-black font-extrabold text-sm">{b.quantity}</strong>
                          <span className="text-[11px] text-neutral-600 ml-0.5 font-medium">units</span>
                        </div>

                        <div className="text-right">
                          <strong className="text-[#1C9A58] font-black text-sm tabular-nums">
                            {formatCurrency(b.sellingPrice)}
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                          {hasPermission('inventory', 'edit') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdjustingBatch(b);
                              }}
                              className="text-xs font-bold text-black hover:text-[#1C9A58] bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                              title="Adjust Stock Quantity"
                            >
                              Adjust Stock
                            </button>
                          )}
                          {hasPermission('inventory', 'edit') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBatch(b);
                              }}
                              className="p-1 text-neutral-500 hover:text-black hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
