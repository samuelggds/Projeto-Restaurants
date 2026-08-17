import { useContext } from 'react';
import { KitchenContext } from './KitchenContext';

export function useKitchenWorkspace() {
  const value = useContext(KitchenContext);
  if (!value) throw new Error('useKitchenWorkspace deve estar dentro de KitchenProvider');
  return value;
}
