import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1C9A58] flex items-center justify-center mb-4">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">404</h1>
      <p className="text-base font-semibold text-gray-700 mt-1">Page Not Found</p>
      <p className="text-xs text-gray-500 max-w-sm mt-1">
        The pharmacy management page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Button
          variant="primary"
          iconLeft={ArrowLeft}
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
