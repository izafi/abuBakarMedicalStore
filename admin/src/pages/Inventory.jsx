import { useState, useMemo } from 'react';
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
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('ALL');

  // Modals State
  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [adjustingBatch, setAdjustingBatch] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
        b.supplier?.toLowerCase().includes(q);

      let matchesStock = true;
      if (stockStatusFilter !== 'ALL') {
        matchesStock = b.status === stockStatusFilter;
      }

      let matchesExpiry = true;
      if (expiryFilter === 'EXPIRED') {
        matchesExpiry = b.isExpired;
      } else if (expiryFilter === 'NEXT_30_DAYS') {
        matchesExpiry = !b.isExpired && b.daysLeft <= 30;
      } else if (expiryFilter === 'NEXT_90_DAYS') {
        matchesExpiry = !b.isExpired && b.daysLeft <= 90;
      } else if (expiryFilter === 'HEALTHY') {
        matchesExpiry = !b.isExpired && b.daysLeft > 90;
      }

      return matchesSearch && matchesStock && matchesExpiry;
    });
  }, [batches, searchQuery, stockStatusFilter, expiryFilter]);

  // Handlers
  const handleSaveBatch = (batchData, reason) => {
    try {
      if (editingBatch) {
        updateBatch(editingBatch.batchId || editingBatch.id, batchData, reason);
        toast.showSuccess(`Batch "${batchData.batchNumber}" updated successfully!`);
      } else {
        addBatch(batchData, reason);
        toast.showSuccess(`New Batch "${batchData.batchNumber}" registered successfully!`);
      }
      setIsBatchFormOpen(false);
      setEditingBatch(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    try {
      deleteBatch(deleteTarget.batchId || deleteTarget.id, 'Batch permanently discarded');
      toast.showSuccess(`Batch ${deleteTarget.batchNumber} removed from inventory.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleApplyAdjustment = ({ batchId, delta, actionType, reason }) => {
    try {
      adjustBatchStock(batchId, delta, actionType, reason);
      toast.showSuccess(
        `Stock successfully ${delta > 0 ? 'increased' : 'reduced'} by ${Math.abs(delta)} units.`
      );
      setAdjustingBatch(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#1C9A58]" />
            <span>Inventory & Batch Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time batch-wise stock tracking, expiry safeguards, storage locations, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            iconLeft={History}
            onClick={() => setIsHistoryOpen(true)}
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
            >
              Add New Batch
            </Button>
          )}
        </div>
      </div>

      {/* INVENTORY DASHBOARD (Exact 6 required KPI cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Stock */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Stock
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-[#1C9A58]">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {inventoryMetrics.totalStock}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Across {inventoryMetrics.totalBatches} batches
            </p>
          </div>
        </div>

        {/* 2. Available Stock */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Available Stock
            </span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-teal-700">
              {inventoryMetrics.availableStock}
            </h3>
            <p className="text-[11px] text-teal-600/80 mt-0.5 font-medium">
              Sellable active units
            </p>
          </div>
        </div>

        {/* 3. Low Stock */}
        <div
          onClick={() => setStockStatusFilter(BATCH_STOCK_STATUS.LOW_STOCK)}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            stockStatusFilter === BATCH_STOCK_STATUS.LOW_STOCK
              ? 'border-amber-400 ring-2 ring-amber-100'
              : 'border-gray-100 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Low Stock
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-amber-600">
              {inventoryMetrics.lowStockCount}
            </h3>
            <p className="text-[11px] text-amber-600/80 mt-0.5 font-medium">
              Batches under limit
            </p>
          </div>
        </div>

        {/* 4. Out of Stock */}
        <div
          onClick={() => setStockStatusFilter(BATCH_STOCK_STATUS.OUT_OF_STOCK)}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            stockStatusFilter === BATCH_STOCK_STATUS.OUT_OF_STOCK
              ? 'border-gray-400 ring-2 ring-gray-100'
              : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Out of Stock
            </span>
            <span className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
              <PackageX className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-gray-700">
              {inventoryMetrics.outOfStockCount}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Depleted batches (0 qty)
            </p>
          </div>
        </div>

        {/* 5. Near Expiry */}
        <div
          onClick={() => setStockStatusFilter(BATCH_STOCK_STATUS.NEAR_EXPIRY)}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            stockStatusFilter === BATCH_STOCK_STATUS.NEAR_EXPIRY
              ? 'border-orange-400 ring-2 ring-orange-100'
              : 'border-gray-100 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Near Expiry
            </span>
            <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-orange-600">
              {inventoryMetrics.nearExpiryCount}
            </h3>
            <p className="text-[11px] text-orange-600/80 mt-0.5 font-medium">
              Within 90 days
            </p>
          </div>
        </div>

        {/* 6. Expired Stock */}
        <div
          onClick={() => setStockStatusFilter(BATCH_STOCK_STATUS.EXPIRED)}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
            stockStatusFilter === BATCH_STOCK_STATUS.EXPIRED
              ? 'border-red-400 ring-2 ring-red-100'
              : 'border-gray-100 hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Expired Stock
            </span>
            <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-red-600">
              {inventoryMetrics.expiredStockCount}
            </h3>
            <p className="text-[11px] text-red-600/80 mt-0.5 font-bold">
              {inventoryMetrics.expiredUnits} units blocked
            </p>
          </div>
        </div>
      </div>

      {/* CRITICAL WARNING BANNERS */}
      {inventoryMetrics.expiredStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start sm:items-center justify-between gap-3 text-red-900">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-bold text-sm">
                Expired Stock Warning ({inventoryMetrics.expiredStockCount} batch
                {inventoryMetrics.expiredStockCount > 1 ? 'es' : ''} •{' '}
                {inventoryMetrics.expiredUnits} units)
              </h4>
              <p className="text-xs text-red-700/90 mt-0.5">
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
          >
            Review Expired
          </Button>
        </div>
      )}

      {inventoryMetrics.nearExpiryCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-medium">
              <span className="font-bold">Near-Expiry Alert:</span>{' '}
              {inventoryMetrics.nearExpiryCount} batch
              {inventoryMetrics.nearExpiryCount > 1 ? 'es' : ''} will expire within 90 days. Dispense via FIFO counter station.
            </p>
          </div>
          {stockStatusFilter !== BATCH_STOCK_STATUS.NEAR_EXPIRY && (
            <button
              onClick={() => setStockStatusFilter(BATCH_STOCK_STATUS.NEAR_EXPIRY)}
              className="text-xs font-bold text-amber-700 underline shrink-0 hover:text-amber-900"
            >
              Filter Near-Expiry
            </button>
          )}
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by batch number, medicine name, generic formula, rack or shelf..."
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] text-gray-800"
            >
              <option value="ALL">All Stock Statuses ({batches.length})</option>
              <option value={BATCH_STOCK_STATUS.IN_STOCK}>In Stock</option>
              <option value={BATCH_STOCK_STATUS.LOW_STOCK}>Low Stock</option>
              <option value={BATCH_STOCK_STATUS.OUT_OF_STOCK}>Out of Stock</option>
              <option value={BATCH_STOCK_STATUS.NEAR_EXPIRY}>Near Expiry</option>
              <option value={BATCH_STOCK_STATUS.EXPIRED}>Expired</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] text-gray-800"
            >
              <option value="ALL">All Expiry Windows</option>
              <option value="NEXT_30_DAYS">Expires in next 30 days</option>
              <option value="NEXT_90_DAYS">Expires in next 90 days</option>
              <option value="HEALTHY">Valid (over 90 days)</option>
              <option value="EXPIRED">Already Expired</option>
            </select>
          </div>

          <div className="md:col-span-1 flex justify-end">
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
                className="w-full h-10 flex items-center justify-center text-gray-500"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* REUSABLE BATCH TABLE */}
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
