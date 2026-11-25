import { useState, useMemo } from 'react';
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
  Receipt,
  Search,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { STOCK_ACTION_TYPES } from '../../utils/constants';
import { useSales } from '../../hooks/useSales';

export const StockAdjustModal = ({
  isOpen,
  onClose,
  batch,
  onApplyAdjustment,
}) => {
  const { sales, processCustomerReturn } = useSales();
  const [operation, setOperation] = useState('ADD'); // 'ADD' | 'REMOVE' | 'SET'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('New shipment delivery intake');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!batch) return null;

  const isCustomerReturn = reason.trim().toLowerCase().includes('customer return');

  // Helpers for strict medicine matching (guaranteeing no [object Object] false positives)
  const cleanMedicineText = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().replace(/\[object object\]/gi, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const extractCleanId = (val) => {
    if (!val) return '';
    if (typeof val === 'object' && val !== null) {
      return (val._id || val.id || val.medicineId || '').toString().trim().toLowerCase();
    }
    const s = String(val).trim().toLowerCase();
    if (s === '[object object]') return '';
    return s;
  };

  const checkIsSameMedicine = (b, it) => {
    if (!b || !it) return false;

    // 1. Check Batch Number if present on both
    const bBatch = (b.batchNumber || b.batchNo || '').trim().toLowerCase();
    const itBatch = (it.batchNumber || it.batchNo || it.batchId || '').trim().toLowerCase();
    if (bBatch && itBatch && bBatch === itBatch) {
      return true;
    }

    // 2. Check Medicine ID if present on both (excluding [object Object])
    const bId = extractCleanId(b.medicineId || b.medicineCode);
    const itId = extractCleanId(it.medicineId || it.medicineCode);
    if (bId && itId && bId === itId) {
      return true;
    }

    // 3. Check Medicine Name (Strict primary token match, not loose substring)
    const bName = cleanMedicineText(
      b.medicineName || (typeof b.medicineId === 'object' && b.medicineId !== null ? b.medicineId.name : '')
    );
    const itName = cleanMedicineText(it.medicineName || it.name);

    if (!bName || !itName) return false;
    if (bName === itName) return true;

    const bTokens = bName.split(' ').filter((w) => w.length >= 3);
    const itTokens = itName.split(' ').filter((w) => w.length >= 3);

    if (bTokens.length > 0 && itTokens.length > 0) {
      // Must match primary brand token
      if (bTokens[0] === itTokens[0]) {
        return true;
      }
    }

    return false;
  };

  // Find matching sale from invoice number
  const matchedSale = useMemo(() => {
    if (!invoiceNumber.trim() || !sales) return null;
    const inv = invoiceNumber.trim().toLowerCase();
    return sales.find((s) => {
      const sInv = (s.invoiceNumber || '').toLowerCase().trim();
      return sInv === inv || sInv.replace(/[-_ ]/g, '') === inv.replace(/[-_ ]/g, '');
    });
  }, [invoiceNumber, sales]);

  // Find matching medicine line item in the matched invoice
  const matchedItem = useMemo(() => {
    if (!matchedSale || !batch) return null;
    return (matchedSale.items || []).find((it) => checkIsSameMedicine(batch, it));
  }, [matchedSale, batch]);

  // Suggest recent invoices that genuinely sold this medicine to assist user
  const recentInvoicesWithMedicine = useMemo(() => {
    if (!batch || !sales) return [];
    return sales
      .filter((s) => (s.items || []).some((it) => checkIsSameMedicine(batch, it)))
      .slice(0, 3);
  }, [batch, sales]);

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount <= 0) {
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

    // Customer Return Validation
    if (isCustomerReturn) {
      if (!invoiceNumber.trim()) {
        setError('Please enter the original sales invoice number for this customer return.');
        return;
      }
      if (!matchedSale) {
        setError(`Invoice #${invoiceNumber.trim()} was not found in sales history.`);
        return;
      }
      if (!matchedItem) {
        setError(
          `Incorrect Invoice! Invoice #${matchedSale.invoiceNumber} is for "${(matchedSale.items || []).map((i) => i.medicineName).join(', ')}" and does NOT contain "${batch.medicineName || 'this medicine'}". Please select the correct invoice.`
        );
        return;
      }
      if (numAmount > matchedItem.quantity) {
        setError(
          `Cannot return ${numAmount} units. Only ${matchedItem.quantity} units were sold on Invoice #${matchedSale.invoiceNumber}.`
        );
        return;
      }

      setIsSubmitting(true);
      try {
        if (processCustomerReturn) {
          await processCustomerReturn({
            invoiceNumber: matchedSale.invoiceNumber,
            batchId: batch.batchId || batch.id,
            batchNumber: batch.batchNumber || batch.batchNo || matchedItem.batchNumber,
            medicineId: batch.medicineId || batch.medicineCode || matchedItem.medicineId,
            medicineName: batch.medicineName || matchedItem.medicineName,
            quantity: numAmount,
            reason: reason.trim(),
          });
        }

        if (onApplyAdjustment) {
          onApplyAdjustment({
            batchId: batch.batchId || batch.id,
            delta: numAmount,
            actionType: STOCK_ACTION_TYPES.ADD_STOCK,
            reason: `${reason.trim()} (Invoice: #${matchedSale.invoiceNumber})`,
            invoiceNumber: matchedSale.invoiceNumber,
            isCustomerReturn: true,
          });
        }

        onClose();
      } catch (err) {
        setError(err.message || 'Failed to process customer return.');
      } finally {
        setIsSubmitting(false);
      }
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
              disabled={
                (numAmount <= 0 && operation !== 'SET') ||
                newCalculatedQty < 0 ||
                isSubmitting ||
                (isCustomerReturn && (!matchedSale || !matchedItem))
              }
              className="flex-1 sm:flex-none bg-[#1C9A58] hover:bg-[#158046] text-white font-bold text-xs px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg shadow-2xs hover:shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Return...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Apply Stock Update</span>
                </>
              )}
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
                      if (sug === 'Customer return to stock') {
                        setOperation('ADD');
                      }
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

        {/* ========================================================
            CARD 4: CUSTOMER RETURN INVOICE VERIFICATION (EMERALD THEME)
            ======================================================== */}
        {isCustomerReturn && (
          <div className="p-2.5 sm:p-4 rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 shadow-2xs space-y-2.5 transition-all">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-1 rounded-md shadow-2xs">
                  <Receipt className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                    Customer Sales Invoice Reference
                  </h3>
                  <p className="text-[11px] text-neutral-800 font-medium hidden sm:block">
                    Specify the sales invoice to verify and deduct the returned medicine
                  </p>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-300 whitespace-nowrap shrink-0">
                Audit Return
              </span>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-black mb-1">
                <span>Invoice Number</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  setError('');
                }}
                placeholder="e.g. INV-20261123-7881 or ABM-20261123-1234"
                className="w-full h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-mono font-bold bg-white border border-emerald-300 hover:border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 rounded-lg text-black transition-all"
              />
            </div>

            {/* Quick helper chips for recent matching invoices */}
            {recentInvoicesWithMedicine.length > 0 && !invoiceNumber.trim() && (
              <div className="pt-0.5">
                <span className="text-[10px] text-neutral-600 font-semibold block mb-1">
                  Recent sales containing this medicine:
                </span>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {recentInvoicesWithMedicine.map((s) => (
                    <button
                      key={s.invoiceNumber}
                      type="button"
                      onClick={() => {
                        setInvoiceNumber(s.invoiceNumber);
                        setError('');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-emerald-800 border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer shadow-2xs"
                    >
                      #{s.invoiceNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Verification Status Card */}
            {invoiceNumber.trim() && (
              <div className="pt-1">
                {matchedSale && matchedItem ? (
                  <div className="p-3 bg-white rounded-xl border-2 border-emerald-500 shadow-2xs text-xs space-y-1.5 transition-all">
                    <div className="flex items-center justify-between text-emerald-950 font-bold pb-1 border-b border-emerald-100">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                        <span>Correct Invoice Verified: #{matchedSale.invoiceNumber}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                        {matchedItem.quantity} units sold
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-700 pt-0.5">
                      <div>
                        Medicine: <strong className="text-black">{matchedItem.medicineName}</strong>
                      </div>
                      <div className="text-right">
                        Unit Price: <strong className="text-black">Rs. {Number(matchedItem.unitPrice || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                    {matchedSale.items && matchedSale.items.length > 1 ? (
                      <div className="p-1.5 bg-blue-50/80 border border-blue-200 rounded text-[10px] text-blue-900 font-medium">
                        ℹ️ This invoice contains {matchedSale.items.length} items. Only <strong>{matchedItem.medicineName}</strong> will be removed/deducted from the invoice; all other medicines on this invoice remain untouched.
                      </div>
                    ) : (
                      <p className="text-[10px] text-emerald-800 font-semibold pt-0.5">
                        ✓ Only {matchedItem.medicineName} will be removed from sales history & reports and restored to shelf stock.
                      </p>
                    )}
                  </div>
                ) : matchedSale && !matchedItem ? (
                  <div className="p-3 bg-rose-50 rounded-xl border-2 border-rose-300 text-xs text-rose-950 space-y-1.5 shadow-2xs transition-all">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
                      <span>Incorrect Invoice Selected</span>
                    </div>
                    <p className="text-[11px] text-rose-900 leading-normal">
                      Invoice <strong>#{matchedSale.invoiceNumber}</strong> is for{' '}
                      <span className="font-semibold text-black">
                        {(matchedSale.items || []).map((i) => i.medicineName).join(', ') || 'other items'}
                      </span>
                      , but does <strong>NOT</strong> contain{' '}
                      <span className="font-bold underline text-black">{batch.medicineName || 'this medicine'}</span>.
                    </p>
                    <p className="text-[11px] font-bold text-rose-700 bg-white/80 p-1.5 rounded-lg border border-rose-200">
                      👉 Please select or enter the correct invoice number for {batch.medicineName || 'this medicine'}.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-medium">
                      Checking sales records: Invoice "{invoiceNumber.trim()}" not found.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default StockAdjustModal;
