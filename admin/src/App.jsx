import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from './context';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MedicineCounter } from './pages/MedicineCounter';
import { MedicinesManagement } from './pages/MedicinesManagement';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { SalesHistory } from './pages/SalesHistory';
import { Dashboard } from './pages/Dashboard';
import { EmployeesPermissions } from './pages/EmployeesPermissions';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import { PERMISSION_MODULES } from './utils/constants';
import { useAuth } from './hooks/useAuth';

// Role-based landing page component:
// Employees land directly on Billing & POS (/pos)
// Administrators land on Medicine Counter (/)
function RoleBasedLanding() {
  const { currentUser, isAdmin } = useAuth();

  // If user is logged in as an Employee, make Billing & POS (/pos) the landing page
  if (currentUser && !isAdmin) {
    return <Navigate to="/pos" replace />;
  }

  // Admin users land on Medicine Counter
  return <MedicineCounter />;
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Role-based default landing page:
                - Employees land on Billing & POS (/pos)
                - Administrators land on Medicine Counter (/) */}
            <Route index element={<RoleBasedLanding />} />
            <Route path="counter" element={<MedicineCounter />} />

            {/* Medicines Management */}
            <Route
              path="medicines"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.MEDICINES}
                  moduleTitle="Medicines Management"
                >
                  <MedicinesManagement />
                </ProtectedRoute>
              }
            />

            {/* Inventory & Stock Control */}
            <Route
              path="inventory"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.INVENTORY}
                  moduleTitle="Inventory & Stock Control"
                >
                  <Inventory />
                </ProtectedRoute>
              }
            />

            {/* Sales & POS Billing */}
            <Route
              path="pos"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.SALES}
                  moduleTitle="Point of Sale (POS)"
                >
                  <POS />
                </ProtectedRoute>
              }
            />

            {/* Sales History */}
            <Route
              path="sales"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.SALES}
                  moduleTitle="Sales History & Invoices"
                >
                  <SalesHistory />
                </ProtectedRoute>
              }
            />

            {/* Dashboard */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* Employees & Permissions */}
            <Route
              path="employees"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.EMPLOYEES}
                  moduleTitle="Employees & Permissions"
                >
                  <EmployeesPermissions />
                </ProtectedRoute>
              }
            />

            {/* Reports */}
            <Route
              path="reports"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.REPORTS}
                  moduleTitle="Financial Reports"
                >
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="settings"
              element={
                <ProtectedRoute
                  module={PERMISSION_MODULES.EMPLOYEES}
                  moduleTitle="System Settings"
                >
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
