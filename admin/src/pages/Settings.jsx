import { useState } from 'react';
import {
  Save,
  RotateCcw,
  Store,
  Sliders,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  Coins,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const Settings = () => {
  const { settings, updateSettings, resetDemoData, restoreSeedData } = useSettings();
  const { currentUser, changePassword, users } = useAuth();
  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    storeName: settings.storeName || 'Abu Bakar Medical Store',
    tagline: settings.tagline || 'PHARMACY INVENTORY SYSTEM',
    branchName: settings.branchName || 'Main Branch',
    currency: settings.currency || 'Rs',
    currencySymbol: settings.currencySymbol || 'Rs.',
    phone: settings.phone || '+92 300 1234567',
    email: settings.email || 'info@abubakarmedical.pk',
    address: settings.address || 'Main Bazar, Medical Market, Pakistan',
    licenseNumber: settings.licenseNumber || 'PB-LHR-2026-99042',
    lowStockThreshold: settings.lowStockThreshold || 15,
    nearExpiryDays: settings.nearExpiryDays || 60,
  });

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Dialog State
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings(formData);
    toast.showSuccess('Settings updated and saved to localStorage');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!newPassword.trim()) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      changePassword(currentUser.employeeId, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.showSuccess(`Demo password for @${currentUser.username} updated!`);
    } catch (err) {
      setPasswordError(err.message);
      toast.showError(err.message);
    }
  };

  const handleResetConfirm = () => {
    resetDemoData();
    setShowConfirmReset(false);
    toast.showSuccess('Demo data reset to initial seeds');
  };

  const handleRestoreConfirm = () => {
    restoreSeedData();
    setShowConfirmRestore(false);
    toast.showSuccess('Seed data restored successfully');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-7 h-7 text-[#1C9A58]" />
          System Settings & Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure pharmacy store identity, inventory thresholds, demo accounts, and localStorage persistence.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Pharmacy Store Profile Card */}
        <Card>
          <CardHeader
            title="Pharmacy Store Profile"
            subtitle="Details displayed on official invoices, counter receipts, and navigation headers"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Input
              label="Store Name"
              required
              iconLeft={Store}
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
            />

            <Input
              label="Branch Name"
              required
              iconLeft={Building}
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
            />

            <Input
              label="System Tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            />

            <Input
              label="Contact Phone"
              iconLeft={Phone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Official Email"
              type="email"
              iconLeft={Mail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Drug Sales License #"
              iconLeft={FileText}
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            />

            <div className="sm:col-span-2">
              <Input
                label="Physical Address"
                iconLeft={MapPin}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <Input
                label="Display Currency Symbol"
                iconLeft={Coins}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Inventory Warning & Thresholds Card */}
        <Card>
          <CardHeader
            title="Inventory Thresholds & Expiry Rules"
            subtitle="Configure trigger points for low stock badges, reorder alerts, and near-expiry warnings"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Low Stock Threshold (Units)
              </label>
              <p className="text-xs text-gray-500">
                When batch quantity drops at or below this value, it triggers a warning badge and low stock report item.
              </p>
              <Input
                type="number"
                min="1"
                max="500"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lowStockThreshold: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
              />
              <p className="text-[11px] text-[#1C9A58] font-medium">
                Current rule: &le; {formData.lowStockThreshold} units = Low Stock
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Near Expiry Warning Window (Days)
              </label>
              <p className="text-xs text-gray-500">
                Medicines expiring within this number of days will show Near Expiry status on counter and reports.
              </p>
              <Input
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
              />
              <p className="text-[11px] text-amber-600 font-medium">
                Current rule: &le; {formData.nearExpiryDays} days to expiry = Near Expiry Warning
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="primary" iconLeft={Save}>
              Save Store & Threshold Settings
            </Button>
          </div>
        </Card>
      </form>

      {/* Demo Account & Password Management Card */}
      <Card>
        <CardHeader
          title="Demo Account & Credentials"
          subtitle="Manage active session password and view authorized demo staff"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
          {/* Change Demo Password for Active User */}
          <div className="lg:col-span-6 space-y-3">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Active User:</span>
                <span className="font-bold text-gray-900">{currentUser?.name}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-semibold text-gray-700">Role & Access:</span>
                <Badge variant="primary" size="sm">
                  {currentUser?.role}
                </Badge>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                label="New Demo Password"
                type="password"
                placeholder="Enter new demo password..."
                iconLeft={KeyRound}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                error={passwordError}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new demo password..."
                iconLeft={KeyRound}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
              />

              <Button type="submit" variant="outline" size="sm" iconLeft={Save}>
                Update Active Account Password
              </Button>
            </form>
          </div>

          {/* Quick Demo Credentials Reference Table */}
          <div className="lg:col-span-6 space-y-2">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1C9A58]" />
              Authorized Demo Accounts Reference
            </h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Username</th>
                    <th className="py-2 px-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr
                      key={u.employeeId}
                      className={u.employeeId === currentUser?.employeeId ? 'bg-emerald-50/40 font-semibold' : ''}
                    >
                      <td className="py-2 px-3">{u.name}</td>
                      <td className="py-2 px-3 font-mono text-gray-600">@{u.username}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-bold">
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 italic">
              Use these accounts from the sidebar or header switcher to test permission levels.
            </p>
          </div>
        </div>
      </Card>

      {/* Data Persistence, Reset & Restore Card */}
      <Card>
        <CardHeader
          title="Data Management & Demo Persistence"
          subtitle="Reset state back to initial fresh demonstration records"
        />

        <div className="mt-4 p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Demo Reset & Restore Seed Data
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Resetting will restore all medicines, multi-batch records, past sales history, and employee permissions stored in browser localStorage.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={RotateCcw}
              onClick={() => setShowConfirmReset(true)}
              className="bg-white text-red-600 border-red-200 hover:bg-red-50"
            >
              Reset Demo Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconLeft={CheckCircle2}
              onClick={() => setShowConfirmRestore(true)}
              className="bg-white text-[#0F3A2C]"
            >
              Restore Seed Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showConfirmReset}
        title="Reset All Demo Data?"
        message="This will overwrite current medicines, batches, stock history, sales history, and permissions in localStorage with the clean initial demo dataset."
        confirmText="Yes, Reset Everything"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setShowConfirmReset(false)}
      />

      <ConfirmDialog
        isOpen={showConfirmRestore}
        title="Restore Factory Seed Data?"
        message="All local modifications will be returned to initial catalog seeds. Are you sure you wish to continue?"
        confirmText="Restore Seeds"
        cancelText="Keep Current"
        variant="warning"
        onConfirm={handleRestoreConfirm}
        onCancel={() => setShowConfirmRestore(false)}
      />
    </div>
  );
};

export default Settings;
