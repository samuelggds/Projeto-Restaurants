import { useEffect, useState } from 'react';
import {
  BRAND_IDENTITY_STORAGE_KEY,
  BRAND_IDENTITY_UPDATED_EVENT,
  getBrandIdentity,
  type BrandIdentity,
} from '../config/brandIdentity';

export default function useBrandIdentity() {
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(() => getBrandIdentity());

  useEffect(() => {
    function syncBrandIdentity() {
      setBrandIdentity(getBrandIdentity());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== BRAND_IDENTITY_STORAGE_KEY) {
        return;
      }

      syncBrandIdentity();
    }

    window.addEventListener(BRAND_IDENTITY_UPDATED_EVENT, syncBrandIdentity);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(BRAND_IDENTITY_UPDATED_EVENT, syncBrandIdentity);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return {
    brandName: String(brandIdentity.name || 'Peça já food'),
    brandLogoUrl: String(brandIdentity.logoUrl || ''),
  };
}
