import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Pill,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { APP_INFO, USER_ROLES } from '../../utils/constants';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { alert } from '../../utils/sweetAlert';

export const Sidebar = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { analytics } = useInventory();
  const { currentUser, logout, hasPermission } = useAuth();
  const { settings } = useSettings();

  const handleLogout = async () => {
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
  };

  // Navigation Items with Granular Permission Support
  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard Overview',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/',
      label: 'Medicine Counter',
      shortLabel: 'Counter',
      icon: Store,
      module: 'sales',
      end: true,
    },
    {
      to: '/medicines',
      label: 'Medicines Catalog',
      shortLabel: 'Catalog',
      icon: Pill,
      module: 'medicines',
    },
    {
      to: '/inventory',
      label: 'Stock Inventory',
      shortLabel: 'Inventory',
      icon: Boxes,
      module: 'inventory',
      badge: analytics?.lowStockCount > 0 ? `${analytics.lowStockCount} low` : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      to: '/pos',
      label: 'Billing & POS',
      shortLabel: 'POS',
      icon: ShoppingCart,
      module: 'sales',
    },
    {
      to: '/sales',
      label: 'Sales & Invoices',
      shortLabel: 'Sales',
      icon: Receipt,
      module: 'sales',
    },
    {
      to: '/employees',
      label: 'Staff & Roles',
      shortLabel: 'Staff',
      icon: Users,
      module: 'employees',
    },
    {
      to: '/reports',
      label: 'Financial Reports',
      shortLabel: 'Reports',
      icon: FileBarChart2,
      module: 'reports',
    },
    {
      to: '/settings',
      label: 'System Settings',
      shortLabel: 'Settings',
      icon: Settings,
      adminOnly: true,
    },
  ];

  // Dynamically filter navigation items based on administrator-granted permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!currentUser) return false;
    if (currentUser.role === USER_ROLES.ADMIN) return true;
    if (item.adminOnly) return false;
    if (item.module) return hasPermission(item.module, 'view');
    return true;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F3A2C] text-white select-none relative transition-all duration-300">
      {/* Official Branding Header (Fixed Top) */}
      <div
        className={`border-b border-[#18523E] shrink-0 flex items-center transition-all duration-300 ${
          isCollapsed ? 'p-3 justify-center' : 'px-3 py-3.5 justify-between'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Improved Pharmacy Medical Cross Logo Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-[#1C9A58] to-[#0A3022] shrink-0 flex items-center justify-center text-white shadow-md shadow-emerald-950/60 border border-emerald-300/30">
            <svg
              className="w-5 h-5 text-white drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9.75 3a1.5 1.5 0 0 1 1.5-1.5h1.5A1.5 1.5 0 0 1 14.25 3v5.25h5.25a1.5 1.5 0 0 1 1.5 1.5v1.5a1.5 1.5 0 0 1-1.5 1.5H14.25v5.25a1.5 1.5 0 0 1-1.5 1.5h-1.5a1.5 1.5 0 0 1-1.5-1.5V12.75H4.5A1.5 1.5 0 0 1 3 11.25v-1.5A1.5 1.5 0 0 1 4.5 8.25h5.25V3z" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h1
                className="font-extrabold text-[12.5px] sm:text-[13px] tracking-tight text-white whitespace-nowrap leading-none truncate"
                title={settings?.storeName || APP_INFO.NAME}
              >
                {settings?.storeName || APP_INFO.NAME}
              </h1>
              <p
                className="text-[9.5px] text-[#A3D9BE] font-bold tracking-wider uppercase truncate mt-1"
                title={settings?.tagline || APP_INFO.TAGLINE}
              >
                {settings?.tagline || APP_INFO.TAGLINE}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unified Scrollable Container: Nav List + Staff Session */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 no-scrollbar">
        {/* Navigation List */}
        <nav className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#79B79B]">
              Pharmacy Navigation
            </div>
          )}

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `
                  group relative flex items-center rounded-xl font-medium transition-all duration-150 cursor-pointer
                  ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2 text-xs sm:text-sm'}
                  ${
                    isActive
                      ? 'bg-[#1C9A58] text-white font-bold shadow-md shadow-emerald-950/30'
                      : 'text-[#D1E7DD] hover:bg-[#164E3C] hover:text-white'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                          isActive
                            ? 'text-white stroke-[2.2]'
                            : 'text-[#8EBFA9] group-hover:text-white'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-emerald-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip on Collapsed State */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3.5 px-2.5 py-1.5 bg-[#0A291F] border border-[#18523E] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Staff Session Box (Bottom Section) */}
        <div className="pt-2 border-t border-[#18523E]">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-[#0A291F] border border-[#18523E] space-y-2">
              <div className="flex items-center justify-between text-[10px] text-[#8EBFA9] font-bold uppercase tracking-wider">
                <span>Staff Session</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </span>
              </div>

              {/* Active User Card */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1C9A58] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm border border-emerald-400/30">
                    {currentUser?.name ? currentUser.name.charAt(0) : 'H'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {currentUser?.name || 'Huzaifa Zafi'}
                    </p>
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      {currentUser?.role || USER_ROLES.ADMIN}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated Sign Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-500/25 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* Collapsed state avatar with logout button */
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${currentUser?.name || 'Huzaifa Zafi'} (${currentUser?.role || USER_ROLES.ADMIN})`}
                className="w-9 h-9 rounded-full bg-[#1C9A58] text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-md"
              >
                {currentUser?.name ? currentUser.name.charAt(0) : 'H'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out / Lock Station"
                className="p-2 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Collapse Toggle Button at very bottom */}
      <div className="p-2 border-t border-[#18523E] shrink-0 bg-[#0A291F]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full py-1.5 flex items-center justify-center gap-2 text-xs text-[#8EBFA9] hover:text-white hover:bg-[#164E3C] rounded-lg transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-semibold">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Collapsible) */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 border-r border-[#18523E] transition-all duration-300 z-30 ${
          isCollapsed ? 'w-20' : 'w-[264px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
