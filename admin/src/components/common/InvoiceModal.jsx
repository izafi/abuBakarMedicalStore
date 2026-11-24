import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  PlusCircle,
  Clock,
  User,
  Stethoscope,
  CreditCard,
  Banknote,
  CheckCircle,
  History,
  ShieldCheck,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { Badge } from './Badge';
import { APP_INFO } from '../../utils/constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useSettings } from '../../hooks/useSettings';

// Clean medicine subtitle helper to remove raw chemical formulas like C16H19N3O5S
const formatMedicineSubtitle = (item) => {
  if (item.genericName && item.genericName !== item.medicineName) {
    return `${item.genericName}${item.strength ? ` (${item.strength})` : ''}`;
  }
  if (item.formula) {
    // If formula is a raw molecular formula (e.g. C16H19N3O5S + C8H9NO5)
    if (/[A-Z][0-9]+[A-Z]/.test(item.formula)) {
      const match = item.formula.match(/\((.*?)\)/);
      if (match) return `Dosage: ${match[1]}`;
      return item.strength ? `Strength: ${item.strength}` : (item.dosageForm || item.pack || '');
    }
    return `${item.formula}${item.strength ? ` (${item.strength})` : ''}`;
  }
  if (item.strength) return `Strength: ${item.strength}`;
  return item.dosageForm || item.pack || '';
};

// Clean realistic Code 128 / Barcode SVG generator
const InvoiceBarcode = ({ value }) => {
  // Deterministic bar widths based on char codes
  const bars = (value || 'ABM-INV-0001')
    .split('')
    .map((char, i) => {
      const code = char.charCodeAt(0);
      const w1 = (code % 3) + 1;
      const w2 = ((code * 2) % 3) + 1;
      return (
        <span key={i} className="inline-flex items-center gap-[2px]">
          <span
            className="inline-block bg-black h-8 sm:h-9"
            style={{ width: `${w1 * 1.4}px` }}
          />
          <span
            className="inline-block bg-transparent h-8 sm:h-9"
            style={{ width: `${w2 * 1.2}px` }}
          />
        </span>
      );
    });

  return (
    <div className="flex flex-col items-center justify-center my-2 select-none">
      <div className="flex items-center overflow-hidden px-2 py-1 bg-white border border-gray-200 rounded">
        <span className="inline-block bg-black h-8 sm:h-9 w-[2px] mr-1" />
        {bars}
        <span className="inline-block bg-black h-8 sm:h-9 w-[3px] ml-1" />
      </div>
      <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-gray-700 font-bold mt-1 uppercase">
        *{value}*
      </span>
    </div>
  );
};

