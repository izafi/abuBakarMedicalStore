import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Bell,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  LogOut,
  UserCheck,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { USER_ROLES } from '../../utils/constants';

export const Header = ({
  onOpenMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, resetToDemoData } = useInventory();
  const { currentUser, users, switchUser, logout } = useAuth();
  const toast = useToast();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalAlerts =
    analytics.lowStockCount + analytics.expiringSoonCount + analytics.expiredCount;

  const handleResetData = () => {
    resetToDemoData();
    setShowResetConfirm(false);
    toast.showSuccess('Sample data restored successfully to localStorage');
  };

  const getRoleBadgeVariant = (role) => {
    if (role === USER_ROLES.ADMIN) return 'primary';
    if (role === USER_ROLES.PHARMACIST) return 'info';
    return 'default';
  };

  // Get human friendly page title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Medicine Counter';
      case '/medicines':
        return 'Medicines Management';
      case '/inventory':
        return 'Inventory & Stock Control';
      case '/pos':
        return 'Sales & POS Billing';
      case '/sales':
        return 'Sales & Invoice History';
      case '/dashboard':
        return 'Store Dashboard';
      case '/employees':
        return 'Employees & Permissions';
      case '/reports':
        return 'Financial Reports';
      case '/settings':
        return 'System Settings';
      default:
        return 'Abu Bakar Medical Store';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger, desktop collapse toggle & current view title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar width"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-[#1C9A58]" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* Current View Breadcrumb / Title */}
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight leading-snug truncate">
                {getPageTitle()}
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1C9A58] animate-pulse" />
                <span className="text-[11px] text-gray-500 font-medium">
                  Pharmacy System • Offline Ready
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick actions, notifications & Employee profile switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick POS action */}
            {location.pathname !== '/pos' && (
              <Button
                variant="primary"
                size="sm"
                iconLeft={ShoppingCart}
                onClick={() => navigate('/pos')}
                className="hidden sm:inline-flex text-xs font-bold"
              >
                POS Bill
              </Button>
            )}

            {/* Database Reset Button */}
            <Button
              variant="outline"
              size="sm"
              iconLeft={RotateCcw}
              onClick={() => setShowResetConfirm(true)}
              className="hidden xl:inline-flex text-xs text-gray-500 hover:text-gray-900"
              title="Reset medicines & sales to demo state"
            >
              Reset Data
            </Button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserDropdown(false);
                }}
                className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Stock alerts notifications"
              >
                <Bell className="w-5 h-5" />
                {totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notifications Popover */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Stock & Expiry Alerts
                        </h4>
                      </div>
                      <Badge variant={totalAlerts > 0 ? 'warning' : 'success'}>
                        {totalAlerts} Items
                      </Badge>
                    </div>

                    <div className="py-2 space-y-2 max-h-72 overflow-y-auto text-xs">
                      {totalAlerts === 0 ? (
                        <div className="py-6 text-center text-gray-400">
                          <CheckCircle2 className="w-8 h-8 text-[#1C9A58] mx-auto mb-2 opacity-80" />
                          All medicines have adequate stock and valid expiry dates!
                        </div>
                      ) : (
                        <>
                          {analytics.lowStockCount > 0 && (
                            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 text-amber-900">
                              <div className="font-bold flex items-center justify-between">
                                <span>Low Stock Medicines</span>
                                <Badge variant="warning" size="sm">
                                  {analytics.lowStockCount} items
                                </Badge>
                              </div>
                              <p className="text-[11px] text-amber-700 mt-1">
                                Several pharmaceuticals are below their reorder threshold.
                              </p>
                            </div>
                          )}

                          {analytics.expiringSoonCount > 0 && (
                            <div className="p-2.5 rounded-lg bg-orange-50/70 border border-orange-100 text-orange-900">
                              <div className="font-bold flex items-center justify-between">
                                <span>Expiring Within 90 Days</span>
                                <Badge variant="warning" size="sm">
                                  {analytics.expiringSoonCount} items
                                </Badge>
                              </div>
                              <p className="text-[11px] text-orange-700 mt-1">
                                Inspect batch dates on shelves to rotate oldest stocks.
                              </p>
                            </div>
                          )}

                          {analytics.expiredCount > 0 && (
                            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-rose-900">
                              <div className="font-bold flex items-center justify-between">
                                <span>Expired Batches</span>
                                <Badge variant="danger" size="sm">
                                  {analytics.expiredCount} items
                                </Badge>
                              </div>
                              <p className="text-[11px] text-rose-700 mt-1">
                                Discard expired stock immediately from dispensing racks.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        iconRight={ExternalLink}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/inventory');
                        }}
                      >
                        Inspect Inventory Center
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Employee Profile & Demo Account Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200/80 cursor-pointer"
                aria-label="Employee profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-[#E8F6EF] text-[#1C9A58] border border-[#BDE8D2] flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="hidden md:block text-left pr-1">
                  <p className="text-xs font-bold text-gray-900 leading-tight">
                    {currentUser?.name || 'Staff User'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant={getRoleBadgeVariant(currentUser?.role)} size="sm">
                      {currentUser?.role || 'Pharmacist'}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* User Profile & Demo Switcher Dropdown */}
              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    {/* Active User Header */}
                    <div className="pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1C9A58] text-white flex items-center justify-center font-bold text-sm">
                          {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {currentUser?.name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate">
                            @{currentUser?.username}
                          </p>
                          <div className="mt-1">
                            <Badge variant={getRoleBadgeVariant(currentUser?.role)} size="sm">
                              {currentUser?.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Demo Switcher Section */}
                    <div className="py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Switch Demo Account
                        </span>
                        <Shield className="w-3.5 h-3.5 text-[#1C9A58]" />
                      </div>
                      <div className="space-y-1">
                        {users.map((u) => {
                          const isSelected = currentUser?.id === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                switchUser(u.id);
                                setShowUserDropdown(false);
                                toast.showSuccess(`Switched active user to ${u.name}`);
                              }}
                              className={`
                                w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer
                                ${
                                  isSelected
                                    ? 'bg-emerald-50 text-[#1C9A58] font-bold border border-emerald-100'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1C9A58]' : 'text-gray-400'}`} />
                                <span className="truncate">{u.name}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-semibold shrink-0">
                                {u.role}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Logout Option */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                          toast.showInfo('Counter session locked. Please sign in to resume.');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Lock Station / Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetData}
        title="Reset Demo Data"
        message="This will restore all demo medicines and sales invoices back to their clean initial state. Proceed?"
        confirmText="Confirm Reset"
        variant="warning"
      />
    </>
  );
};

export default Header;
