import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { Sidebar as NamedSidebar } from './Sidebar';
import Header from './Header';
import { ToastContainer } from '../common/Toast';
import { LoginModal } from './LoginModal';

const SidebarComponent = Sidebar || NamedSidebar;

export const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex flex-row font-sans text-gray-900 antialiased selection:bg-[#1C9A58] selection:text-white">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Counter Lock Screen when logged out */}
      <LoginModal />

      {/* Collapsible / Drawer Sidebar */}
      <SidebarComponent
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
