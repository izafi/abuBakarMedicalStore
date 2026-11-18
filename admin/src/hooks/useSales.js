import { useContext } from 'react';
import { SalesContext } from '../context/contexts';

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};

export default useSales;
