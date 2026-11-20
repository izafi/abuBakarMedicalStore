import { useState, useEffect } from 'react';
import {
  Save,
  Store,
  Sliders,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  Coins,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Database,
  Server,
  Lock,
  RefreshCw,
  AlertTriangle,
  Download,
  Trash2,
  Check,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { alert } from '../utils/sweetAlert';
import { authService } from '../services/authService';

export const Settings = () => {
  const { settings, updateSettings, resetDemoData, isLoading: isSettingsLoading } = useSettings();
  const { currentUser } = useAuth();

  // Active Tab: 'profile' | 'inventory' | 'security' | 'system'
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    storeName: settings?.storeName || 'Abu Bakar Medical Store',
    tagline: settings?.tagline || 'PHARMACY INVENTORY SYSTEM',
    branchName: settings?.branchName || 'Main Branch',
    currency: settings?.currency || 'PKR',
    currencySymbol: settings?.currencySymbol || 'Rs.',
    phone: settings?.phone || '+92 300 1234567',
    email: settings?.email || 'info@abubakarmedical.pk',
    address: settings?.address || 'Main Bazar, Medical Market, Pakistan',
    licenseNumber: settings?.licenseNumber || 'PB-LHR-2026-99042',
    lowStockThreshold: settings?.lowStockThreshold ?? 10,
    nearExpiryDays: settings?.nearExpiryDays ?? 90,
  });

  // Sync form data when settings load
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData((prev) => ({
        ...prev,
        storeName: settings.storeName || prev.storeName,
        tagline: settings.tagline || prev.tagline,
        branchName: settings.branchName || prev.branchName,
        currency: settings.currency || prev.currency,
        currencySymbol: settings.currencySymbol || prev.currencySymbol,
        phone: settings.phone || settings.contactNumber || prev.phone,
        email: settings.email || prev.email,
        address: settings.address || prev.address,
        licenseNumber: settings.licenseNumber || prev.licenseNumber,
        lowStockThreshold: settings.lowStockThreshold ?? prev.lowStockThreshold,
        nearExpiryDays: settings.nearExpiryDays ?? prev.nearExpiryDays,
      }));
    }
  }, [settings]);

  // Inventory Policy Toggles
  const [policies, setPolicies] = useState({
    blockExpiredSales: true,
    warnNearExpiryPOS: true,
    requireBatchSelection: true,
  });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Save Settings to Backend API
  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setIsSaving(true);
      await updateSettings(formData);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      alert.success('Settings Saved', 'System configurations have been successfully synchronized.');
    } catch (err) {
      alert.error('Failed to Save', err.message || 'Could not update system settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.newPassword) {
      alert.warning('Validation Error', 'Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert.warning('Password Too Short', 'New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert.error('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert.success('Password Updated', 'Administrator credentials updated successfully.');
    } catch (err) {
      alert.error('Password Update Failed', err.message || 'Could not change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Export Settings Config as JSON
  const handleExportConfig = () => {
    const configData = {
      system: 'Abu Bakar Medical Store - Pharmacy Inventory System',
      exportedAt: new Date().toISOString(),
      settings: formData,
      policies,
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert.success('Config Exported', 'System configuration file downloaded.');
  };

  // Purge / Reset Database confirmation
  const handleFactoryReset = async () => {
    const confirmed = await alert.confirm({
      title: 'Reset System Database?',
      text: 'This will re-initialize medicines, batches, and sales records back to clean state. Are you sure?',
      confirmText: 'Yes, Reset System',
      cancelText: 'Cancel',
      isDanger: true,
    });

    if (confirmed) {
      try {
        await resetDemoData();
      } catch (err) {
        alert.error('Reset Failed', err.message);
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'inventory', label: 'Inventory & Alerts', icon: Sliders },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'system', label: 'System & Database', icon: Database },
  ];

  return (
    <div className="space-y-4 font-sans select-none max-w-6xl mx-auto pb-10">
      {/* =========================================================================
          PAGE HEADER (Consistent Font Family, Font Size & Compact Button)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4 text-[#1C9A58]" />
            </div>
            <span>System Settings</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-black font-semibold">
            <span>Configure store profile, inventory thresholds, and admin security</span>
            <span className="text-slate-300">&bull;</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#1C9A58]">
              <span className="w-2 h-2 rounded-full bg-[#1C9A58] animate-pulse"></span>
              Live API Connected
            </span>
          </div>
        </div>

        {/* Header Action Button (Matching Site Size) */}
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving || isSettingsLoading}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
            justSaved
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-[#1C9A58] hover:bg-[#0F3A2C]'
          }`}
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : justSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Saved Successfully</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* =========================================================================
          SLIM & CLEAN NAVIGATION TABS (Matching Site's Filter Pills & Font Size)
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1C9A58] text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-black border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: STORE PROFILE
          ========================================================================= */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Section 1: Store Identity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Store Profile & Branding</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Details displayed on invoices, billing receipts, and application headers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Store Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="Abu Bakar Medical Store"
                  />
                  <Store className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Branch Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="Main Branch"
                  />
                  <Building className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Drug Sales License #
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs font-mono bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="PB-LHR-2026-99042"
                  />
                  <FileText className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-black mb-1">
                  System Tagline / Header Slogan
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="PHARMACY INVENTORY SYSTEM"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Official Location */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Contact & Location Information</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Official contact details printed on receipts and customer invoices
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="+92 300 1234567"
                  />
                  <Phone className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Official Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="info@abubakarmedical.pk"
                  />
                  <Mail className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black mb-1">
                  Physical Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="Main Bazar, Medical Market, Pakistan"
                  />
                  <MapPin className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Currency & Localization */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Coins className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Currency & Display Formats</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Default currency code and prefix symbol used across all tables and invoices
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="PKR"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Display Currency Prefix
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="Rs."
                  />
                  <Coins className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Action Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-[#1C9A58] hover:bg-[#0F3A2C] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Store Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 2: INVENTORY & ALERT RULES
          ========================================================================= */}
      {activeTab === 'inventory' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Threshold Configurations */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Inventory Warning Thresholds</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Set trigger values for low-stock badges and near-expiry shelf warnings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Low Stock Setting */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-black">
                    Low Stock Threshold (Units)
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Warning Trigger
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  When batch quantity drops at or below this value, an amber warning badge is shown in inventory tables.
                </p>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all"
                />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1C9A58]" />
                  <span>Rule: Stock &le; {formData.lowStockThreshold} units flags Low Stock</span>
                </div>
              </div>

              {/* Near Expiry Window Setting */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-black">
                    Near-Expiry Horizon (Days)
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    FIFO Priority
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Batches expiring within this number of days will be highlighted for early dispensing under FEFO rules.
                </p>
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={formData.nearExpiryDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nearExpiryDays: Math.max(7, parseInt(e.target.value, 10) || 30),
                    })
                  }
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all"
                />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1C9A58]" />
                  <span>Rule: Expiry within {formData.nearExpiryDays} days flags Near Expiry</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Safety Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Safety & Dispensing Policies</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Standard operational safety controls enforced across POS billing counters
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div>
                  <div className="text-xs font-bold text-black">Block Expired Medicine Sales</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Strictly prevents staff from adding expired medicine batches to invoices
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.blockExpiredSales}
                  onChange={(e) => setPolicies({ ...policies, blockExpiredSales: e.target.checked })}
                  className="w-4 h-4 text-[#1C9A58] rounded border-slate-300 focus:ring-[#1C9A58] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div>
                  <div className="text-xs font-bold text-black">Near-Expiry Warning Prompt</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Displays operational warning when dispensing a batch expiring within the warning horizon
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.warnNearExpiryPOS}
                  onChange={(e) => setPolicies({ ...policies, warnNearExpiryPOS: e.target.checked })}
                  className="w-4 h-4 text-[#1C9A58] rounded border-slate-300 focus:ring-[#1C9A58] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div>
                  <div className="text-xs font-bold text-black">Mandatory Batch Selection</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Requires selecting a specific verified batch for accurate FIFO deduction
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.requireBatchSelection}
                  onChange={(e) => setPolicies({ ...policies, requireBatchSelection: e.target.checked })}
                  className="w-4 h-4 text-[#1C9A58] rounded border-slate-300 focus:ring-[#1C9A58] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Action Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-[#1C9A58] hover:bg-[#0F3A2C] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Inventory Rules</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 3: SECURITY & ACCESS
          ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Active Administrator Account Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Administrator Profile</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Primary system administrator holding full system privileges
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1C9A58] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {currentUser?.name?.charAt(0) || 'H'}
                </div>
                <div>
                  <div className="text-sm font-bold text-black">
                    {currentUser?.name || 'Huzaifa Zafi'}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    {currentUser?.email || 'huzaifazafi156@gmail.com'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                      Administrator
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ID: {currentUser?.employeeId || 'EMP-001'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Administrator Password */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <KeyRound className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Update Administrator Password</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Secure your administrator account credentials with a strong password
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password (if known)"
                    className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <Lock className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  New Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Confirm New Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    placeholder="Re-enter new password to verify"
                    className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-[#1C9A58] hover:bg-[#0F3A2C] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SYSTEM & DATABASE
          ========================================================================= */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          {/* Health Status Cards */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Server className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">Infrastructure & Backend Health</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Live connection parameters to REST API services and cloud storage cluster
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                  API SERVICE
                </div>
                <div className="text-xs sm:text-sm font-bold text-black mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1C9A58]"></span>
                  Active / Connected
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  localhost:5000/api/v1
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                  DATABASE ENGINE
                </div>
                <div className="text-xs sm:text-sm font-bold text-black mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1C9A58]"></span>
                  MongoDB Atlas
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Cloud Cluster</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                  STORAGE POLICY
                </div>
                <div className="text-xs sm:text-sm font-bold text-black mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1C9A58]" />
                  Pure REST API
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Zero Local Storage</div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                  SYSTEM VERSION
                </div>
                <div className="text-xs sm:text-sm font-bold text-black mt-1">v2.4.0 Production</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Pharmacy Suite</div>
              </div>
            </div>
          </div>

          {/* Maintenance & Export Utilities */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Database className="w-3.5 h-3.5 text-[#1C9A58]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black">System Utilities & Backup</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Export system preferences or reload application cache
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportConfig}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-black text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>Export Configuration (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-black text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-black" />
                <span>Reload Application Cache</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Factory Clean */}
          <div className="bg-white rounded-xl border border-rose-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-rose-100">
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-rose-950">System Factory Clean</h2>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  High-security maintenance actions for database initialization
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50/50">
              <div>
                <div className="text-xs font-bold text-rose-950">
                  Re-initialize Clean State
                </div>
                <div className="text-[11px] text-rose-800 font-medium mt-0.5 leading-relaxed">
                  Permanently resets catalog records and reloads fresh baseline seeds. Requires explicit confirmation.
                </div>
              </div>

              <button
                type="button"
                onClick={handleFactoryReset}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
