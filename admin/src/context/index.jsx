import { ToastProvider } from './ToastContext';
import { AuthProvider } from './AuthContext';
import { SettingsProvider } from './SettingsContext';
import { InventoryProvider } from './InventoryContext';
import { SalesProvider } from './SalesContext';

export const AppProviders = ({ children }) => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <InventoryProvider>
            <SalesProvider>
              {children}
            </SalesProvider>
          </InventoryProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
};
