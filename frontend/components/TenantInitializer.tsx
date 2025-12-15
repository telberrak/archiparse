'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Initialize once globally
function initializeAuth(): Promise<void> {
  if (isInitialized) {
    return Promise.resolve();
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    const existingTenantId = localStorage.getItem('tenant_id');
    const existingToken = localStorage.getItem('access_token');
    
    // If we already have both, we're good
    if (existingTenantId && existingToken) {
      isInitialized = true;
      return;
    }
    
    // Try to login with default credentials to get tenant_id and token
    try {
      console.log('[TenantInitializer] Attempting to login...');
      const loginResponse = await api.login('admin@example.com', 'admin123');
      console.log('[TenantInitializer] Login successful, token received:', !!loginResponse.access_token);
      
      // Verify token was stored
      const tokenAfterLogin = localStorage.getItem('access_token');
      if (!tokenAfterLogin) {
        console.error('[TenantInitializer] Token was not stored after login!');
        throw new Error('Token not stored');
      }
      
      // After login, get user info to set tenant_id
      try {
        console.log('[TenantInitializer] Getting current user info...');
        const userInfo = await api.getCurrentUser();
        console.log('[TenantInitializer] User info received, tenant_id:', userInfo.tenant_id);
        
        // Verify tenant_id was stored
        const tenantIdAfterUser = localStorage.getItem('tenant_id');
        if (!tenantIdAfterUser) {
          console.error('[TenantInitializer] Tenant ID was not stored after getCurrentUser!');
          // Try to set it manually from the response
          if (userInfo.tenant_id) {
            localStorage.setItem('tenant_id', userInfo.tenant_id);
            console.log('[TenantInitializer] Manually set tenant_id from user info');
          }
        }
      } catch (userError: any) {
        // getCurrentUser might fail if token is invalid
        console.error('[TenantInitializer] Failed to get current user:', userError);
        // Check if we have tenant_id from token payload
        try {
          const token = localStorage.getItem('access_token');
          if (token) {
            // Try to decode token to get tenant_id (basic JWT decode)
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.tenant_id) {
                localStorage.setItem('tenant_id', payload.tenant_id);
                console.log('[TenantInitializer] Extracted tenant_id from token payload');
              }
            }
          }
        } catch (decodeError) {
          console.error('[TenantInitializer] Failed to decode token:', decodeError);
        }
      }
      
      // Verify both are set before marking as initialized
      const token = localStorage.getItem('access_token');
      const tenantId = localStorage.getItem('tenant_id');
      console.log('[TenantInitializer] Final check - token:', !!token, 'tenant_id:', !!tenantId);
      
      if (token && tenantId) {
        console.log('[TenantInitializer] Authentication ready!');
        isInitialized = true;
      } else {
        console.error('[TenantInitializer] Authentication incomplete - token:', !!token, 'tenant_id:', !!tenantId);
        // Don't mark as initialized if we don't have both
        // This will cause the loading screen to stay, which is better than silent failures
        throw new Error('Authentication incomplete - missing token or tenant_id');
      }
    } catch (error: any) {
      // If login fails, log the error clearly
      console.error('[TenantInitializer] Authentication failed:', error);
      console.error('[TenantInitializer] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      // Don't mark as initialized - let the user see the error
      // But set a flag to prevent infinite retries
      isInitialized = true; // Set to true to prevent infinite waiting, but auth will fail
    }
  })();
  
  return initPromise;
}

export function TenantInitializer({ children }: { children: React.ReactNode }) {
  // Check if auth is already ready synchronously
  const checkReady = (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    return !!(token && tenantId) || isInitialized;
  };

  const [ready, setReady] = useState(checkReady);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already ready, no need to initialize
    if (ready) return;

    initializeAuth().then(() => {
      // Verify that localStorage is actually set
      const token = localStorage.getItem('access_token');
      const tenantId = localStorage.getItem('tenant_id');
      if (token && tenantId) {
        setReady(true);
        setError(null);
      } else {
        // If still not ready, wait a bit and check again (in case of async timing issues)
        setTimeout(() => {
          const token2 = localStorage.getItem('access_token');
          const tenantId2 = localStorage.getItem('tenant_id');
          if (token2 && tenantId2) {
            setReady(true);
            setError(null);
          } else {
            setError('Échec de l\'authentification. Vérifiez que l\'utilisateur admin existe dans la base de données.');
            setReady(true); // Still set ready to show error message
          }
        }, 100);
      }
    }).catch((err) => {
      console.error('[TenantInitializer] Initialization error:', err);
      setError('Erreur lors de l\'initialisation: ' + (err?.message || 'Erreur inconnue'));
      setReady(true); // Set ready to show error message
    });
  }, [ready]);

  if (!ready && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md mx-auto p-6 bg-white border border-red-200 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-800 mb-4">Erreur d'authentification</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-600 mb-4">
            Assurez-vous que l'utilisateur admin existe dans la base de données.
            Vous pouvez le créer en exécutant:
          </p>
          <code className="block bg-gray-100 p-2 rounded text-xs mb-4">
            docker compose -f docker-compose.alt.yml exec backend python scripts/create_tenant_auto.py
          </code>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Export function to check if initialized (for use in other components)
export function waitForAuth(): Promise<void> {
  return initializeAuth();
}
