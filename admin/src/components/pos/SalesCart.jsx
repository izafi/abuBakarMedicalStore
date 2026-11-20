import { ShoppingCart, Trash2, User, Phone } from 'lucide-react';
import { Card } from '../common/Card';
import { CartItem } from './CartItem';
import { PaymentSelector } from './PaymentSelector';
import { OrderSummary } from './OrderSummary';

export const SalesCart = ({
  cart = [],
  availableBatches = [],
  orderSummary,
  customerInfo,
  onCustomerInfoChange,
  paymentMethod,
  onPaymentMethodChange,
  amountReceived,
  onAmountReceivedChange,
  onQuantityChange,
  onDiscountChange,
  onBatchChange,
  onRemoveItem,
  onClearCart,
  onCheckout,
  cashierName,
  canAddSale = true,
}) => {
  return (
    <Card className="sticky top-20 shadow-xs p-4 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-[#1C9A58]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-black leading-tight">
              Active Sales Cart
            </h3>
            <p className="text-xs font-semibold text-black mt-0.5">
              {orderSummary.lineItemCount} {orderSummary.lineItemCount === 1 ? 'medicine' : 'medicines'} ({orderSummary.totalItems} {orderSummary.totalItems === 1 ? 'unit' : 'units'})
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            title="Clear all cart items"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Customer Info Fields */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
        <div className="relative">
          <User className="w-3.5 h-3.5 text-black absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Walk-in Customer"
            value={customerInfo.name}
            onChange={(e) =>
              onCustomerInfoChange({ ...customerInfo, name: e.target.value })
            }
            className="w-full h-8 pl-8 pr-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58]/20 focus:border-[#1C9A58] text-black shadow-xs placeholder:text-slate-400 placeholder:font-normal"
          />
        </div>

        <div className="relative">
          <Phone className="w-3.5 h-3.5 text-black absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Phone Number (Opt)"
            value={customerInfo.phone}
            onChange={(e) =>
              onCustomerInfoChange({ ...customerInfo, phone: e.target.value })
            }
            className="w-full h-8 pl-8 pr-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58]/20 focus:border-[#1C9A58] text-black shadow-xs placeholder:text-slate-400 placeholder:font-normal"
          />
        </div>
      </div>

      {/* Cart Items List with ample spacing */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto no-scrollbar pr-0.5">
        {cart.length === 0 ? (
          <div className="py-12 text-center text-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-2.5">
              <ShoppingCart className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-bold text-black text-sm">Cart is empty</p>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Search a medicine on the left to add items to bill.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.cartItemId}
              item={item}
              availableBatches={availableBatches}
              onQuantityChange={onQuantityChange}
              onDiscountChange={onDiscountChange}
              onBatchChange={onBatchChange}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Payment Selection */}
      {cart.length > 0 && (
        <PaymentSelector
          paymentMethod={paymentMethod}
          onMethodChange={onPaymentMethodChange}
          amountReceived={amountReceived}
          onAmountReceivedChange={onAmountReceivedChange}
          grandTotal={orderSummary.grandTotal}
        />
      )}

      {/* Checkout Order Summary */}
      <OrderSummary
        orderSummary={orderSummary}
        onCheckout={onCheckout}
        disabled={cart.length === 0 || !canAddSale}
        cashierName={cashierName}
      />
    </Card>
  );
};

export default SalesCart;
