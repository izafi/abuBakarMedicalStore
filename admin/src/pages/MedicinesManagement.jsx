import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  List,
  Filter,
  RotateCcw,
  Pill,
  PackageX,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MedicineForm } from '../components/medicines/MedicineForm';
import { MedicineTable } from '../components/medicines/MedicineTable';
import { MedicineDetails } from '../components/medicines/MedicineDetails';
import { MedicineCard } from '../components/medicines/MedicineCard';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { MEDICINE_TYPES } from '../utils/constants';

export const MedicinesManagement = () => {
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
  const { hasPermission } = useAuth();
  const toast = useToast();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Top KPI Metric Calculations
  const totalCount = medicines.length;

  const outOfStockCount = useMemo(() => {
    return medicines.filter((m) => (m.stock || 0) === 0).length;
  }, [medicines]);

  const expiredCount = useMemo(() => {
    return batches.filter((b) => b.isExpired && (Number(b.quantity) || 0) > 0).length;
  }, [batches]);

  // Filtered List
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        med.name.toLowerCase().includes(q) ||
        med.genericName.toLowerCase().includes(q) ||
        (med.brand && med.brand.toLowerCase().includes(q)) ||
        (med.formula && med.formula.toLowerCase().includes(q)) ||
        (med.manufacturer && med.manufacturer.toLowerCase().includes(q)) ||
        med.medicineId.toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === 'All' || med.category === selectedCategory;

      const matchesType =
        selectedType === 'All' || med.type === selectedType;

      return matchesSearch && matchesCat && matchesType;
    });
  }, [medicines, searchQuery, selectedCategory, selectedType]);

  // Handle Save (Add or Edit)
  const handleSaveMedicine = ({ medicineData, initialBatch }) => {
    try {
      if (editingMedicine) {
        updateMedicine(editingMedicine.medicineId, medicineData);
        toast.showSuccess(`Updated ${medicineData.name} successfully`);
      } else {
        addMedicine(medicineData, initialBatch);
        toast.showSuccess(`Registered ${medicineData.name} (${medicineData.medicineId}) to catalog`);
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
      toast.showSuccess(`Deleted "${deleteTarget.name}" and removed all linked batches.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  // Handle Add Batch from details view
  const handleAddBatch = (batchData) => {
    try {
      addBatch(batchData);
      toast.showSuccess(`Added new batch ${batchData.batchNo} to ${viewingMedicine?.name}`);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  // Handle Delete Batch from details view
  const handleDeleteBatch = (batchId) => {
    try {
      deleteBatch(batchId);
      toast.showSuccess('Batch removed successfully');
    } catch (err) {
      toast.showError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">
            Medicines Management
          </h1>
          <p className="text-xs text-neutral-800 font-medium mt-0.5">
            Directory of pharmaceuticals, active formulas, therapeutic types, and decoupled batch stock.
          </p>
        </div>

        {hasPermission('medicines', 'add') && (
          <Button
            variant="primary"
            iconLeft={Plus}
            onClick={() => {
              setEditingMedicine(null);
              setIsFormOpen(true);
            }}
            className="bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
          >
            Add New Medicine
          </Button>
        )}
      </div>

      {/* COMPACT & MINIMALISTIC KPI SUMMARY TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Total Medicines */}
        <div
          onClick={() => {
            setSearchQuery('');
            setSelectedCategory('All');
            setSelectedType('All');
            toast.showInfo('Showing all catalog medicines');
          }}
          className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          title="Click to view all catalog medicines"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#1C9A58] border border-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Pill className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold text-black uppercase tracking-wider block leading-tight">
                Total Medicines
              </span>
              <span className="text-[11px] text-neutral-700 font-medium block leading-tight mt-0.5">
                All catalog items
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <span className="text-lg font-bold text-black">
              {totalCount}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-black group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* 2. Out of Stock Medicines */}
        <div
          onClick={() => navigate('/inventory?status=OUT_OF_STOCK')}
          className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 hover:border-rose-600 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to manage out of stock medicines in Inventory"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PackageX className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold text-black uppercase tracking-wider block leading-tight">
                Out of Stock
              </span>
              <span className="text-[11px] text-rose-700 font-bold block leading-tight mt-0.5">
                Needs restock
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <span className="text-lg font-bold text-rose-600">
              {outOfStockCount}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* 3. Expired Medicines */}
        <div
          onClick={() => navigate('/inventory?expiry=EXPIRED')}
          className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 hover:border-amber-600 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to manage expired medicines in Inventory"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold text-black uppercase tracking-wider block leading-tight">
                Expired Stock
              </span>
              <span className="text-[11px] text-amber-800 font-bold block leading-tight mt-0.5">
                Expired batches
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <span className="text-lg font-bold text-amber-700">
              {expiredCount}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Black & Crisp Text) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-2.5 sm:p-3">
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          <div className="flex-1 w-full">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name, generic formula, or Medicine ID..."
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
              onChange={(e) => setSelectedType(e.target.value)}
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
                Filtering: <strong className="font-bold text-black">{filteredMedicines.length}</strong> of {medicines.length} medicines
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedType('All');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main View: Compact Table (Default 30 records per page) or Card Grid */}
      {viewMode === 'table' ? (
        <MedicineTable
          medicines={filteredMedicines}
          onViewDetails={(med) => setViewingMedicine(med)}
          onEdit={(med) => {
            setEditingMedicine(med);
            setIsFormOpen(true);
          }}
          onDelete={(med) => setDeleteTarget(med)}
          pageSize={30}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedicines.map((med) => (
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

      {/* Redesigned Clean & Spacious Medicine Details Modal */}
      {viewingMedicine && (
        <MedicineDetails
          isOpen={Boolean(viewingMedicine)}
          onClose={() => setViewingMedicine(null)}
          medicine={viewingMedicine}
          batches={batches.filter((b) => b.medicineId === viewingMedicine.medicineId)}
          allBatches={batches}
          onEdit={(med) => {
            setEditingMedicine(med);
            setIsFormOpen(true);
          }}
          onAddBatch={handleAddBatch}
          onUpdateBatch={(batchId, batchData, reason) => {
            try {
              updateBatch(batchId, batchData, reason);
              toast.showSuccess('Batch updated successfully!');
            } catch (err) {
              toast.showError(err.message);
            }
          }}
          onDeleteBatch={handleDeleteBatch}
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

export default MedicinesManagement;
