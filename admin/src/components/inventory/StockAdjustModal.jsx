import { useState } from 'react';
import {
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  Boxes,
  Check,
  FileText,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../common/Modal';
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
      title={
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Boxes className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
                Adjust Stock: {batch.batchNumber || batch.batchNo}
              </span>
              <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-2xs">
                Physical Inventory
              </span>
            </div>
            <p className="text-xs text-neutral-700 font-medium mt-0.5 truncate">
              Medicine: <strong className="text-black font-semibold">{batch.medicineName || 'Pharmaceutical'}</strong> • Stock:{' '}
              <strong className="text-black font-bold">{currentQty} units</strong>
            </p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 w-full">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span>Fields marked with <strong className="text-rose-600 font-bold">*</strong> are mandatory</span>
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-300 text-slate-700 hover:text-black hover:bg-slate-100 cursor-pointer transition-all text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={(numAmount <= 0 && operation !== 'SET') || newCalculatedQty < 0}
              className="flex-1 sm:flex-none bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg shadow-2xs hover:shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply Stock Update</span>
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-2.5 sm:space-y-3.5">
        {/* ========================================================
            CARD 1: CHOOSE ADJUSTMENT OPERATION (THEMED TABS)
            ======================================================== */}
        <div className="p-2.5 sm:p-4 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/50 via-white to-emerald-50/20 shadow-2xs space-y-2 sm:space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                <Boxes className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  1. Adjustment Operation
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium hidden sm:block">
                  Select whether you are adding incoming stock, removing units, or resetting the shelf count
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-black bg-slate-100 px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
              {operation === 'ADD' ? 'Adding (+)' : operation === 'REMOVE' ? 'Removing (-)' : 'Recount (=)'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
            {/* 1. Add Stock */}
            <button
              type="button"
              onClick={() => {
                setOperation('ADD');
                setError('');
                setReason('New shipment delivery intake');
              }}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 sm:gap-1.5 ${
                operation === 'ADD'
                  ? 'border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                  : 'border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Inbound
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-black truncate sm:whitespace-normal">Add (+)</p>
                <p className="text-[10px] text-neutral-600 font-medium hidden sm:block">New shipment delivery</p>
              </div>
            </button>

            {/* 2. Remove Stock */}
            <button
              type="button"
              onClick={() => {
                setOperation('REMOVE');
                setError('');
                setReason('Damaged / broken container disposal');
              }}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 sm:gap-1.5 ${
                operation === 'REMOVE'
                  ? 'border-2 border-rose-500 bg-gradient-to-br from-rose-50 via-white to-red-50/30 text-rose-950 shadow-xs ring-1 ring-rose-400'
                  : 'border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/30 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                  Outbound
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-black truncate sm:whitespace-normal">Remove (-)</p>
                <p className="text-[10px] text-neutral-600 font-medium hidden sm:block">Damage / write-off</p>
              </div>
            </button>

            {/* 3. Set Exact Count */}
            <button
              type="button"
              onClick={() => {
                setOperation('SET');
                setError('');
                setReason('Physical stock audit count verification');
              }}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 sm:gap-1.5 ${
                operation === 'SET'
                  ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50/30 text-blue-950 shadow-xs ring-1 ring-blue-400'
                  : 'border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1 rounded-lg bg-blue-100 text-blue-700">
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  Audit
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-black truncate sm:whitespace-normal">Set Count (=)</p>
                <p className="text-[10px] text-neutral-600 font-medium hidden sm:block">Shelf recount</p>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================
            CARD 2: SPECIFY UNITS & LIVE REALTIME CALCULATION
            ======================================================== */}
        <div className="p-2.5 sm:p-4 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/20 shadow-2xs space-y-2 sm:space-y-3 transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1 rounded-md shadow-2xs">
                <PackageCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  2. Units Quantity & Shelf Preview
                </h3>
                <p className="text-[11px] text-neutral-800 font-medium hidden sm:block">
                  Enter quantity and review computed final shelf count
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 items-start">
            {/* Quantity Input */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <span>
                  {operation === 'ADD'
                    ? 'Units to Add (+)'
                    : operation === 'REMOVE'
                    ? 'Units to Remove (-)'
                    : 'Exact Units Count on Shelf (=)'}
                </span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="e.g. 20"
                className={`w-full h-8 sm:h-10 px-3 sm:px-3.5 text-xs sm:text-sm font-bold bg-white border rounded-lg sm:rounded-xl text-black focus:outline-none focus:ring-1 transition-all ${
                  error
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                    : 'border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-blue-600/30'
                }`}
              />
              {error ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {error}
                </p>
              ) : (
                <span className="text-[11px] text-neutral-700 font-medium mt-1 hidden sm:block">
                  Positive integer units count
                </span>
              )}
            </div>

            {/* Realtime Live Calculation Card */}
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-blue-200/90 shadow-2xs text-xs space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-black uppercase tracking-wider">
                  Calculation Preview
                </span>
                <span className="text-[10px] text-neutral-500 font-medium">Live Audit</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-700 font-medium">Current Shelf Stock:</span>
                <span className="font-bold text-black">{currentQty} units</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-700 font-medium">Adjustment Delta:</span>
                <span
                  className={`font-bold ${
                    delta > 0
                      ? 'text-emerald-700'
                      : delta < 0
                      ? 'text-rose-600'
                      : 'text-neutral-500'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} units
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="font-bold text-black">New Shelf Stock:</span>
                <span
                  className={`font-extrabold text-sm tabular-nums ${
                    newCalculatedQty < 0 ? 'text-rose-600' : 'text-[#1C9A58]'
                  }`}
                >
                  {newCalculatedQty} units
                </span>
              </div>
            </div>
          </div>
        </div>

        {newCalculatedQty < 0 && (
          <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              Negative stock violation! You cannot reduce stock by more than currently available units ({currentQty}).
            </span>
          </div>
        )}

        {/* ========================================================
            CARD 3: AUDIT REASON & QUICK REASON TAGS (SLATE THEME)
            ======================================================== */}
        <div className="p-2.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 sm:space-y-2.5">
          <label className="flex items-center gap-1 text-xs font-bold text-black">
            <FileText className="w-3.5 h-3.5 text-neutral-600" />
            <span>Audit Reason (Recorded in Stock History)</span>
            <span className="text-rose-600">*</span>
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
            className="w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold bg-white border border-slate-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 rounded-lg text-black transition-all"
          />

          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-600 block mb-1">Quick Select Reasons:</span>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {reasonSuggestions.map((sug) => {
                const isSelected = reason === sug;
                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setReason(sug);
                      setError('');
                    }}
                    className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-400'
                        : 'bg-slate-50 text-black border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60'
                    }`}
                  >
                    + {sug}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustModal;