export const InvoiceModal = ({ isOpen, onClose, invoice, onNewSale }) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'

  // Manage print class on body for DOM isolation during printing
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('invoice-modal-open');
    } else {
      document.body.classList.remove('invoice-modal-open');
    }
    return () => {
      document.body.classList.remove('invoice-modal-open');
    };
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const storeName = settings?.storeName || invoice.store?.name || APP_INFO.NAME;
  const storeTagline = settings?.tagline || invoice.store?.tagline || 'Retail & Dispensing Chemists';
  const storeAddress = settings?.address || invoice.store?.address || APP_INFO.ADDRESS;
  const storePhone = settings?.phone || settings?.contactNumber || invoice.store?.phone || APP_INFO.PHONE;
  const storeLicense = settings?.licenseNumber || invoice.store?.licenseNumber || APP_INFO.LICENSE_NUMBER;
  const storeNtn = settings?.ntn || '8241902-7';

  // Customer / Patient clean naming
  const patientDisplayName = invoice.patientName || invoice.customerName || 'Walk-in Customer';

  // Doctor clean naming (omit "Self / Counter" clutter)
  const isDoctorPrescribed =
    invoice.doctorName &&
    invoice.doctorName !== 'Self / Counter' &&
    invoice.doctorName !== 'Self' &&
    invoice.doctorName !== 'N/A' &&
    invoice.doctorName.trim() !== '';

  const doctorDisplayName = isDoctorPrescribed ? invoice.doctorName : 'Over-the-Counter (OTC)';

  // Dispenser clean naming (no @username clutter)
  const cashierDisplayName = invoice.employeeName || invoice.cashierName || 'Staff Pharmacist';

  // Clean Directions note (suppress generic "Counter dispensing")
  const hasRealDirections =
    invoice.prescriptionDescription &&
    invoice.prescriptionDescription.toLowerCase() !== 'counter dispensing' &&
    invoice.prescriptionDescription.toLowerCase() !== 'n/a' &&
    invoice.prescriptionDescription.trim() !== '';

  const totalItemsCount = invoice.items?.length || 0;
  const totalUnitsCount = invoice.items?.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0) || 0;

  const handlePrint = () => {
    window.print();
  };

  const handleNewSaleClick = () => {
    if (onNewSale) {
      onNewSale();
    }
    onClose();
  };

  const handleViewSalesHistory = () => {
    onClose();
    navigate('/sales');
  };

  // Render modal in portal directly into document.body to isolate print from #root
  return createPortal(
    <div className="invoice-portal-root fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4 text-center">
        {/* Backdrop - hidden on print */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity no-print"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card */}
        <div className="invoice-modal-dialog relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all my-4 sm:my-8 w-full max-w-3xl border border-gray-200">
          {/* Action Bar (Top Controls - hidden on print) */}
          <div className="bg-[#0F3A2C] px-4 sm:px-6 py-3 text-white flex flex-wrap items-center justify-between gap-3 no-print border-b border-emerald-900">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black">
                ℞
              </span>
              <div>
                <span className="font-bold text-sm tracking-wide block leading-tight">
                  Invoice #{invoice.invoiceNumber}
                </span>
                <span className="text-[11px] text-emerald-300/80">
                  Ready for Real-World Printing
                </span>
              </div>
            </div>

            {/* Print Format Switcher & Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="bg-emerald-950/70 p-0.5 rounded-lg border border-emerald-700/50 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setPrintFormat('a4')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    printFormat === 'a4'
                      ? 'bg-[#1C9A58] text-white shadow-xs'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                  title="A4 / Standard Full Pharmacy Tax Invoice"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>A4 / Standard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    printFormat === 'thermal'
                      ? 'bg-[#1C9A58] text-white shadow-xs'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                  title="80mm Counter Thermal Roll Slip"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>80mm Thermal</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-[#1C9A58] hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Print Invoice"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* =========================================================================
              VIEW MODE 1: STANDARD A4 PHARMACY TAX INVOICE
              ========================================================================= */}
          {printFormat === 'a4' ? (
            <div className="printable-invoice-container format-a4 p-3.5 sm:p-6 md:p-8 bg-white text-gray-900 font-sans">
              {/* Header / Pharmacy Branding */}
              <div className="border-b-2 border-[#0F3A2C] pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#0F3A2C] text-emerald-400 font-serif font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-600">
                      ℞
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl sm:text-2xl font-black text-[#0F3A2C] tracking-tight uppercase leading-tight">
                        {storeName}
                      </h1>
                      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#1C9A58]">
                        {storeTagline}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-600 mt-1">
                        {storeAddress} &bull; Ph: <span className="font-semibold text-gray-800">{storePhone}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                        <span>
                          Govt. Drug Lic: <strong className="font-mono text-gray-700">{storeLicense}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          NTN: <strong className="font-mono text-gray-700">{storeNtn}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 sm:gap-0">
                    <div className="inline-block px-2.5 sm:px-3 py-1 rounded bg-[#0F3A2C] text-white text-[10px] sm:text-xs font-mono font-bold tracking-wider">
                      CASH MEMO / TAX INVOICE
                    </div>
                    <div className="text-right sm:mt-2">
                      <span className="hidden sm:block text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                        Invoice Reference
                      </span>
                      <span className="text-base sm:text-lg font-mono font-bold text-gray-900 tracking-tight">
                        #{invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center justify-end gap-1 text-xs text-gray-500 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDateTime(invoice.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile-only date row */}
                <div className="sm:hidden flex items-center justify-between text-[11px] text-gray-500 pt-1.5 mt-1 border-t border-dotted border-gray-200">
                  <span className="font-semibold text-gray-600">Dispensed On:</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{formatDateTime(invoice.date)}</span>
                  </div>
                </div>
              </div>

              {/* Patient, Doctor & Cashier Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 py-3 sm:py-3.5 border-b border-gray-200 text-xs">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 text-gray-600">
                    <span className="flex items-center gap-1 font-semibold text-gray-700 shrink-0">
                      <User className="w-3.5 h-3.5 text-[#1C9A58]" />
                      <span>Patient / Customer:</span>
                    </span>
                    <span className="font-bold text-gray-900">{patientDisplayName}</span>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-1.5 text-gray-600">
                    <span className="flex items-center gap-1 font-semibold text-gray-700 shrink-0">
                      <Stethoscope className="w-3.5 h-3.5 text-[#1C9A58]" />
                      <span>Prescribing Doctor:</span>
                    </span>
                    <span className="font-semibold text-gray-900">{doctorDisplayName}</span>
                  </div>
                  {invoice.prescriptionReferenceNumber && invoice.prescriptionReferenceNumber !== 'N/A' && (
                    <div className="text-gray-600 pl-4 sm:pl-5">
                      <span className="font-semibold text-gray-700">Rx Ref #:</span>{' '}
                      <span className="font-mono text-gray-900 font-bold">
                        {invoice.prescriptionReferenceNumber}
                      </span>
                    </div>
                  )}
                  {hasRealDirections && (
                    <div className="text-gray-600 pl-4 sm:pl-5">
                      <span className="font-semibold text-gray-700">Instructions:</span>{' '}
                      <span className="italic text-gray-800">{invoice.prescriptionDescription}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="text-gray-600">
                    <span className="font-semibold text-gray-700">Dispensed By:</span>{' '}
                    <span className="font-bold text-gray-900">{cashierDisplayName}</span>
                  </div>
                  <div className="text-gray-600 flex items-center justify-start sm:justify-end gap-1.5">
                    <span className="font-semibold text-gray-700">Payment Mode:</span>
                    <Badge variant="outline" size="sm" className="font-bold border-gray-300">
                      {invoice.paymentMethod === 'Card' ? (
                        <span className="flex items-center gap-1 text-blue-700">
                          <CreditCard className="w-3 h-3" /> Card / POS
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-800">
                          <Banknote className="w-3 h-3" /> Cash Tender
                        </span>
                      )}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Counter: <span className="font-semibold text-gray-700">Terminal 01</span>
                  </div>
                </div>
              </div>

              {/* Medicines Items Table */}
              <div className="py-3 sm:py-4 overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[500px] sm:min-w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#0F3A2C] bg-slate-50 text-gray-700 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5 px-2">#</th>
                      <th className="py-2.5 px-2">Medicine & Strength</th>
                      <th className="py-2.5 px-2">Batch #</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Price</th>
                      <th className="py-2.5 px-2 text-right">Disc</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, idx) => (
                        <tr key={item.id || item.medicineId || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-2 text-gray-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2 pr-4">
                            <p className="font-bold text-gray-900 text-xs">
                              {item.medicineName || item.name}
                            </p>
                            <p className="text-[11px] text-gray-500 font-medium">
                              {formatMedicineSubtitle(item)}
                            </p>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] text-gray-700">
                            {item.batchNumber || item.batchNo || 'N/A'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-gray-700">
                            {formatCurrency(item.unitPrice || item.price)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-emerald-700 font-semibold">
                            {item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900">
                            {formatCurrency(item.finalTotal || item.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-400">
                          No items listed on invoice
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Calculations, Totals & Barcode Section */}
              <div className="pt-3 border-t-2 border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
                {/* Left: Invoice Barcode & Summary Stats */}
                <div className="space-y-2 order-2 sm:order-1">
                  <InvoiceBarcode value={invoice.invoiceNumber} />
                  <div className="text-[11px] text-gray-500 flex items-center justify-center sm:justify-start gap-3">
                    <span>
                      Total Items: <strong className="text-gray-800">{totalItemsCount}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Total Units: <strong className="text-gray-800">{totalUnitsCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Right: Accounting Totals Box */}
                <div className="space-y-1.5 text-xs bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-gray-200 order-1 sm:order-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium text-gray-900">
                      {formatCurrency(invoice.subtotal)}
                    </span>
                  </div>

                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount Saved:</span>
                      <span className="font-mono">
                        -{formatCurrency(invoice.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-[#0F3A2C] pt-2 border-t border-gray-300">
                    <span>Net Amount Due:</span>
                    <span className="font-mono text-base font-black">
                      {formatCurrency(invoice.grandTotal)}
                    </span>
                  </div>

                  {invoice.amountReceived > 0 && (
                    <div className="pt-1.5 border-t border-gray-200 space-y-1 text-[11px] text-gray-600">
                      <div className="flex justify-between">
                        <span>Cash Tendered:</span>
                        <span className="font-mono text-gray-800 font-medium">
                          {formatCurrency(invoice.amountReceived)}
                        </span>
                      </div>
                      {invoice.changeReturned > 0 && (
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Change Returned:</span>
                          <span className="font-mono">
                            {formatCurrency(invoice.changeReturned)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures & Stamps */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 sm:gap-8 text-[11px] text-gray-600">
                <div>
                  <div className="border-b border-gray-400 w-28 sm:w-44 mb-1"></div>
                  <span className="font-medium text-[10px] sm:text-[11px]">Customer's Signature</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-b border-gray-400 w-28 sm:w-44 mb-1"></div>
                  <span className="font-bold text-gray-800 text-[10px] sm:text-[11px]">Authorized Pharmacist / Stamp</span>
                </div>
              </div>

              {/* Footer / Health Notice */}
              <div className="mt-6 pt-3 border-t border-dashed border-gray-300 text-center text-[10px] text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">
                  Thank you for visiting {storeName}! We wish you a speedy recovery.
                </p>
                <p className="max-w-xl mx-auto leading-relaxed">
                  Store medications in a cool, dry place below 25&deg;C away from sunlight. Keep out of reach of children.
                </p>
                <div className="pt-1 flex items-center justify-center gap-2 text-[9px] text-gray-400 uppercase tracking-widest font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Licensed Retail Pharmacy &bull; Form 9 Rule 19 Compliant &bull; Official Sale Record</span>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
                VIEW MODE 2: 80MM COUNTER THERMAL RECEIPT
                ========================================================================= */
            <div className="printable-invoice-container format-thermal p-4 bg-white text-gray-900 font-mono text-[11px] max-w-sm mx-auto">
              {/* Thermal Header */}
              <div className="text-center pb-2">
                <div className="w-8 h-8 mx-auto rounded-full bg-[#0F3A2C] text-emerald-400 font-black text-lg flex items-center justify-center mb-1">
                  ℞
                </div>
                <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                  {storeName}
                </h2>
                <p className="text-[10px] text-gray-600 font-semibold">{storeTagline}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{storeAddress}</p>
                <p className="text-[9px] text-gray-600">Ph: {storePhone}</p>
                <p className="text-[9px] text-gray-500">
                  Lic: {storeLicense} &bull; NTN: {storeNtn}
                </p>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Thermal Meta */}
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>INVOICE:</span>
                  <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{formatDateTime(invoice.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="font-bold">{patientDisplayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>CONSULTANT:</span>
                  <span>{doctorDisplayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>DISPENSER:</span>
                  <span>{cashierDisplayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>PAY METHOD:</span>
                  <span className="font-bold uppercase">{invoice.paymentMethod || 'Cash'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Thermal Items Table */}
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 uppercase text-[9px] font-bold">
                    <th className="py-1">ITEM</th>
                    <th className="py-1 text-center">QTY</th>
                    <th className="py-1 text-right">PRICE</th>
                    <th className="py-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-gray-300">
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 pr-1">
                        <span className="font-bold block leading-tight">{item.medicineName || item.name}</span>
                        <span className="text-[9px] text-gray-500 block">
                          {item.batchNumber ? `B:${item.batchNumber}` : ''}
                        </span>
                      </td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-right">{Number(item.unitPrice || item.price).toFixed(2)}</td>
                      <td className="py-1 text-right font-bold">
                        {Number(item.finalTotal || item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Thermal Summary */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span>SUBTOTAL:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>DISCOUNT:</span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-950 pt-1 border-t border-gray-400">
                  <span>TOTAL DUE:</span>
                  <span>{formatCurrency(invoice.grandTotal)}</span>
                </div>
                {invoice.amountReceived > 0 && (
                  <>
                    <div className="flex justify-between pt-1 text-[10px]">
                      <span>CASH RECEIVED:</span>
                      <span>{formatCurrency(invoice.amountReceived)}</span>
                    </div>
                    {invoice.changeReturned > 0 && (
                      <div className="flex justify-between font-bold text-[10px]">
                        <span>CHANGE DUE:</span>
                        <span>{formatCurrency(invoice.changeReturned)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              {/* Thermal Barcode & Policy */}
              <InvoiceBarcode value={invoice.invoiceNumber} />

              <div className="text-center text-[9px] text-gray-600 space-y-1 mt-2">
                <p className="font-bold">Thank you! Get well soon.</p>
                <p className="text-[8px] text-gray-400 font-mono mt-1">
                  *** SOFTWARE VERIFIED COUNTER SALE ***
                </p>
              </div>
            </div>
          )}

          {/* Modal Bottom Actions (hidden on print) */}
          <div className="bg-gray-50 px-3.5 sm:px-6 py-3 sm:py-3.5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 no-print">
            <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                iconLeft={History}
                onClick={handleViewSalesHistory}
                className="w-full sm:w-auto cursor-pointer justify-center"
              >
                View Sales History
              </Button>
            </div>

            <div className="w-full sm:w-auto flex items-center justify-end gap-1.5 sm:gap-2">
              <Button
                variant="primary"
                size="sm"
                iconLeft={Printer}
                onClick={handlePrint}
                className="flex-1 sm:flex-none justify-center bg-[#1C9A58] hover:bg-emerald-600 text-white cursor-pointer shadow-xs"
              >
                Print Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={PlusCircle}
                onClick={handleNewSaleClick}
                className="flex-1 sm:flex-none justify-center bg-white hover:bg-slate-50 cursor-pointer"
              >
                New Sale
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="cursor-pointer text-gray-500 hover:text-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceModal;
