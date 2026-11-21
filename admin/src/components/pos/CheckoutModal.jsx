import { useState, useEffect } from 'react';
import {
  User,
  Stethoscope,
  FileText,
  Hash,
  Lock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';

export const CheckoutModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { cart, orderSummary, paymentMethod, setPaymentMethod, processSale, isProcessingSale, customerInfo } =
    useSales();
  const toast = useToast();

  // Current Step: 1 = Patient Information, 2 = Employee Verification, 3 = Processing / Done
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Patient Information State (All Optional)
  const [patientInfo, setPatientInfo] = useState({
    patientName: '',
    doctorName: '',
    prescriptionDescription: '',
    prescriptionReferenceNumber: '',
  });

  // Pre-fill customer name if set in the cart
  useEffect(() => {
    if (isOpen) {
      setPatientInfo({
        patientName: customerInfo?.name === 'Walk-in Customer' ? '' : customerInfo?.name || '',
        doctorName: '',
        prescriptionDescription: '',
        prescriptionReferenceNumber: '',
      });
      setCurrentStep(1);
      setEmployeePassword('');
      setVerificationError('');
    }
  }, [isOpen, customerInfo?.name]);

  // Step 2: Employee Verification State
  const [employeePassword, setEmployeePassword] = useState('');
  const [verificationError, setVerificationError] = useState('');

  if (!isOpen) return null;

  // Step 1: Proceed to Step 2 (Validation is optional)
  const handleProceedToVerification = (e) => {
    e.preventDefault();
    setVerificationError('');
    setCurrentStep(2);
  };

  // Step 2: Verify Employee Password & Complete Sale (Centralized processSale)
  const handleConfirmSale = async (e) => {
    e.preventDefault();
    setVerificationError('');

    if (!employeePassword.trim()) {
      setVerificationError('Employee password is required to authorize this sale.');
      return;
    }

    try {
      const completedInvoice = await processSale({
        patientInfo: {
          patientName: patientInfo.patientName.trim() || customerInfo?.name || 'Walk-in Customer',
          doctorName: patientInfo.doctorName.trim() || 'Self / Counter',
          prescriptionDescription: patientInfo.prescriptionDescription.trim() || 'Counter dispensing',
          prescriptionReferenceNumber: patientInfo.prescriptionReferenceNumber.trim() || 'N/A',
        },
        employeePassword: employeePassword.trim(),
      });

      setCurrentStep(3);
      toast.showSuccess(`Invoice #${completedInvoice?.invoiceNumber || ''} processed successfully!`);

      if (onSuccess) {
        onSuccess(completedInvoice);
      }
      onClose();
    } catch (err) {
      setVerificationError(err.message || 'Verification failed. Please retry.');
      toast.showError(err.message || 'Sale could not be authorized.');
    }
  };

  const handleClose = () => {
    if (isProcessingSale) return;
    setPatientInfo({
      patientName: '',
      doctorName: '',
      prescriptionDescription: '',
      prescriptionReferenceNumber: '',
    });
    setEmployeePassword('');
    setVerificationError('');
    setCurrentStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-3 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card - Compact & Clean */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-6 sm:w-full sm:max-w-md border border-gray-100">
          {/* Header */}
          <div className="bg-[#0F3A2C] px-4 py-3 sm:px-5 sm:py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">
                  Checkout Authorization
                </h3>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  Patient Info &rarr; Security Verification &rarr; Invoice
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessingSale}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="bg-[#F4F7F5] px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between max-w-xs mx-auto text-xs font-semibold">
              <div
                className={`flex items-center gap-1.5 ${
                  currentStep >= 1 ? 'text-[#0F3A2C]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= 1
                      ? 'bg-[#1C9A58] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  1
                </span>
                <span className="text-[11px]">Patient Info</span>
              </div>

              <div
                className={`h-0.5 w-8 ${
                  currentStep >= 2 ? 'bg-[#1C9A58]' : 'bg-gray-200'
                }`}
              />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep >= 2 ? 'text-[#0F3A2C]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep >= 2
                      ? 'bg-[#1C9A58] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  2
                </span>
                <span className="text-[11px]">Verification</span>
              </div>

              <div
                className={`h-0.5 w-8 ${
                  currentStep === 3 ? 'bg-[#1C9A58]' : 'bg-gray-200'
                }`}
              />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep === 3 ? 'text-[#0F3A2C]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === 3
                      ? 'bg-[#1C9A58] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  3
                </span>
                <span className="text-[11px]">Invoice</span>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5">
            {/* Quick Summary Pill */}
            <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500">Cart Total:</span>{' '}
                <span className="font-bold text-gray-900">
                  {cart.length} item{cart.length > 1 ? 's' : ''} ({orderSummary.totalItems} units)
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Net Payable:</span>{' '}
                <span className="font-black text-[#1C9A58] text-sm font-mono">
                  {formatCurrency(orderSummary.grandTotal)}
                </span>
              </div>
            </div>

            {/* STEP 1: PATIENT INFORMATION (OPTIONAL) */}
            {currentStep === 1 && (
              <form onSubmit={handleProceedToVerification} className="space-y-3">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1C9A58]" />
                    Step 1: Patient & Doctor Details (Optional)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Optional: leave blank for regular walk-in / OTC sales.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Input
                    label="Patient Full Name (Optional)"
                    placeholder="e.g. Walk-in Customer or Patient Name"
                    iconLeft={User}
                    value={patientInfo.patientName}
                    inputClassName="h-8.5 py-1.5 text-xs"
                    onChange={(e) =>
                      setPatientInfo({ ...patientInfo, patientName: e.target.value })
                    }
                  />

                  <Input
                    label="Prescribing Doctor Name (Optional)"
                    placeholder="e.g. Self / Counter or Doctor Name"
                    iconLeft={Stethoscope}
                    value={patientInfo.doctorName}
                    inputClassName="h-8.5 py-1.5 text-xs"
                    onChange={(e) =>
                      setPatientInfo({ ...patientInfo, doctorName: e.target.value })
                    }
                  />

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Prescription Directions (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute top-2 left-2.5 text-gray-400 pointer-events-none">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <textarea
                        rows={2}
                        value={patientInfo.prescriptionDescription}
                        onChange={(e) =>
                          setPatientInfo({
                            ...patientInfo,
                            prescriptionDescription: e.target.value,
                          })
                        }
                        placeholder="e.g. 1 tab morning & evening (Optional directions)"
                        className="w-full rounded-lg pl-8 pr-2.5 py-1.5 text-xs border border-gray-200 bg-white focus:outline-none focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58]/20 transition-all text-gray-800 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <Input
                    label="Prescription Ref # (Optional)"
                    placeholder="e.g. RX-2026-904"
                    iconLeft={Hash}
                    value={patientInfo.prescriptionReferenceNumber}
                    inputClassName="h-8.5 py-1.5 text-xs"
                    onChange={(e) =>
                      setPatientInfo({
                        ...patientInfo,
                        prescriptionReferenceNumber: e.target.value,
                      })
                    }
                  />

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash')}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          paymentMethod === 'Cash'
                            ? 'bg-[#0F3A2C] text-white border-[#0F3A2C] shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Cash Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Card')}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          paymentMethod === 'Card'
                            ? 'bg-[#0F3A2C] text-white border-[#0F3A2C] shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Card / POS Terminal
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    iconRight={ArrowRight}
                  >
                    Proceed to Verification
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: EMPLOYEE VERIFICATION */}
            {currentStep === 2 && (
              <form onSubmit={handleConfirmSale} className="space-y-3">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#1C9A58]" />
                    Step 2: Employee Security Verification
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Enter your staff password to confirm and dispense.
                  </p>
                </div>

                {/* Logged in Employee Info Card */}
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Dispensing Employee:</span>
                    <span className="font-bold text-gray-900">{currentUser?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Employee Username:</span>
                    <span className="font-mono text-gray-700 font-semibold">
                      @{currentUser?.username}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Authorized Role:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F3A2C] text-white">
                      {currentUser?.role}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-semibold text-gray-800">
                      {patientInfo.patientName || customerInfo?.name || 'Walk-in Customer'}
                    </span>
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <Input
                    label="Enter Employee Password"
                    required
                    type="password"
                    placeholder="Enter password to authorize..."
                    iconLeft={Lock}
                    value={employeePassword}
                    inputClassName="h-8.5 py-1.5 text-xs"
                    onChange={(e) => {
                      setEmployeePassword(e.target.value);
                      setVerificationError('');
                    }}
                    error={verificationError}
                    autoFocus
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Demo credentials hint: <span className="font-mono font-semibold">ayesha123</span> / <span className="font-mono font-semibold">bilal123</span> / <span className="font-mono font-semibold">demo123</span>
                  </p>
                </div>

                {/* Error Banner */}
                {verificationError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Authorization Rejected</p>
                      <p className="mt-0.5 text-red-600">{verificationError}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    iconLeft={ArrowLeft}
                    onClick={() => setCurrentStep(1)}
                    disabled={isProcessingSale}
                  >
                    Back
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={handleClose}
                      disabled={isProcessingSale}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      loading={isProcessingSale}
                      iconLeft={CheckCircle2}
                    >
                      Confirm & Issue Bill
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
