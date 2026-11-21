import { useState, useMemo } from 'react';
import {
  PackageSearch,
  Layers,
  MapPin,
  Clock,
  Plus,
  Search,
  ShoppingCart,
  UserCheck,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
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
    applyCartDiscountToAll,
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

  // Filter medicines ONLY when search query is entered (medicines hidden by default)
  const availableMedicines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return []; // Hidden until searched
    }

    return medicines.filter((med) => {
      const matchesSearch =
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
      toast.showSuccess(`Added ${med.name} to bill`);
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
    <div className="space-y-4">
      {/* Page Title & Status Header (NO STATS CARDS) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-[#1C9A58]" />
            </div>
            Point of Sale (POS) Billing
          </h1>
          <p className="text-xs sm:text-sm text-black font-semibold mt-0.5">
            Counter dispensing, multiple batches selection, discounts, and instant receipt printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-950 shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#1C9A58]" />
            <span>Cashier: {currentUser?.name || 'Ayesha Khan'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side (5 cols) & Active Sales Cart (7 cols - Spacious & Wider) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Search & Dynamic Medicine Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Main POS Search Bar Card */}
          <Card className="p-3.5 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type medicine name, formula, or batch..."
                className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-slate-50 hover:bg-white focus:bg-white text-black shadow-xs focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                autoFocus
              />
              <Search className="w-4 h-4 text-black absolute left-3.5 top-3.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 rounded-full hover:bg-slate-200 text-slate-500 hover:text-black absolute right-3 top-2.5 flex items-center justify-center cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Medicine Preset Chips for 1-Click Search (Dynamic from real catalog) */}
            {medicines.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black whitespace-nowrap mr-0.5">
                  QUICK:
                </span>
                {medicines.slice(0, 8).map((m) => (
                  <button
                    key={m.medicineId || m.id || m.name}
                    type="button"
                    onClick={() => setSearchQuery(m.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      searchQuery.toLowerCase() === m.name.toLowerCase()
                        ? 'bg-[#1C9A58] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-black border border-slate-200'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* DYNAMIC RESULTS DISPLAY */}
          {searchQuery.trim() === '' ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#1C9A58] shadow-xs">
                <PackageSearch className="w-7 h-7" />
              </div>
              <div className="max-w-xs mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-black">
                  Search Medicine to Dispense
                </h3>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Type medicine brand name, active generic formula, strength, or batch number above to look up stock and add to the bill.
                </p>
              </div>

              {/* Quick Feature Badges */}
              <div className="flex flex-col gap-2 pt-1 text-left max-w-xs mx-auto">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-black">
                  <CheckCircle2 className="w-4 h-4 text-[#1C9A58] shrink-0" />
                  <span>Real-time Available Stock Verification</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-black">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Multi-Batch Selection & Switching</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-black">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>FIFO Expiry Safeguard Alerts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search result summary header */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-black">
                  Found <span className="text-[#1C9A58] font-mono font-extrabold">{availableMedicines.length}</span> result{availableMedicines.length === 1 ? '' : 's'} for "{searchQuery}"
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-black font-semibold text-xs cursor-pointer"
                >
                  Clear Results
                </button>
              </div>

              {/* Matching Medicines List (Single Column Spacious Cards) */}
              {availableMedicines.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2">
                  <PackageSearch className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="font-bold text-black text-sm">
                    No active medicines found matching "{searchQuery}"
                  </p>
                  <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
                    Check spelling or verify stock in the Inventory module.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3.5 py-1.5 text-xs font-bold text-black bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[640px] overflow-y-auto no-scrollbar pr-0.5">
                  {availableMedicines.map((med) => {
                    const medBatches = batches.filter(
                      (b) => b.medicineId === med.medicineId && b.canSell && b.quantity > 0
                    );

                    return (
                      <div
                        key={med.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-[#1C9A58] hover:shadow-md transition-all space-y-2.5"
                      >
                        {/* Header: Name, Strength, Formula, and Price */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-black text-sm leading-snug">
                                {med.name}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                {med.strength}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold mt-0.5">
                              {med.genericName}
                            </p>
                          </div>
                          <span className="font-bold font-mono text-base text-[#1C9A58] shrink-0">
                            {formatCurrency(med.sellingPrice)}
                          </span>
                        </div>

                        {/* Location, Batch, Expiry, and Stock */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-black font-semibold text-[11px]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#1C9A58]" />
                              <span>{med.location}</span>
                            </span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="font-mono font-bold text-black">
                              {med.batchNo}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-600 font-medium">
                              Exp: {formatDate(med.expiryDate)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                              {med.availableStock} in stock
                            </span>
                          </div>
                        </div>

                        {/* Batch selection chips or prominent Add to Bill Button */}
                        {medBatches.length > 1 ? (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-[#1C9A58]" />
                              Choose Batch:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {medBatches.map((b) => (
                                <button
                                  key={b.batchId || b.id}
                                  type="button"
                                  onClick={() => handleAddToCart(med, b)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-300 transition-colors cursor-pointer shadow-xs"
                                  title={`Add from batch ${b.batchNumber} (${b.quantity} units, exp: ${b.expiryDate})`}
                                >
                                  +{b.batchNumber} ({b.quantity})
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(med)}
                            className="w-full py-2 px-3 rounded-xl font-bold text-xs text-white bg-[#1C9A58] hover:bg-[#0F3A2C] transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Bill
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Reusable SalesCart Component (7 Cols - Spacious & Beautiful) */}
        <div className="lg:col-span-7">
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
            onApplyCartDiscount={applyCartDiscountToAll}
            onBatchChange={updateCartBatch}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onCheckout={handleCheckout}
            cashierName={currentUser?.name || 'Ayesha Khan'}
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
