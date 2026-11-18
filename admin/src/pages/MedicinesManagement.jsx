import { useState, useMemo } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Filter,
  RotateCcw,
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
    <div className="space-y-6">
      {/* Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Medicines Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
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
            className="shadow-sm font-bold"
          >
            Add New Medicine
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name, generic INN formula, manufacturer, or Medicine ID..."
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-[#1C9A58] min-w-[140px]"
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
              className="h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-[#1C9A58] min-w-[120px]"
            >
              <option value="All">All Types</option>
              {MEDICINE_TYPES.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* View Mode Toggle: Table or Grid */}
            <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Ribbon */}
        {(selectedCategory !== 'All' || selectedType !== 'All' || searchQuery) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-3.5 h-3.5 text-[#1C9A58]" />
              <span>
                Filtering: {filteredMedicines.length} of {medicines.length} medicines
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedType('All');
              }}
              className="text-xs text-rose-600 hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Filters
            </button>
          </div>
        )}
      </Card>

      {/* Main View: Table or Card Grid */}
      {viewMode === 'table' ? (
        <MedicineTable
          medicines={filteredMedicines}
          onViewDetails={(med) => setViewingMedicine(med)}
          onEdit={(med) => {
            setEditingMedicine(med);
            setIsFormOpen(true);
          }}
          onDelete={(med) => setDeleteTarget(med)}
          pageSize={10}
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

      {/* Complete Medicine Details Modal */}
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
