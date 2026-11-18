import { useState } from 'react';
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
import { validatePatientInfo } from '../../utils/validators';
import { formatCurrency } from '../../utils/formatters';

export const CheckoutModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { cart, orderSummary, paymentMethod, setPaymentMethod, processSale, isProcessingSale } =
    useSales();
  const toast = useToast();

  // Current Step: 1 = Patient Information, 2 = Employee Verification, 3 = Processing / Done
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Patient Information State
  const [patientInfo, setPatientInfo] = useState({
    patientName: '',
    doctorName: '',
    prescriptionDescription: '',
    prescriptionReferenceNumber: '',
  });
  const [patientErrors, setPatientErrors] = useState({});

  // Step 2: Employee Verification State
  const [employeePassword, setEmployeePassword] = useState('');
  const [verificationError, setVerificationError] = useState('');

  if (!isOpen) return null;

  // Step 1: Validate Patient Info and proceed to Step 2
  const handleProceedToVerification = (e) => {
    e.preventDefault();
    const { isValid, errors } = validatePatientInfo(patientInfo);

    if (!isValid) {
      setPatientErrors(errors);
      toast.showError('Please correct the highlighted patient details.');
      return;
    }

    setPatientErrors({});
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
      // Calls centralized processSale in SalesContext
      const completedInvoice = processSale({
        patientInfo,
        employeePassword: employeePassword.trim(),
      });

      setCurrentStep(3);
      toast.showSuccess(`Invoice #${completedInvoice.invoiceNumber} processed successfully!`);
      
      // Notify parent to open Invoice view
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
    setPatientErrors({});
    setVerificationError('');
    setCurrentStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl border border-gray-100">
          {/* Header */}
          <div className="bg-[#0F3A2C] px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">
                  Authorized Prescription Checkout
                </h3>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Three-Step Verification: Patient Info &rarr; Cashier Authorization &rarr; Invoice
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessingSale}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="bg-[#F4F7F5] px-6 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between max-w-sm mx-auto text-xs font-semibold">
              <div
                className={`flex items-center gap-1.5 ${
                  currentStep >= 1 ? 'text-[#0F3A2C]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    currentStep >= 1
                      ? 'bg-[#1C9A58] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  1
                </span>
                <span>Patient Info</span>
              </div>

              <div
                className={`h-0.5 w-12 ${
                  currentStep >= 2 ? 'bg-[#1C9A58]' : 'bg-gray-200'
                }`}
              />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep >= 2 ? 'text-[#0F3A2C]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    currentStep >= 2
                      ? 'bg-[#1C9A58] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  2
                </span>
                <span>Verification</span>
              </div>

              <div
                className={`h-0.5 w-12 ${
                  currentStep === 3 ? 'bg-[#1C9A58]' : 'bg-gray-200'
                }`}
              />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep === 3 ? 'text-[#0F3A2C]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    currentStep === 3
                      ? 'bg-[#1C9A58] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  3
                </span>
                <span>Invoice</span>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {/* Quick Summary Pill */}
            <div className="mb-5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500">Cart Total:</span>{' '}
                <span className="font-bold text-gray-900">
                  {cart.length} medicine{cart.length > 1 ? 's' : ''} ({orderSummary.totalItems} units)
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Net Payable:</span>{' '}
                <span className="font-black text-[#1C9A58] text-sm">
                  {formatCurrency(orderSummary.grandTotal)}
                </span>
              </div>
            </div>

            {/* STEP 1: PATIENT INFORMATION */}
            {currentStep === 1 && (
              <form onSubmit={handleProceedToVerification} className="space-y-4">
                <div className="text-left">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#1C9A58]" />
                    Step 1: Patient & Doctor Details
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Prescription information is legally recorded with every dispensed medicine sale.
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    label="Patient Full Name"
                    required
                    placeholder="e.g. Muhammad Usman"
                    iconLeft={User}
                    value={patientInfo.patientName}
                    onChange={(e) =>
                      setPatientInfo({ ...patientInfo, patientName: e.target.value })
                    }
                    error={patientErrors.patientName}
                  />

                  <Input
                    label="Prescribing Doctor Name"
                    required
                    placeholder="e.g. Dr. Tariq Mahmood (Cardiologist)"
                    iconLeft={Stethoscope}
                    value={patientInfo.doctorName}
                    onChange={(e) =>
                      setPatientInfo({ ...patientInfo, doctorName: e.target.value })
                    }
                    error={patientErrors.doctorName}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Prescription Directions / Description <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute top-2.5 left-3 text-gray-400 pointer-events-none">
                        <FileText className="w-4 h-4" />
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={patientInfo.prescriptionDescription}
                        onChange={(e) =>
                          setPatientInfo({
                            ...patientInfo,
                            prescriptionDescription: e.target.value,
                          })
                        }
                        placeholder="e.g. Tab 500mg BID x 5 days after meal, Syp 2 tsp TDS."
                        className={`w-full rounded-xl pl-9 pr-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2 transition-all ${
                          patientErrors.prescriptionDescription
                            ? 'border-red-400 focus:ring-red-200'
                            : 'border-gray-200 focus:border-[#1C9A58] focus:ring-[#1C9A58]/20'
                        }`}
                      />
                    </div>
                    {patientErrors.prescriptionDescription && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">
                        {patientErrors.prescriptionDescription}
                      </p>
                    )}
                  </div>

                  <Input
                    label="Prescription Ref # (Optional)"
                    placeholder="e.g. RX-2026-904"
                    iconLeft={Hash}
                    value={patientInfo.prescriptionReferenceNumber}
                    onChange={(e) =>
                      setPatientInfo({
                        ...patientInfo,
                        prescriptionReferenceNumber: e.target.value,
                      })
                    }
                  />

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          paymentMethod === 'Cash'
                            ? 'bg-[#0F3A2C] text-white border-[#0F3A2C] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        Cash Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Card')}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          paymentMethod === 'Card'
                            ? 'bg-[#0F3A2C] text-white border-[#0F3A2C] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Card / POS Terminal
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <Button variant="ghost" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    iconRight={ArrowRight}
                  >
                    Proceed to Employee Verification
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: EMPLOYEE VERIFICATION */}
            {currentStep === 2 && (
              <form onSubmit={handleConfirmSale} className="space-y-4">
                <div className="text-left">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[#1C9A58]" />
                    Step 2: Employee Security Verification
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Authorized staff must verify their credentials before medicine stock is deducted.
                  </p>
                </div>

                {/* Logged in Employee Info Card */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
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
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-gray-500">Patient:</span>
                    <span className="font-semibold text-gray-800">
                      {patientInfo.patientName} (Dr. {patientInfo.doctorName})
                    </span>
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <Input
                    label="Enter Demo Employee Password"
                    required
                    type="password"
                    placeholder="Enter demo password to confirm sale..."
                    iconLeft={Lock}
                    value={employeePassword}
                    onChange={(e) => {
                      setEmployeePassword(e.target.value);
                      setVerificationError('');
                    }}
                    error={verificationError}
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Demo credentials hint: e.g. <span className="font-mono font-semibold">ayesha123</span> / <span className="font-mono font-semibold">bilal123</span> / <span className="font-mono font-semibold">sana123</span>
                  </p>
                </div>

                {/* Error Banner */}
                {verificationError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Authorization Rejected</p>
                      <p className="mt-0.5 text-red-600">{verificationError}</p>
                      <p className="mt-1 text-[11px] text-red-500 italic">
                        Stock has NOT been deducted and invoice has NOT been generated.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    type="button"
                    iconLeft={ArrowLeft}
                    onClick={() => setCurrentStep(1)}
                    disabled={isProcessingSale}
                  >
                    Back to Patient Info
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={handleClose}
                      disabled={isProcessingSale}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      loading={isProcessingSale}
                      iconLeft={CheckCircle2}
                    >
                      Confirm Sale & Issue Invoice
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
