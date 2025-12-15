import { useState, useEffect } from 'react';
import { waitForAuth } from '@/components/TenantInitializer';

/**
 * Hook to check if authentication is ready
 * Returns true when both access_token and tenant_id are available
 */
export function useAuthReady() {
  // Check synchronously first (in case auth is already ready)
  const checkAuthReady = (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    return !!(token && tenantId);
  };

  const [ready, setReady] = useState(checkAuthReady);
  
  useEffect(() => {
    // If already ready, no need to wait
    if (ready) return;
    
    // Wait for auth initialization
    waitForAuth().then(() => {
      // Double-check after waiting
      if (checkAuthReady()) {
        setReady(true);
      } else {
        // If still not ready after waitForAuth, something went wrong
        // But we'll set it to true anyway to prevent infinite waiting
        // The API calls will fail with 401, which is expected
        setReady(true);
      }
    });
  }, [ready]);
  
  return ready;
}

