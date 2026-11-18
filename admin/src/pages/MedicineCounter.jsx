import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Search,
  X,
  ShoppingCart,
  User,
  Eye,
  Plus,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Receipt,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MedicineDetails } from '../components/medicines/MedicineDetails';
import { MedicineForm } from '../components/medicines/MedicineForm';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { APP_INFO } from '../utils/constants';

export const MedicineCounter = () => {
  const navigate = useNavigate();
  const {
    medicines,
    rawMedicines,
    batches,
    categories,
    deleteMedicine,
    updateMedicine,
    addBatch,
    updateBatch,
    deleteBatch,
    adjustBatchStock,
  } = useInventory();
  const { addToCart, orderSummary, recentSales } = useSales();
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();

  // Permissions
  const canAddSale = hasPermission('sales', 'add');
  const canEditMedicine = hasPermission('medicines', 'edit');
  const canDeleteMedicine = hasPermission('medicines', 'delete');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Batch per Medicine (medicineId -> batchId)
  const [selectedBatchMap, setSelectedBatchMap] = useState({});

  // Modals
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Instant Search by: Medicine Name, Generic Name, Brand, Formula, Strength, Batch Number, Category
  const filteredMedicines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return medicines;

    return medicines.filter((med) => {
      const matchName = med.name?.toLowerCase().includes(q);
      const matchGeneric = med.genericName?.toLowerCase().includes(q);
      const matchBrand = med.brand?.toLowerCase().includes(q);
      const matchFormula = med.formula?.toLowerCase().includes(q);
      const matchStrength = med.strength?.toLowerCase().includes(q);
      const matchCategory = med.category?.toLowerCase().includes(q);

      // Check if any associated batch matches the search batch number
      const medBatches = batches.filter((b) => b.medicineId === med.medicineId);
      const matchBatch = medBatches.some((b) =>
        b.batchNumber?.toLowerCase().includes(q) || b.batchNo?.toLowerCase().includes(q)
      );

      return (
        matchName ||
        matchGeneric ||
        matchBrand ||
        matchFormula ||
        matchStrength ||
        matchCategory ||
        matchBatch
      );
    });
  }, [medicines, batches, searchQuery]);

  // Paginated medicines list
  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage) || 1;
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMedicines.slice(start, start + itemsPerPage);
  }, [filteredMedicines, currentPage, itemsPerPage]);

  // Handler for adding a medicine and selected batch to the sale cart
  const handleAddMedicineToSale = (med) => {
    if (!canAddSale) {
      toast.showError('Access Denied: You do not have permission to add sales.');
      return;
    }

    const medBatches = batches.filter(
      (b) => b.medicineId === med.medicineId && b.canSell && b.quantity > 0
    );

    if (medBatches.length === 0) {
      toast.showError(`"${med.name}" has no available sellable stock! All batches are expired or depleted.`);
      return;
    }

    const chosenBatchId = selectedBatchMap[med.medicineId];
    const targetBatch =
      medBatches.find((b) => b.batchId === chosenBatchId || b.id === chosenBatchId) ||
      medBatches[0];

    try {
      addToCart(med, 1, targetBatch);
      toast.showSuccess(
        `Added 1x ${med.name} (Batch: ${targetBatch.batchNumber || targetBatch.batchNo}) to cart`
      );
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    try {
      deleteMedicine(deleteTarget.medicineId);
      toast.showSuccess(`Medicine "${deleteTarget.name}" deleted from catalog.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP SECTION
          - Medicine Counter
          - Abu Bakar Medical Store
          - Main Branch
          - Global Medicine Search
          - Current Cart Indicator
          - Logged-in Employee
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Official Branding & Branch Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F3A2C] text-[#1C9A58] flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  Medicine Counter
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Main Branch
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {APP_INFO.NAME} • Quick Dispensing Station
              </p>
            </div>
          </div>

          {/* Quick Actions: Current Cart Indicator & Logged-in Employee */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Current Cart Indicator */}
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-[#0F3A2C] transition-all font-semibold text-xs shadow-xs"
              title="Go to POS Billing Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 text-[#1C9A58]" />
                {orderSummary.totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#1C9A58] text-white text-[9px] font-black flex items-center justify-center">
                    {orderSummary.totalItems}
                  </span>
                )}
              </div>
              <span>
                Active Bill:{' '}
                <strong>{formatCurrency(orderSummary.grandTotal)}</strong>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* Logged-in Employee Profile Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/70 text-xs">
              <div className="w-7 h-7 rounded-full bg-[#0F3A2C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-tight">
                  {currentUser?.name || 'Staff User'}
                </p>
                <p className="text-[10px] font-medium text-emerald-700">
                  {currentUser?.role || 'Pharmacist'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Medicine Search with Instant Clear Button */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Instant search by Medicine Name, Generic Formulation, Brand, Formula, Strength, Batch, or Category..."
              className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-transparent text-gray-900 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery && (
            <Button
              variant="outline"
              size="md"
              iconLeft={RotateCcw}
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="shrink-0 text-xs"
            >
              Reset Search
            </Button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MEDICINE TABLE
          Fields:
          - Medicine Name
          - Generic Name
          - Formula
          - Strength
          - Type
          - Usage
          - Selling Price
          - Available Stock
          - Batch Number (with interactive batch selector!)
          - Expiry Date
          - Rack
          - Shelf
          - Stock Status
          - Actions
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Pharmacy Medicine Catalog & Batch Counter
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Showing {filteredMedicines.length} medicine records • Interactive batch-level inventory
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[11px] select-none">
                <th className="py-3 px-3">Medicine Name</th>
                <th className="py-3 px-3">Generic Name</th>
                <th className="py-3 px-3">Formula</th>
                <th className="py-3 px-3 text-center">Strength</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Usage</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Available Stock</th>
                <th className="py-3 px-3">Batch Number</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Rack</th>
                <th className="py-3 px-3">Shelf</th>
                <th className="py-3 px-3">Stock Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-gray-700">
              {paginatedMedicines.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-gray-400">
                    <Pill className="w-9 h-9 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
                    <p className="font-bold text-gray-700 text-sm">No medicines found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      No products matched &quot;{searchQuery}&quot;. Clear search to view all medicines.
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="mt-3 text-xs"
                      >
                        Clear Search Filter
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedMedicines.map((med) => {
                  const medBatches = batches.filter((b) => b.medicineId === med.medicineId);
                  const sellableBatches = medBatches.filter((b) => b.canSell && b.quantity > 0);

                  // Current active batch for this medicine
                  const currentBatchId = selectedBatchMap[med.medicineId];
                  const activeBatch =
                    sellableBatches.find(
                      (b) => b.batchId === currentBatchId || b.id === currentBatchId
                    ) ||
                    medBatches[0] ||
                    null;

                  const isDepleted = med.availableStock <= 0;
                  const isLow = !isDepleted && med.availableStock <= med.minStockAlert;

                  const batchNumber = activeBatch ? activeBatch.batchNumber || activeBatch.batchNo : 'N/A';
                  const expiryDate = activeBatch ? activeBatch.expiryDate : med.expiryDate;
                  const rack = activeBatch ? activeBatch.rack : 'Rack A';
                  const shelf = activeBatch ? activeBatch.shelf : 'Shelf 1';
                  const sellingPrice = activeBatch ? activeBatch.sellingPrice : med.sellingPrice;

                  return (
                    <tr
                      key={med.medicineId}
                      className="hover:bg-gray-50/70 transition-colors duration-150"
                    >
                      {/* 1. Medicine Name */}
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-gray-900">{med.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {med.medicineId} • {med.brand}
                          </p>
                        </div>
                      </td>

                      {/* 2. Generic Name */}
                      <td className="py-3 px-3 font-medium text-gray-800">
                        {med.genericName}
                      </td>

                      {/* 3. Formula */}
                      <td className="py-3 px-3 text-[11px] text-gray-500 max-w-[150px] truncate" title={med.formula}>
                        {med.formula || 'Standard'}
                      </td>

                      {/* 4. Strength */}
                      <td className="py-3 px-3 text-center font-bold text-gray-700">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">
                          {med.strength || 'N/A'}
                        </span>
                      </td>

                      {/* 5. Type */}
                      <td className="py-3 px-3">
                        <Badge variant="primary" size="sm">
                          {med.type}
                        </Badge>
                      </td>

                      {/* 6. Usage */}
                      <td className="py-3 px-3 text-[11px] text-gray-500 max-w-[140px] truncate" title={med.usage}>
                        {med.usage || 'General usage'}
                      </td>

                      {/* 7. Selling Price */}
                      <td className="py-3 px-3 text-right font-extrabold text-[#1C9A58] whitespace-nowrap">
                        {formatCurrency(sellingPrice)}
                      </td>

                      {/* 8. Available Stock */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            isDepleted
                              ? 'bg-red-50 text-red-600'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-[#1C9A58]'
                          }`}
                        >
                          {med.availableStock} units
                        </span>
                      </td>

                      {/* 9. Batch Number (With selector if multiple batches exist!) */}
                      <td className="py-3 px-3">
                        {sellableBatches.length > 1 ? (
                          <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#1C9A58] shrink-0" />
                            <select
                              value={activeBatch ? activeBatch.batchId || activeBatch.id : ''}
                              onChange={(e) =>
                                setSelectedBatchMap((prev) => ({
                                  ...prev,
                                  [med.medicineId]: e.target.value,
                                }))
                              }
                              className="font-mono text-[11px] font-bold bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1C9A58] cursor-pointer"
                              title="Select specific batch for sale"
                            >
                              {sellableBatches.map((b) => (
                                <option key={b.batchId || b.id} value={b.batchId || b.id}>
                                  {b.batchNumber || b.batchNo} ({b.quantity} left)
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                            {batchNumber}
                          </span>
                        )}
                      </td>

                      {/* 10. Expiry Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-medium ${
                            activeBatch?.isExpired
                              ? 'text-red-600 font-bold'
                              : activeBatch?.isNearExpiry
                              ? 'text-amber-700 font-bold'
                              : 'text-gray-700'
                          }`}
                        >
                          {formatDate(expiryDate)}
                        </span>
                      </td>

                      {/* 11. Rack */}
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {rack}
                      </td>

                      {/* 12. Shelf */}
                      <td className="py-3 px-3 text-gray-600 font-medium">
                        {shelf}
                      </td>

                      {/* 13. Stock Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isDepleted ? (
                          <Badge variant="danger" dot size="sm">
                            Out of Stock
                          </Badge>
                        ) : activeBatch?.isNearExpiry ? (
                          <Badge variant="warning" dot size="sm">
                            Near Expiry
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="warning" dot size="sm">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" dot size="sm">
                            In Stock
                          </Badge>
                        )}
                      </td>

                      {/* 14. Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Add to Sale */}
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isDepleted || !canAddSale}
                            iconLeft={Plus}
                            onClick={() => handleAddMedicineToSale(med)}
                            title="Add to Sale Cart"
                            className="text-xs px-2 py-1"
                          >
                            Add
                          </Button>

                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            iconLeft={Eye}
                            onClick={() => setViewingMedicine(med)}
                            title="View Complete Medicine & Batches Details"
                            className="p-1.5 text-gray-500 hover:text-gray-800"
                          />

                          {/* Edit Medicine (Hidden if lacks permission) */}
                          {canEditMedicine && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconLeft={Edit2}
                              onClick={() => setEditingMedicine(med)}
                              title="Edit Medicine"
                              className="p-1.5 text-blue-500 hover:text-blue-700"
                            />
                          )}

                          {/* Delete Medicine (Hidden if lacks permission) */}
                          {canDeleteMedicine && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconLeft={Trash2}
                              onClick={() => setDeleteTarget(med)}
                              title="Delete Medicine"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                            />
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

        {/* Responsive Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredMedicines.length)} of{' '}
              {filteredMedicines.length} medicines
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-bold text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          RECENT MEDICINE SALES (Bottom Section)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#1C9A58]" />
            <h3 className="text-sm font-bold text-gray-900">
              Recent Counter Medicine Sales
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="text-xs text-[#1C9A58] hover:underline font-semibold flex items-center gap-1"
          >
            <span>View All Sales Invoices</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-semibold text-[10px] uppercase tracking-wider">
                <th className="py-2 px-3">Invoice #</th>
                <th className="py-2 px-3">Date & Time</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3">Medicines Dispensed</th>
                <th className="py-2 px-3">Payment</th>
                <th className="py-2 px-3 text-right">Total Amount</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">
                    No transactions recorded today.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id || sale.invoiceNumber} className="hover:bg-gray-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                      {formatDateTime(sale.date)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">
                      {sale.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {sale.items.map((i) => i.medicineName || i.name).slice(0, 2).join(', ')}
                      {sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="primary" size="sm">
                        {sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="success" size="sm" dot>
                        {sale.status || 'Completed'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MEDICINE DETAILS MODAL */}
      {viewingMedicine && (
        <MedicineDetails
          isOpen={Boolean(viewingMedicine)}
          onClose={() => setViewingMedicine(null)}
          medicine={viewingMedicine}
          batches={batches.filter((b) => b.medicineId === viewingMedicine.medicineId)}
          allBatches={batches}
          onEdit={(med) => {
            setViewingMedicine(null);
            setEditingMedicine(med);
          }}
          onAddBatch={addBatch}
          onUpdateBatch={updateBatch}
          onDeleteBatch={deleteBatch}
          onAdjustStock={({ batchId, delta, actionType, reason }) => {
            try {
              adjustBatchStock(batchId, delta, actionType, reason);
              toast.showSuccess('Stock adjustment applied!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
        />
      )}

      {/* EDIT MEDICINE MODAL */}
      {editingMedicine && (
        <MedicineForm
          key={editingMedicine.medicineId}
          isOpen={Boolean(editingMedicine)}
          onClose={() => setEditingMedicine(null)}
          onSave={({ medicineData }) => {
            try {
              updateMedicine(editingMedicine.medicineId, medicineData);
              toast.showSuccess(`Medicine "${medicineData.name}" updated successfully!`);
              setEditingMedicine(null);
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          initialData={editingMedicine}
          categories={categories}
          existingMedicines={rawMedicines}
        />
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deleteTarget?.name}"?`}
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}" (${deleteTarget?.medicineId})? This will also remove all associated stock batches.`}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
};

export default MedicineCounter;
