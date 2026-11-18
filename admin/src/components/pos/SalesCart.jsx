import { ShoppingCart, Trash2, User, Phone } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
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
    <Card className="sticky top-20 shadow-xs">
      <CardHeader
        title="Active Sales Cart"
        subtitle={`${orderSummary.lineItemCount} medicines (${orderSummary.totalItems} units)`}
        action={
          cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={Trash2}
              onClick={onClearCart}
              title="Clear all cart items"
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear
            </Button>
          )
        }
      />

      {/* Walk-in Customer Fields */}
      <div className="mt-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100 grid grid-cols-2 gap-2 text-xs">
        <div className="relative">
          <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Customer Name"
            value={customerInfo.name}
            onChange={(e) =>
              onCustomerInfoChange({ ...customerInfo, name: e.target.value })
            }
            className="w-full h-8 pl-7 pr-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1C9A58] text-gray-800"
          />
        </div>

        <div className="relative">
          <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Phone Number (Opt)"
            value={customerInfo.phone}
            onChange={(e) =>
              onCustomerInfoChange({ ...customerInfo, phone: e.target.value })
            }
            className="w-full h-8 pl-7 pr-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1C9A58] text-gray-800"
          />
        </div>
      </div>

      {/* Cart Items List */}
      <div className="mt-3 divide-y divide-gray-100 max-h-[380px] overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            <ShoppingCart className="w-9 h-9 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
            <p className="font-semibold text-gray-600">Cart is empty</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Select medicines from the catalog to build a bill.
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
