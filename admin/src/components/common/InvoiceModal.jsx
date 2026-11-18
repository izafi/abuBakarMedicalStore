import {
  Printer,
  X,
  PlusCircle,
  Clock,
  User,
  Stethoscope,
  FileText,
  CreditCard,
  Banknote,
  CheckCircle,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { Badge } from './Badge';
import { APP_INFO } from '../../utils/constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const InvoiceModal = ({ isOpen, onClose, invoice, onNewSale }) => {
  const navigate = useNavigate();

  if (!isOpen || !invoice) return null;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop - hidden during print */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity no-print"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-100">
          {/* Action Bar (Top Controls - hidden on print) */}
          <div className="bg-[#0F3A2C] px-6 py-4 text-white flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm tracking-wide">
                Invoice #{invoice.invoiceNumber} Generated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-[#1C9A58] hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                title="Print Receipt (A4 / Thermal)"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Invoice
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div className="printable-invoice-container p-6 sm:p-8 bg-white text-gray-900 font-sans">
            {/* Header / Pharmacy Branding */}
            <div className="border-b-2 border-[#0F3A2C] pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#0F3A2C] tracking-tight">
                    {APP_INFO.NAME}
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-[#1C9A58] font-bold mt-0.5">
                    {APP_INFO.TAGLINE}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {APP_INFO.ADDRESS} &bull; Ph: {APP_INFO.PHONE}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Govt. Drug License: <span className="font-mono">{APP_INFO.LICENSE_NUMBER}</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-[#0F3A2C] text-white text-xs font-mono font-bold tracking-wider">
                    TAX INVOICE
                  </div>
                  <h3 className="text-lg font-mono font-bold text-gray-900 mt-2">
                    #{invoice.invoiceNumber}
                  </h3>
                  <div className="flex items-center justify-end gap-1 text-xs text-gray-500 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatDateTime(invoice.date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient, Doctor & Cashier Details Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-semibold text-gray-700">Patient:</span>
                  <span className="font-bold text-gray-900">
                    {invoice.patientName || invoice.customerName || 'Walk-in Customer'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-semibold text-gray-700">Prescribing Doctor:</span>
                  <span className="font-bold text-gray-900">
                    {invoice.doctorName || 'Self / Over-The-Counter'}
                  </span>
                </div>
                {invoice.prescriptionReferenceNumber && invoice.prescriptionReferenceNumber !== 'N/A' && (
                  <div className="text-gray-500">
                    <span className="font-semibold text-gray-700">Rx Ref #:</span>{' '}
                    <span className="font-mono text-gray-900">
                      {invoice.prescriptionReferenceNumber}
                    </span>
                  </div>
                )}
                {invoice.prescriptionDescription && (
                  <div className="text-gray-500 mt-1">
                    <span className="font-semibold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-400" /> Directions:
                    </span>
                    <p className="text-[11px] text-gray-600 italic bg-gray-50 p-1.5 rounded mt-0.5 border border-gray-100">
                      {invoice.prescriptionDescription}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-right">
                <div className="text-gray-500">
                  <span className="font-semibold text-gray-700">Dispensed By:</span>{' '}
                  <span className="font-bold text-gray-900">
                    {invoice.employeeName || invoice.cashierName || 'Staff Pharmacist'}
                  </span>
                </div>
                {invoice.employeeUsername && (
                  <div className="text-gray-500">
                    <span className="font-semibold text-gray-700">Employee ID / User:</span>{' '}
                    <span className="font-mono text-gray-700 font-medium">
                      @{invoice.employeeUsername}
                    </span>
                  </div>
                )}
                <div className="text-gray-500 flex items-center justify-end gap-1.5 pt-1">
                  <span className="font-semibold text-gray-700">Payment Mode:</span>
                  <Badge variant="outline" size="sm" className="font-bold">
                    {invoice.paymentMethod === 'Card' ? (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-blue-600" /> Card
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3 h-3 text-emerald-600" /> Cash
                      </span>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Medicines Items Table */}
            <div className="py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2">#</th>
                    <th className="py-2">Medicine / Formula</th>
                    <th className="py-2">Batch #</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Disc</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <tr key={item.id || item.medicineId || idx}>
                        <td className="py-2.5 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-gray-900">
                            {item.medicineName || item.name}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {item.formula || item.genericName || ''} {item.strength ? `(${item.strength})` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-gray-700">
                          {item.batchNumber || item.batchNo || 'N/A'}
                        </td>
                        <td className="py-2.5 text-center font-bold text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 text-right font-mono text-gray-600">
                          {formatCurrency(item.unitPrice || item.price)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-600">
                          {item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(item.finalTotal || item.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-400">
                        No line items recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals Summary */}
            <div className="pt-3 border-t-2 border-gray-200 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium text-gray-800">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount:</span>
                  <span className="font-mono font-medium">
                    -{formatCurrency(invoice.discountAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-[#0F3A2C] pt-2 border-t border-gray-200">
                  <span>Grand Total:</span>
                  <span className="font-mono">{formatCurrency(invoice.grandTotal)}</span>
                </div>

                {invoice.amountReceived > 0 && (
                  <div className="pt-1.5 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                    <div className="flex justify-between">
                      <span>Cash Tendered:</span>
                      <span className="font-mono text-gray-700">
                        {formatCurrency(invoice.amountReceived)}
                      </span>
                    </div>
                    {invoice.changeReturned > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
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

            {/* Footer / Legal Notice */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-[10px] text-gray-400 space-y-1">
              <p className="font-medium text-gray-600">
                Thank you for choosing Abu Bakar Medical Store!
              </p>
              <p>
                Medicines once sold cannot be returned without original cash receipt within 3 days.
                Store medications in a cool, dry place away from sunlight. Keep out of reach of children.
              </p>
              <p className="font-mono text-[9px] text-gray-400 pt-1">
                Computer Generated Invoice &bull; Software Verified &bull; Official Record
              </p>
            </div>
          </div>

          {/* Modal Bottom Actions (hidden on print) */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconLeft={History}
                onClick={handleViewSalesHistory}
              >
                View Sales History
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                iconLeft={Printer}
                onClick={handlePrint}
              >
                Print Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={PlusCircle}
                onClick={handleNewSaleClick}
                className="bg-white"
              >
                New Sale
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
