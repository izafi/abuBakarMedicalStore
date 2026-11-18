import { NavLink } from 'react-router-dom';
import {
  Pill,
  Folders,
  Boxes,
  ShoppingCart,
  Receipt,
  LayoutDashboard,
  Users,
  FileBarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cross,
  LogOut,
} from 'lucide-react';
import { APP_INFO, USER_ROLES } from '../../utils/constants';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { analytics } = useInventory();
  const { currentUser, switchUser, users, logout } = useAuth();

  // Exact 9 items requested by user
  const navItems = [
    {
      to: '/',
      label: 'Medicine Counter',
      icon: Pill,
      end: true,
      badge: 'Main',
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      to: '/medicines',
      label: 'Medicines Management',
      icon: Folders,
    },
    {
      to: '/inventory',
      label: 'Inventory',
      icon: Boxes,
      badge: analytics.lowStockCount > 0 ? `${analytics.lowStockCount} low` : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      to: '/pos',
      label: 'Sales / POS',
      icon: ShoppingCart,
      badge: 'POS',
      badgeColor: 'bg-[#1C9A58] text-white',
    },
    {
      to: '/sales',
      label: 'Sales History',
      icon: Receipt,
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/employees',
      label: 'Employees & Permissions',
      icon: Users,
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: FileBarChart2,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const getRoleBadgeVariant = (role) => {
    if (role === USER_ROLES.ADMIN) return 'bg-emerald-400 text-[#0F3A2C]';
    if (role === USER_ROLES.PHARMACIST) return 'bg-blue-300 text-blue-950';
    return 'bg-amber-200 text-amber-950';
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F3A2C] text-white select-none relative transition-all duration-300">
      {/* Official Branding Header */}
      <div
        className={`border-b border-[#18523E] flex items-center transition-all duration-300 ${
          isCollapsed ? 'p-3 justify-center' : 'p-4 justify-between'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#1C9A58] shrink-0 flex items-center justify-center text-white shadow-md shadow-emerald-950/30">
            <Cross className="w-6 h-6 rotate-45" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-wide text-white leading-tight truncate">
                {APP_INFO.NAME}
              </h1>
              <p className="text-[10px] text-[#A3D9BE] font-bold tracking-wider uppercase mt-0.5 truncate">
                {APP_INFO.TAGLINE}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {!isCollapsed && (
          <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#79B79B]">
            Pharmacy Navigation
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) => `
                group relative flex items-center rounded-xl font-medium transition-all duration-150
                ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5 text-sm'}
                ${
                  isActive
                    ? 'bg-[#1C9A58] text-white shadow-sm font-semibold'
                    : 'text-[#D1E7DD] hover:bg-[#164E3C] hover:text-white'
                }
              `}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                    item.badgeColor || 'bg-white/20 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Hover Tooltip when sidebar is collapsed on desktop */}
              {isCollapsed && (
                <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-2.5 py-1.5 bg-[#0A291F] text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 items-center gap-2 border border-[#1E614A]">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1C9A58] text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Staff Account & Switcher Footer */}
      <div className="p-3 border-t border-[#18523E] bg-[#0A291F]">
        {!isCollapsed ? (
          <div>
            <div className="px-1 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8EBFA9] uppercase tracking-wider">
                Staff Session
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>

            {/* Demo Account Switcher Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 bg-[#134434] rounded-xl border border-[#1E614A]">
                <div className="w-8 h-8 rounded-full bg-[#1C9A58] text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser?.name || 'Staff User'}
                  </p>
                  <span
                    className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${getRoleBadgeVariant(
                      currentUser?.role
                    )}`}
                  >
                    {currentUser?.role || 'Guest'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  title="Lock Counter / Sign Out"
                  className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Switch Dropdown */}
              <div className="relative">
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => switchUser(e.target.value)}
                  className="w-full bg-[#0F3A2C] text-[11px] text-[#A3D9BE] border border-[#1E614A] rounded-lg py-1.5 px-2 focus:outline-none focus:border-[#1C9A58] appearance-none cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#0F3A2C] text-white">
                      Switch: {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed state avatar with logout button */
          <div className="flex flex-col items-center gap-2">
            <div
              title={`${currentUser?.name} (${currentUser?.role})`}
              className="w-9 h-9 rounded-full bg-[#1C9A58] text-white font-bold flex items-center justify-center text-xs cursor-pointer shadow-md"
            >
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <button
              type="button"
              onClick={logout}
              title="Lock Counter / Logout"
              className="p-2 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Desktop Collapse Toggle Button */}
        <div className="hidden lg:flex items-center justify-center pt-2 mt-2 border-t border-[#18523E]/50">
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
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Collapsible) */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 border-r border-[#18523E] transition-all duration-300 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
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

