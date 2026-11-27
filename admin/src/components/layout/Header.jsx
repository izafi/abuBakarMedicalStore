import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Bell,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  LogOut,
  UserCheck,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Settings,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { USER_ROLES } from '../../utils/constants';
import { alert } from '../../utils/sweetAlert';

export const Header = ({
  onOpenMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics } = useInventory();
  const { currentUser, users, switchUser, logout } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const totalAlerts =
    (analytics?.lowStockCount || 0) +
    (analytics?.expiringSoonCount || 0) +
    (analytics?.expiredCount || 0);

  const getRoleBadgeVariant = (role) => {
    if (role === USER_ROLES.ADMIN) return 'primary';
    if (role === USER_ROLES.PHARMACIST) return 'info';
    return 'default';
  };

  // Get human friendly page title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/counter':
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
        return settings?.storeName || 'Abu Bakar Medical Store';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-gray-100 px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile hamburger, desktop collapse toggle & current view title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
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
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight leading-snug truncate">
                {getPageTitle()}
              </h2>
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-[#1C9A58] shrink-0" />
                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                  {settings?.tagline || 'Pharmacy Inventory System'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick actions, notifications & Employee profile switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick POS action: icon-only on mobile, full button on sm+ */}
            {location.pathname !== '/pos' && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/pos')}
                  className="sm:hidden p-2 rounded-xl bg-[#1C9A58] hover:bg-[#158046] text-white shadow-xs transition-colors cursor-pointer"
                  title="Open Billing & POS Counter"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
                <div className="hidden sm:block">
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={ShoppingCart}
                    onClick={() => navigate('/pos')}
                    className="text-xs font-bold"
                  >
                    POS Bill
                  </Button>
                </div>
              </>
            )}

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
                <div className="hidden md:flex items-center gap-2 text-left pr-1">
                  <span className="text-xs font-bold text-gray-900 whitespace-nowrap">
                    {currentUser?.name || 'Staff User'}
                  </span>
                  <Badge variant={getRoleBadgeVariant(currentUser?.role)} size="sm">
                    {currentUser?.role || 'Pharmacist'}
                  </Badge>
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

                    {/* Quick Navigation Shortcuts */}
                    <div className="py-2.5 border-b border-gray-100 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/employees');
                          setShowUserDropdown(false);
                        }}
                        className="w-full p-2 rounded-lg text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1C9A58] flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Staff & Roles Management</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/settings');
                          setShowUserDropdown(false);
                        }}
                        className="w-full p-2 rounded-lg text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#1C9A58] flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Pharmacy System Settings</span>
                      </button>
                    </div>

                    {/* Logout Option with SweetAlert */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setShowUserDropdown(false);
                          const confirmed = await alert.confirm({
                            title: 'Sign Out Session?',
                            text: 'Are you sure you want to lock this station and sign out?',
                            confirmButtonText: 'Yes, Sign Out',
                            cancelButtonText: 'Cancel',
                            isDanger: true,
                          });
                          if (confirmed) {
                            await logout();
                            alert.toast('Station locked. Please sign in to resume.', 'info');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out / Lock Station</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
