import { useAuth } from '../../hooks/useAuth';
import { AccessDenied } from '../common/AccessDenied';

export const ProtectedRoute = ({ module, moduleTitle, children }) => {
  const { hasPermission } = useAuth();

  const isAuthorized = hasPermission(module, 'view');

  if (!isAuthorized) {
    return <AccessDenied moduleName={moduleTitle || module} />;
  }

  return children;
};

export default ProtectedRoute;
