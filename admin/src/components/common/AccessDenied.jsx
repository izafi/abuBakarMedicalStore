import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../../hooks/useAuth';

export const AccessDenied = ({ moduleName = 'this section' }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-sm animate-in zoom-in-95 duration-200">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-black text-gray-900 tracking-tight">
        Access Restricted
      </h2>

      <p className="text-sm font-semibold text-gray-600 mt-1">
        Permission Denied for {moduleName}
      </p>

      <p className="text-xs text-gray-500 max-w-md mt-2 leading-relaxed">
        Your current session as <strong>{currentUser?.name || 'Employee'}</strong> ({currentUser?.role}) does not have authorization to view or manage {moduleName}.
        Please contact an Administrator to update your role permissions.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          iconLeft={ArrowLeft}
          onClick={() => navigate('/')}
        >
          Return to Counter
        </Button>
      </div>
    </div>
  );
};

export default AccessDenied;
