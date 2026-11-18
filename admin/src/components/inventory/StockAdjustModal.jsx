import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Plus, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { STOCK_ACTION_TYPES } from '../../utils/constants';

export const StockAdjustModal = ({
  isOpen,
  onClose,
  batch,
  onApplyAdjustment,
}) => {
  const [operation, setOperation] = useState('ADD'); // 'ADD' | 'REMOVE' | 'SET'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('New shipment delivery intake');
  const [error, setError] = useState('');

  if (!batch) return null;

  const currentQty = Number(batch.quantity) || 0;
  const numAmount = parseInt(amount, 10) || 0;

  let newCalculatedQty = currentQty;
  let delta = 0;
  let actionType = STOCK_ACTION_TYPES.UPDATE_STOCK;

  if (operation === 'ADD') {
    delta = numAmount;
    newCalculatedQty = currentQty + numAmount;
    actionType = STOCK_ACTION_TYPES.ADD_STOCK;
  } else if (operation === 'REMOVE') {
    delta = -numAmount;
    newCalculatedQty = currentQty - numAmount;
    actionType = STOCK_ACTION_TYPES.REMOVE_STOCK;
  } else if (operation === 'SET') {
    delta = numAmount - currentQty;
    newCalculatedQty = numAmount;
    actionType = STOCK_ACTION_TYPES.UPDATE_STOCK;
  }

  const handleSave = (e) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please specify a valid positive number');
      return;
    }

    if (operation === 'REMOVE' && numAmount > currentQty) {
      setError(`Cannot remove ${numAmount} units. Current stock is only ${currentQty}! Negative stock is disallowed.`);
      return;
    }

    if (operation === 'SET' && numAmount < 0) {
      setError('Stock count cannot be set to a negative number.');
      return;
    }

    if (!reason.trim()) {
      setError('Audit reason is required for stock tracking.');
      return;
    }

    onApplyAdjustment({
      batchId: batch.batchId || batch.id,
      delta,
      actionType,
      reason: reason.trim(),
    });

    onClose();
  };

  const reasonSuggestions = [
    'New shipment delivery intake',
    'Physical stock audit count verification',
    'Damaged / broken container disposal',
    'Customer return to stock',
    'Expired units removal from shelf',
    'Transfer between store racks',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Stock: ${batch.batchNumber || batch.batchNo}`}
      subtitle={`Medicine: ${batch.medicineName} • Current stock: ${currentQty} units`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={numAmount <= 0 && operation !== 'SET'}
          >
            Apply Stock Update
          </Button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Operation Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Adjustment Operation
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setOperation('ADD');
                setError('');
                setReason('New shipment delivery intake');
              }}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 text-xs font-bold ${
                operation === 'ADD'
                  ? 'border-[#1C9A58] bg-emerald-50/70 text-[#0F3A2C]'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Plus className="w-4 h-4 text-[#1C9A58]" />
              <span>Add Stock (+)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOperation('REMOVE');
                setError('');
                setReason('Damaged / broken container disposal');
              }}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 text-xs font-bold ${
                operation === 'REMOVE'
                  ? 'border-red-500 bg-red-50/70 text-red-900'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Minus className="w-4 h-4 text-red-500" />
              <span>Remove Stock (-)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOperation('SET');
                setError('');
                setReason('Physical stock audit count verification');
              }}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 text-xs font-bold ${
                operation === 'SET'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-900'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span>Set Count (=)</span>
            </button>
          </div>
        </div>

        {/* Quantity Input & Realtime Preview Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Input
            label={
              operation === 'ADD'
                ? 'Units to Add'
                : operation === 'REMOVE'
                ? 'Units to Remove'
                : 'Exact Count on Shelf'
            }
            type="number"
            min="0"
            required
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            placeholder="e.g. 20"
            error={error}
          />

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 text-xs space-y-1.5">
            <p className="text-gray-500 font-medium">Stock Calculation Preview</p>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Stock:</span>
              <span className="font-bold text-gray-800">{currentQty} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stock Delta:</span>
              <span
                className={`font-bold ${
                  delta > 0
                    ? 'text-[#1C9A58]'
                    : delta < 0
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} units
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="font-semibold text-gray-900">New Shelf Stock:</span>
              <span
                className={`font-bold text-sm ${
                  newCalculatedQty < 0 ? 'text-red-600' : 'text-[#1C9A58]'
                }`}
              >
                {newCalculatedQty} units
              </span>
            </div>
          </div>
        </div>

        {newCalculatedQty < 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>
              Negative stock violation! You cannot reduce stock by more than the currently available units ({currentQty}).
            </span>
          </div>
        )}

        {/* Audit Reason */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Audit Reason (Recorded in Stock History) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            placeholder="State the reason for this physical count adjustment"
            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-transparent text-gray-900 mb-2"
          />

          <div className="flex flex-wrap gap-1.5">
            {reasonSuggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setReason(sug)}
                className="px-2 py-0.5 rounded-md text-[10px] bg-gray-100 hover:bg-emerald-50 hover:text-[#0F3A2C] text-gray-600 transition-colors"
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustModal;
