import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes,
  PackageCheck,
  AlertTriangle,
  PackageX,
  Clock,
  ShieldAlert,
  Plus,
  History,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { BatchTable } from '../components/batches/BatchTable';
import { BatchForm } from '../components/batches/BatchForm';
import { StockAdjustModal } from '../components/inventory/StockAdjustModal';
import { StockHistoryModal } from '../components/inventory/StockHistoryModal';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { BATCH_STOCK_STATUS } from '../utils/constants';

export const Inventory = () => {
  const {
    rawMedicines,
    batches,
    rawBatches,
    stockHistory,
    addBatch,
    updateBatch,
    deleteBatch,
    adjustBatchStock,
    inventoryMetrics,
  } = useInventory();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const canAdd = hasPermission('inventory', 'add');

  const [searchParams] = useSearchParams();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'OUT_OF_STOCK' || statusParam === 'out-of-stock' || statusParam === 'Out of Stock') {
      return BATCH_STOCK_STATUS.OUT_OF_STOCK;
    }
    if (statusParam === 'EXPIRED' || statusParam === 'expired' || statusParam === 'Expired') {
      return BATCH_STOCK_STATUS.EXPIRED;
    }
    return statusParam || 'ALL';
  });

  const [expiryFilter, setExpiryFilter] = useState(() => {
    const expiryParam = searchParams.get('expiry');
    if (expiryParam === 'EXPIRED' || expiryParam === 'expired') {
      return 'EXPIRED';
    }
    return 'ALL';
  });

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const expiryParam = searchParams.get('expiry');
    if (statusParam === 'OUT_OF_STOCK' || statusParam === 'out-of-stock' || statusParam === 'Out of Stock') {
      setStockStatusFilter(BATCH_STOCK_STATUS.OUT_OF_STOCK);
    } else if (statusParam === 'EXPIRED' || statusParam === 'expired' || statusParam === 'Expired') {
      setStockStatusFilter(BATCH_STOCK_STATUS.EXPIRED);
    } else if (statusParam) {
      setStockStatusFilter(statusParam);
    }

    if (expiryParam === 'EXPIRED' || expiryParam === 'expired') {
      setExpiryFilter('EXPIRED');
    }
  }, [searchParams]);

  // Modals State
  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [adjustingBatch, setAdjustingBatch] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const stockStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: `All Stock Statuses (${batches.length})` },
      { value: BATCH_STOCK_STATUS.IN_STOCK, label: 'In Stock' },
      { value: BATCH_STOCK_STATUS.LOW_STOCK, label: 'Low Stock' },
      { value: BATCH_STOCK_STATUS.OUT_OF_STOCK, label: 'Out of Stock' },
      { value: BATCH_STOCK_STATUS.NEAR_EXPIRY, label: 'Near Expiry' },
      { value: BATCH_STOCK_STATUS.EXPIRED, label: 'Expired' },
    ],
    [batches.length]
  );

  const expiryFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Expiry Windows' },
      { value: 'NEXT_30_DAYS', label: 'Expires in next 30 days' },
      { value: 'NEXT_90_DAYS', label: 'Expires in next 90 days' },
      { value: 'HEALTHY', label: 'Valid (over 90 days)' },
      { value: 'EXPIRED', label: 'Already Expired' },
    ],
    []
  );

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.batchNumber?.toLowerCase().includes(q) ||
        b.batchNo?.toLowerCase().includes(q) ||
        b.medicineName?.toLowerCase().includes(q) ||
        b.genericName?.toLowerCase().includes(q) ||
        b.rack?.toLowerCase().includes(q) ||
        b.shelf?.toLowerCase().includes(q) ||
        b.supplier?.toLowerCase().includes(q) ||
        b.medicineId?.toLowerCase().includes(q);

      // Stock status filter
      let matchesStatus = true;
      if (stockStatusFilter !== 'ALL') {
        matchesStatus = b.status === stockStatusFilter;
      }

      // Expiry filter
      let matchesExpiry = true;
      if (expiryFilter === 'NEXT_30_DAYS') {
        matchesExpiry = b.daysLeft !== undefined && b.daysLeft >= 0 && b.daysLeft <= 30;
      } else if (expiryFilter === 'NEXT_90_DAYS') {
        matchesExpiry = b.daysLeft !== undefined && b.daysLeft >= 0 && b.daysLeft <= 90;
      } else if (expiryFilter === 'HEALTHY') {
        matchesExpiry = b.daysLeft !== undefined && b.daysLeft > 90;
      } else if (expiryFilter === 'EXPIRED') {
        matchesExpiry = b.isExpired;
      }

      return matchesSearch && matchesStatus && matchesExpiry;
    });
  }, [batches, searchQuery, stockStatusFilter, expiryFilter]);

  // Batch Save Handler
  const handleSaveBatch = async (batchData, reason) => {
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.batchId || editingBatch.id, batchData, reason);
        toast.showSuccess(`Batch ${batchData.batchNumber} updated successfully.`);
      } else {
        await addBatch(batchData, reason);
        toast.showSuccess(`Batch ${batchData.batchNumber} registered to inventory.`);
      }
      setIsBatchFormOpen(false);
      setEditingBatch(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBatch(deleteTarget.batchId || deleteTarget.id, 'Batch permanently discarded');
      toast.showSuccess(`Batch ${deleteTarget.batchNumber} removed from inventory.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleApplyAdjustment = async ({ batchId, delta, actionType, reason }) => {
    try {
      await adjustBatchStock(batchId, delta, actionType, reason);
      toast.showSuccess(
        `Stock successfully ${delta > 0 ? 'increased' : 'reduced'} by ${Math.abs(delta)} units.`
      );
      setAdjustingBatch(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  // Compact, Small & Responsive Stat Cards Definition (Matching Dashboard & Consistent Font/Size)
  const statCards = [
    {
      title: 'Total Stock',
      value: inventoryMetrics.totalStock.toLocaleString(),
      subtitle: `Across ${inventoryMetrics.totalBatches} batches`,
      icon: Boxes,
      cardTheme:
        'border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 hover:border-emerald-400',
      iconBox: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      titleColor: 'text-emerald-950',
      valueColor: 'text-black',
      onClick: () => {
        setStockStatusFilter('ALL');
        setExpiryFilter('ALL');
      },
    },
    {
      title: 'Available Stock',
      value: inventoryMetrics.availableStock.toLocaleString(),
      subtitle: 'Sellable active units',
      icon: PackageCheck,
      cardTheme:
        'border-teal-200/90 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/30 hover:border-teal-400',
      iconBox: 'bg-teal-100 text-teal-800 border-teal-300',
      titleColor: 'text-teal-950',
      valueColor: 'text-[#1C9A58]',
      onClick: () => {
        setStockStatusFilter('ALL');
        setExpiryFilter('ALL');
      },
    },
    {
      title: 'Low Stock',
      value: inventoryMetrics.lowStockCount,
      subtitle: 'Batches under limit',
      icon: AlertTriangle,
      cardTheme:
        stockStatusFilter === BATCH_STOCK_STATUS.LOW_STOCK
          ? 'border-amber-400 ring-2 ring-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/40'
          : 'border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 hover:border-amber-400',
      iconBox: 'bg-amber-100 text-amber-800 border-amber-300',
      titleColor: 'text-amber-950',
      valueColor: 'text-amber-950',
      onClick: () => setStockStatusFilter(BATCH_STOCK_STATUS.LOW_STOCK),
    },
    {
      title: 'Out of Stock',
      value: inventoryMetrics.outOfStockCount,
      subtitle: 'Depleted batches (0 qty)',
      icon: PackageX,
      cardTheme:
        stockStatusFilter === BATCH_STOCK_STATUS.OUT_OF_STOCK
          ? 'border-slate-500 ring-2 ring-slate-200 bg-gradient-to-br from-slate-100 via-white to-zinc-50'
          : 'border-slate-300/90 bg-gradient-to-br from-slate-50/70 via-white to-zinc-50/30 hover:border-slate-400',
      iconBox: 'bg-slate-100 text-slate-800 border-slate-300',
      titleColor: 'text-slate-950',
      valueColor: 'text-slate-950',
      onClick: () => setStockStatusFilter(BATCH_STOCK_STATUS.OUT_OF_STOCK),
    },
    {
      title: 'Near Expiry',
      value: inventoryMetrics.nearExpiryCount,
      subtitle: 'Within 90 days',
      icon: Clock,
      cardTheme:
        stockStatusFilter === BATCH_STOCK_STATUS.NEAR_EXPIRY
          ? 'border-orange-400 ring-2 ring-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50/40'
          : 'border-orange-200/90 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/30 hover:border-orange-400',
      iconBox: 'bg-orange-100 text-orange-800 border-orange-300',
      titleColor: 'text-orange-950',
      valueColor: 'text-orange-950',
      onClick: () => setStockStatusFilter(BATCH_STOCK_STATUS.NEAR_EXPIRY),
    },
    {
      title: 'Expired Stock',
      value: inventoryMetrics.expiredStockCount,
      subtitle: `${inventoryMetrics.expiredUnits} units blocked`,
      icon: ShieldAlert,
      cardTheme:
        stockStatusFilter === BATCH_STOCK_STATUS.EXPIRED
          ? 'border-rose-400 ring-2 ring-rose-200 bg-gradient-to-br from-rose-50 via-white to-red-50/40'
          : 'border-rose-200/90 bg-gradient-to-br from-rose-50/70 via-white to-red-50/30 hover:border-rose-400',
      iconBox: 'bg-rose-100 text-rose-800 border-rose-300',
      titleColor: 'text-rose-950',
      valueColor: 'text-rose-950',
      onClick: () => setStockStatusFilter(BATCH_STOCK_STATUS.EXPIRED),
    },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* Page Title & Main Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#1C9A58]" />
            <span>Inventory & Batch Management</span>
          </h1>
          <p className="text-xs text-black font-semibold mt-0.5">
            Real-time batch-wise stock tracking, expiry safeguards, storage locations, and audit logs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            iconLeft={History}
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 text-black hover:bg-slate-100 cursor-pointer shadow-2xs transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            Stock Movement History ({stockHistory.length})
          </Button>

          {canAdd && (
            <Button
              variant="primary"
              iconLeft={Plus}
              onClick={() => {
                setEditingBatch(null);
                setIsBatchFormOpen(true);
              }}
              className="bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              Add New Batch
            </Button>
          )}
        </div>
      </div>

      {/* COMPACT, SMALL, COLORFUL & RESPONSIVE STAT CARDS (Matching Dashboard) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`p-3 rounded-xl border shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5 ${card.cardTheme}`}
              title={`Filter by ${card.title}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${card.titleColor}`}>
                  {card.title}
                </span>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${card.iconBox}`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                </div>
              </div>

              <div>
                <p className={`text-base sm:text-lg lg:text-xl font-extrabold tabular-nums tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
                <p className="text-[10px] sm:text-[11px] text-black font-semibold truncate mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CRITICAL WARNING BANNERS */}
      {inventoryMetrics.expiredStockCount > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-300 flex items-start sm:items-center justify-between gap-3 text-rose-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-bold text-xs text-black">
                Expired Stock Warning ({inventoryMetrics.expiredStockCount} batch
                {inventoryMetrics.expiredStockCount > 1 ? 'es' : ''} •{' '}
                {inventoryMetrics.expiredUnits} units)
              </h4>
              <p className="text-[11px] text-black font-medium mt-0.5">
                Expired medicines are strictly blocked from sale in the POS system. Quarantine and discard immediately.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setStockStatusFilter(BATCH_STOCK_STATUS.EXPIRED);
              setExpiryFilter('EXPIRED');
            }}
            className="text-xs font-bold px-2.5 py-1 shrink-0"
          >
            Review Expired
          </Button>
        </div>
      )}

      {inventoryMetrics.nearExpiryCount > 0 && (
        <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 flex items-center justify-between gap-3 text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-xs text-black font-medium">
              <strong className="font-bold text-black">Near-Expiry Alert:</strong>{' '}
              {inventoryMetrics.nearExpiryCount} batch
              {inventoryMetrics.nearExpiryCount > 1 ? 'es' : ''} will expire within 90 days. Dispense via FIFO counter station.
            </p>
          </div>
          {stockStatusFilter !== BATCH_STOCK_STATUS.NEAR_EXPIRY && (
            <button
              onClick={() => setStockStatusFilter(BATCH_STOCK_STATUS.NEAR_EXPIRY)}
              className="text-xs font-bold text-amber-900 underline shrink-0 hover:text-black cursor-pointer"
            >
              Filter Near-Expiry
            </button>
          )}
        </div>
      )}

      {/* SEARCH AND FILTERS (Clean Solid Black Font & Borders) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-2.5 sm:p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-2 md:col-span-5">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by batch number, medicine name, generic formula, rack or shelf..."
              className="text-xs"
            />
          </div>

          <div className="sm:col-span-1 md:col-span-3">
            <FilterDropdown
              value={stockStatusFilter}
              onChange={(val) => setStockStatusFilter(val)}
              options={stockStatusOptions}
              placeholder="All Stock Statuses"
              className="w-full"
            />
          </div>

          <div className="sm:col-span-1 md:col-span-3">
            <FilterDropdown
              value={expiryFilter}
              onChange={(val) => setExpiryFilter(val)}
              options={expiryFilterOptions}
              placeholder="All Expiry Windows"
              align="right"
              className="w-full"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-1 flex justify-end">
            {(searchQuery || stockStatusFilter !== 'ALL' || expiryFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                iconLeft={RotateCcw}
                onClick={() => {
                  setSearchQuery('');
                  setStockStatusFilter('ALL');
                  setExpiryFilter('ALL');
                }}
                title="Reset all filters"
                className="w-full h-9 flex items-center justify-center text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* REUSABLE BATCH TABLE (Matching Medicine Counter Design) */}
      <BatchTable
        batches={filteredBatches}
        showMedicineCol={true}
        onEditBatch={(batch) => {
          setEditingBatch(batch);
          setIsBatchFormOpen(true);
        }}
        onDeleteBatch={(batch) => setDeleteTarget(batch)}
        onAdjustStock={(batch) => setAdjustingBatch(batch)}
      />

      {/* ADD / EDIT BATCH FORM MODAL */}
      {isBatchFormOpen && (
        <BatchForm
          key={editingBatch ? editingBatch.batchId || editingBatch.id : 'new-batch-modal'}
          isOpen={isBatchFormOpen}
          onClose={() => {
            setIsBatchFormOpen(false);
            setEditingBatch(null);
          }}
          onSave={handleSaveBatch}
          initialData={editingBatch}
          medicines={rawMedicines}
          existingBatches={rawBatches}
        />
      )}

      {/* QUICK STOCK ADJUST MODAL */}
      {adjustingBatch && (
        <StockAdjustModal
          isOpen={Boolean(adjustingBatch)}
          onClose={() => setAdjustingBatch(null)}
          batch={adjustingBatch}
          onApplyAdjustment={handleApplyAdjustment}
        />
      )}

      {/* STOCK MOVEMENT HISTORY AUDIT MODAL */}
      {isHistoryOpen && (
        <StockHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          history={stockHistory}
          medicines={rawMedicines}
          batches={batches}
        />
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Discard Batch "${deleteTarget?.batchNumber || deleteTarget?.batchNo}"?`}
        message={`Are you sure you want to permanently discard this batch? Remaining ${deleteTarget?.quantity || 0} units will be logged as disposal in the Stock Movement History.`}
        confirmText="Confirm Discard"
        cancelText="Keep Batch"
        variant="danger"
      />
    </div>
  );
};

export default Inventory;
