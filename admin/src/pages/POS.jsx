import { useState, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  MapPin,
  Clock,
  Plus,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { Badge } from '../components/common/Badge';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { SalesCart } from '../components/pos/SalesCart';
import { CheckoutModal } from '../components/pos/CheckoutModal';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';

export const POS = () => {
  const { medicines, batches } = useInventory();
  const {
    cart,
    addToCart,
    updateCartQuantity,
    updateCartDiscount,
    updateCartBatch,
    removeFromCart,
    clearCart,
    customerInfo,
    setCustomerInfo,
    paymentMethod,
    setPaymentMethod,
    amountReceived,
    setAmountReceived,
    orderSummary,
  } = useSales();
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();

  const canAddSale = hasPermission('sales', 'add');

  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  // Filter medicines that have valid sellable stock
  const availableMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        med.name.toLowerCase().includes(q) ||
        med.genericName.toLowerCase().includes(q) ||
        med.brand?.toLowerCase().includes(q) ||
        med.formula?.toLowerCase().includes(q) ||
        med.batchNo?.toLowerCase().includes(q) ||
        med.category?.toLowerCase().includes(q);

      const hasStock = med.availableStock > 0;
      return matchesSearch && hasStock;
    });
  }, [medicines, searchQuery]);

  const handleAddToCart = (med, batch = null) => {
    if (!canAddSale) {
      toast.showError('Access Denied: You do not have permission to add sales.');
      return;
    }
    try {
      addToCart(med, 1, batch);
      toast.showSuccess(`Added ${med.name} to active cart`);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleCheckout = () => {
    if (!canAddSale) {
      toast.showError('Access Denied: You do not have permission to checkout.');
      return;
    }
    if (cart.length === 0) {
      toast.showError('Cart is empty. Please add medicines before checkout.');
      return;
    }
    setCheckoutModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Point of Sale (POS) Billing
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Counter dispensing, multiple batches selection, discounts, and instant receipt printing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Medicine Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name, generic formula, strength, or batch..."
            />
          </Card>

          {/* Medicines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {availableMedicines.length === 0 ? (
              <div className="sm:col-span-2 py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-6">
                <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">No sellable medicines found</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Try adjusting your search or add incoming stock in the Inventory module.
                </p>
              </div>
            ) : (
              availableMedicines.map((med) => {
                const medBatches = batches.filter(
                  (b) => b.medicineId === med.medicineId && b.canSell && b.quantity > 0
                );

                return (
                  <div
                    key={med.id}
                    className="p-4 bg-white rounded-xl border border-gray-100 hover:border-[#1C9A58] hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm leading-snug">
                            {med.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5 font-medium">
                            {med.genericName} ({med.strength})
                          </p>
                        </div>
                        <span className="font-black text-sm text-[#1C9A58] shrink-0">
                          {formatCurrency(med.sellingPrice)}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>{med.location}</span>
                          </span>
                          <span className="font-mono text-gray-400">
                            {med.batchNo}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            Exp: {formatDate(med.expiryDate)}
                          </span>
                          <Badge variant="success" size="sm">
                            {med.availableStock} in stock
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Batch selection chips if multiple batches exist */}
                    {medBatches.length > 1 ? (
                      <div className="pt-2 border-t border-gray-100 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-gray-400" />
                          Choose Batch:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {medBatches.map((b) => (
                            <button
                              key={b.batchId || b.id}
                              type="button"
                              onClick={() => handleAddToCart(med, b)}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-50 hover:bg-emerald-50 hover:text-[#0F3A2C] border border-gray-200 transition-colors"
                              title={`Add from batch ${b.batchNumber} (${b.quantity} units, exp: ${b.expiryDate})`}
                            >
                              +{b.batchNumber} ({b.quantity})
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        iconLeft={Plus}
                        onClick={() => handleAddToCart(med)}
                        className="text-xs"
                      >
                        Add to Bill
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Reusable SalesCart Component (5 Cols) */}
        <div className="lg:col-span-5">
          <SalesCart
            cart={cart}
            availableBatches={batches}
            orderSummary={orderSummary}
            customerInfo={customerInfo}
            onCustomerInfoChange={setCustomerInfo}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            amountReceived={amountReceived}
            onAmountReceivedChange={setAmountReceived}
            onQuantityChange={updateCartQuantity}
            onDiscountChange={updateCartDiscount}
            onBatchChange={updateCartBatch}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onCheckout={handleCheckout}
            cashierName={currentUser?.name || 'Staff Pharmacist'}
            canAddSale={canAddSale}
          />
        </div>
      </div>

      {/* Mandatory Three-Step Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onSuccess={(invoice) => {
          setLastInvoice(invoice);
        }}
      />

      {/* Printable Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(lastInvoice)}
        onClose={() => setLastInvoice(null)}
        invoice={lastInvoice}
        onNewSale={() => setLastInvoice(null)}
      />
    </div>
  );
};

export default POS;
