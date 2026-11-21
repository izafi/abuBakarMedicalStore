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
  ArrowUpDown,
  Filter,
  LayoutGrid,
  List,
  Inbox,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MedicineDetails } from '../components/medicines/MedicineDetails';
import { MedicineForm } from '../components/medicines/MedicineForm';
import { MedicineCard } from '../components/medicines/MedicineCard';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate, formatDateTime, getCleanMedicineName } from '../utils/formatters';
import { APP_INFO, MEDICINE_TYPES } from '../utils/constants';

export const MedicineCounter = () => {
  const navigate = useNavigate();
  const {
    medicines,
    rawMedicines,
    batches,
    categories,
    addMedicine,
    updateMedicine,
    deleteMedicine,
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
  const canAddMedicine = hasPermission('medicines', 'add');
  const canEditMedicine = hasPermission('medicines', 'edit');
  const canDeleteMedicine = hasPermission('medicines', 'delete');

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Selected Batch per Medicine (medicineId -> batchId)
  const [selectedBatchMap, setSelectedBatchMap] = useState({});

  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  // Handle Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Instant Filter across Name, Generic, Brand, Formula, Strength, Category, Batch
  const filteredMedicines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return medicines.filter((med) => {
      const matchName = med.name?.toLowerCase().includes(q);
      const matchGeneric = med.genericName?.toLowerCase().includes(q);
      const matchBrand = med.brand?.toLowerCase().includes(q);
      const matchFormula = med.formula?.toLowerCase().includes(q);
      const matchStrength = med.strength?.toLowerCase().includes(q);
      const matchCategory = med.category?.toLowerCase().includes(q);
      const matchId = med.medicineId?.toLowerCase().includes(q);

      const medBatches = batches.filter((b) => b.medicineId === med.medicineId);
      const matchBatch = medBatches.some((b) =>
        b.batchNumber?.toLowerCase().includes(q) || b.batchNo?.toLowerCase().includes(q)
      );

      const matchesSearch =
        !q ||
        matchName ||
        matchGeneric ||
        matchBrand ||
        matchFormula ||
        matchStrength ||
        matchCategory ||
        matchId ||
        matchBatch;

      const matchesCat =
        selectedCategory === 'All' || med.category === selectedCategory;

      const matchesType =
        selectedType === 'All' || med.type === selectedType;

      return matchesSearch && matchesCat && matchesType;
    });
  }, [medicines, batches, searchQuery, selectedCategory, selectedType]);

  // Sorted Medicines
  const sortedMedicines = useMemo(() => {
    return [...filteredMedicines].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMedicines, sortField, sortOrder]);

  // Paginated Medicines List
  const totalPages = Math.ceil(sortedMedicines.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMedicines = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedMedicines.slice(start, start + itemsPerPage);
  }, [sortedMedicines, safePage, itemsPerPage]);

  // Handler for adding a medicine and selected batch to the sale cart
  const handleAddMedicineToSale = (med) => {
    if (!canAddSale) {
      toast.showError('Access Denied: You do not have permission to add sales.');
      return;
    }

    const canonicalMedId = med.medicineId || med.id || med._id;
    const medBatches = batches.filter((b) => {
      const bMedId =
        typeof b.medicineId === 'object' && b.medicineId !== null
          ? b.medicineId.medicineId || b.medicineId._id || b.medicineId.id
          : b.medicineId;
      return (
        (bMedId === canonicalMedId ||
          bMedId === med.medicineId ||
          b.medicineId === med.medicineId ||
          b.medicineId === med.id ||
          b.medicineId === med._id ||
          b.medicineCode === med.medicineId ||
          b.medicineCode === canonicalMedId) &&
        b.canSell &&
        Number(b.quantity) > 0
      );
    });

    if (medBatches.length === 0) {
      toast.showError(`"${med.name}" has no available sellable stock! All batches are expired or depleted.`);
      return;
    }

    const chosenBatchId = selectedBatchMap[med.medicineId] || selectedBatchMap[canonicalMedId];
    const targetBatch =
      medBatches.find(
        (b) =>
          b.batchId === chosenBatchId ||
          b.id === chosenBatchId ||
          b._id === chosenBatchId ||
          b.batchNumber === chosenBatchId
      ) || medBatches[0];

    try {
      addToCart(med, 1, targetBatch);
      toast.showSuccess(
        `Added 1x ${med.name} (Batch: ${targetBatch.batchNumber || targetBatch.batchNo}) to cart`
      );
    } catch (err) {
      toast.showError(err.message);
    }
  };

  // Handle Save (Add or Edit)
  const handleSaveMedicine = ({ medicineData, initialBatch }) => {
    try {
      if (editingMedicine) {
        updateMedicine(editingMedicine.medicineId, medicineData);
        toast.showSuccess(`Medicine "${medicineData.name}" updated successfully`);
      } else {
        addMedicine(medicineData, initialBatch);
        toast.showSuccess(`Registered "${medicineData.name}" (${medicineData.medicineId}) to catalog`);
      }
      setIsFormOpen(false);
      setEditingMedicine(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  // Handle Delete
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

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedType('All');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {/* =========================================================================
          TOP HEADER & PRIMARY ACTIONS (Clean Header without State Cards)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">
            Medicine Counter
          </h1>
          <p className="text-xs text-black font-semibold mt-0.5">
            Fast pharmacy dispensing counter, stock availability, active customer bill, and instant checkout.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Bill / POS Quick Counter Link */}
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-[#0F3A2C] transition-all font-bold text-xs shadow-2xs cursor-pointer"
            title="Go to POS Billing Counter"
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
              Active Bill: <strong>{formatCurrency(orderSummary.grandTotal)}</strong>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>

          {/* Add New Medicine (if has permission) */}
          {canAddMedicine && (
            <Button
              variant="primary"
              iconLeft={Plus}
              onClick={() => {
                setEditingMedicine(null);
                setIsFormOpen(true);
              }}
              className="bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Add New Medicine
            </Button>
          )}
        </div>
      </div>

      {/* =========================================================================
          FILTER AND SEARCH BAR (Matching Medicine Catalog)
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-2.5 sm:p-3">
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          <div className="flex-1 w-full">
            <SearchBar
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by brand name, generic formula, or Medicine ID..."
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-black min-w-[140px] cursor-pointer transition-colors"
            >
              <option value="All">All Categories ({categories.length})</option>
              {categories.map((c, idx) => (
                <option key={idx} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-black min-w-[110px] cursor-pointer transition-colors"
            >
              <option value="All">All Types</option>
              {MEDICINE_TYPES.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* View Mode Toggle: Table or Grid */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-300 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-black shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-black'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-black shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-black'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Ribbon */}
        {(selectedCategory !== 'All' || selectedType !== 'All' || searchQuery) && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-black font-semibold">
              <Filter className="w-3.5 h-3.5 text-black" />
              <span>
                Filtering: <strong className="font-bold text-black">{filteredMedicines.length}</strong> of{' '}
                {medicines.length} medicines
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN TABLE (All Essential Fields Preserved, NO ID Column, NO Horizontal Scrollbar)
          ========================================================================= */}
      {viewMode === 'table' ? (
        <div className="w-full bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none">
                  {/* 1. Medicine Name */}
                  <th
                    onClick={() => handleSort('name')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1 text-black font-bold">
                      <span>Medicine Name</span>
                      <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                    </div>
                  </th>

                  {/* 2. Generic Name */}
                  <th
                    onClick={() => handleSort('genericName')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1 text-black font-bold">
                      <span>Generic Name</span>
                      <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                    </div>
                  </th>

                  {/* 3. Formula */}
                  <th className="py-2.5 px-3 text-black font-bold whitespace-nowrap">
                    <span>Formula</span>
                  </th>

                  {/* 4. Strength */}
                  <th className="py-2.5 px-3 text-center text-black font-bold whitespace-nowrap">
                    <span>Strength</span>
                  </th>

                  {/* 5. Type */}
                  <th
                    onClick={() => handleSort('type')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1 text-black font-bold">
                      <span>Type</span>
                      <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                    </div>
                  </th>

                  {/* 6. Selling Price */}
                  <th
                    onClick={() => handleSort('sellingPrice')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1 text-black font-bold">
                      <span>Selling Price</span>
                      <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                    </div>
                  </th>

                  {/* 7. Available Stock */}
                  <th
                    onClick={() => handleSort('stock')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-200/60 select-none whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1 text-black font-bold">
                      <span>Stock</span>
                      <ArrowUpDown className="w-3 h-3 text-black shrink-0" />
                    </div>
                  </th>

                  {/* 8. Rack */}
                  <th className="py-2.5 px-3 text-center text-black font-bold whitespace-nowrap">
                    <span>Rack</span>
                  </th>

                  {/* 9. Shelf */}
                  <th className="py-2.5 px-3 text-center text-black font-bold whitespace-nowrap">
                    <span>Shelf</span>
                  </th>

                  {/* 10. Actions */}
                  <th className="py-2.5 px-3 text-right text-black font-bold whitespace-nowrap">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs bg-white">
                {paginatedMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-black">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="w-8 h-8 text-neutral-400" />
                        <span className="text-sm font-bold text-black">
                          No medicines found
                        </span>
                        <span className="text-xs text-neutral-700">
                          Try adjusting your search query or filters
                        </span>
                        {(searchQuery || selectedCategory !== 'All' || selectedType !== 'All') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-2 text-xs"
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMedicines.map((med) => {
                    const cleanName = getCleanMedicineName(med);
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

                    const stockCount = med.stock ?? med.availableStock ?? 0;
                    const isDepleted = stockCount === 0;
                    const isLow = stockCount > 0 && stockCount <= (med.minStockAlert || 15);
                    const sellingPrice = activeBatch ? activeBatch.sellingPrice : med.sellingPrice;
                    const rack = activeBatch?.rack || med.rack || 'A-1';
                    const shelf = activeBatch?.shelf || med.shelf || '1';

                    return (
                      <tr
                        key={med.medicineId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* 1. Medicine Name */}
                        <td className="py-2.5 px-3">
                          <div>
                            <p
                              onClick={() => setViewingMedicine(med)}
                              className="font-bold text-black text-xs leading-tight hover:text-[#1C9A58] transition-colors cursor-pointer"
                              title="Click to view details"
                            >
                              {cleanName}
                            </p>
                            <p className="text-[11px] text-black font-semibold leading-tight mt-0.5 truncate max-w-[160px]">
                              {med.brand || 'Standard'}
                            </p>
                          </div>
                        </td>

                        {/* 2. Generic Name */}
                        <td className="py-2.5 px-3 text-[11px] text-black font-bold max-w-[140px] truncate" title={med.genericName}>
                          {med.genericName}
                        </td>

                        {/* 3. Formula */}
                        <td className="py-2.5 px-3 text-[11px] text-black font-bold max-w-[120px] truncate" title={med.formula}>
                          {med.formula || 'Standard'}
                        </td>

                        {/* 4. Strength */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="text-[10px] font-mono font-bold text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                            {med.strength || 'N/A'}
                          </span>
                        </td>

                        {/* 5. Type */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-black bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                            {med.type}
                          </span>
                        </td>

                        {/* 6. Selling Price */}
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#1C9A58] text-xs whitespace-nowrap tabular-nums">
                          {formatCurrency(sellingPrice)}
                        </td>

                        {/* 7. Available Stock */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isDepleted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              Low ({stockCount})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              {stockCount} units
                            </span>
                          )}
                        </td>

                        {/* 8. Rack */}
                        <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-black whitespace-nowrap">
                          {rack}
                        </td>

                        {/* 9. Shelf */}
                        <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-black whitespace-nowrap">
                          {shelf}
                        </td>

                        {/* 10. Actions (Add to Sale Cart, Details, Edit, Delete) */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Primary Add to Sale Cart Button */}
                            <button
                              type="button"
                              onClick={() => handleAddMedicineToSale(med)}
                              disabled={isDepleted || !canAddSale}
                              className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-2xs flex items-center gap-1 transition-colors cursor-pointer ${
                                isDepleted || !canAddSale
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                  : 'bg-[#1C9A58] hover:bg-[#158046] text-white border border-emerald-600'
                              }`}
                              title={isDepleted ? 'Out of Stock' : 'Add to Active Sale Bill'}
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add</span>
                            </button>

                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => setViewingMedicine(med)}
                              className="p-1 text-black hover:text-[#1C9A58] hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="View Complete Medicine & Batches Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Medicine */}
                            {canEditMedicine && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMedicine(med);
                                  setIsFormOpen(true);
                                }}
                                className="p-1 text-black hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                title="Edit Medicine"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Medicine */}
                            {canDeleteMedicine && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(med)}
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

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-black font-bold text-xs">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-black font-bold focus:outline-none focus:border-black cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-black font-bold text-xs">per page</span>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 text-xs font-bold text-black">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Alternative Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMedicines.map((med) => (
            <MedicineCard
              key={med.medicineId}
              medicine={med}
              onViewDetails={(m) => setViewingMedicine(m)}
              onEdit={(m) => {
                setEditingMedicine(m);
                setIsFormOpen(true);
              }}
              onDelete={(m) => setDeleteTarget(m)}
            />
          ))}
        </div>
      )}

      {/* =========================================================================
          RECENT COUNTER MEDICINE SALES (Bottom Section)
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1C9A58] border border-emerald-200 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-xs font-bold text-black uppercase tracking-wider">
              Recent Counter Medicine Sales
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="text-xs text-[#1C9A58] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>View All Sales Invoices</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-300 text-black font-bold text-[10px] uppercase tracking-wider select-none">
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Medicines Dispensed</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-black text-xs">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-black font-semibold">
                    No transactions recorded today.
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id || sale.invoiceNumber} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-black">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-black font-semibold whitespace-nowrap">
                      {formatDateTime(sale.date)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-black">
                      {sale.customerName || sale.patientName || 'Walk-in'}
                    </td>
                    <td className="py-2.5 px-3 text-black font-medium">
                      {sale.items.map((i) => i.medicineName || i.name).slice(0, 2).join(', ')}
                      {sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px] font-bold text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                        {sale.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-black font-mono">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {sale.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODALS & DIALOGS
          ========================================================================= */}

      {/* Add / Edit Medicine Form Modal */}
      <MedicineForm
        key={isFormOpen ? (editingMedicine ? editingMedicine.medicineId : 'new-medicine') : 'closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMedicine(null);
        }}
        onSave={handleSaveMedicine}
        initialData={editingMedicine}
        categories={categories}
        existingMedicines={rawMedicines}
      />

      {/* View Medicine Details Modal */}
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
            setIsFormOpen(true);
          }}
          onAddBatch={(batchData) => {
            try {
              addBatch(batchData);
              toast.showSuccess(`Added new batch ${batchData.batchNo || batchData.batchNumber} to ${viewingMedicine.name}!`);
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onUpdateBatch={(batchId, batchData, reason) => {
            try {
              updateBatch(batchId, batchData, reason);
              toast.showSuccess('Batch updated successfully!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onDeleteBatch={(batchId) => {
            try {
              deleteBatch(batchId);
              toast.showSuccess('Batch removed successfully!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onAdjustStock={({ batchId, delta, actionType, reason }) => {
            try {
              adjustBatchStock(batchId, delta, actionType, reason);
              toast.showSuccess('Stock adjustment applied successfully!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Medicine from Catalog"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}" (${deleteTarget?.medicineId})? This will also remove all associated stock batches.`}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
};

export default MedicineCounter;
