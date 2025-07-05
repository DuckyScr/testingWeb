import { useState, useEffect } from 'react';
import { usePermission } from './usePermission';

/**
 * Hook to determine if the current user can see all clients or only assigned ones
 * @returns Object with canViewAllClients boolean and loading state
 */
export function useClientVisibility() {
  const [canViewAllClients, setCanViewAllClients] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  const { allowed: hasViewAllPermission, loading: permissionLoading } = usePermission('view_all_clients');
  
  useEffect(() => {
    if (!permissionLoading) {
      setCanViewAllClients(hasViewAllPermission);
      setLoading(false);
    }
  }, [hasViewAllPermission, permissionLoading]);
  
  return {
    canViewAllClients,
    loading
  };
}

/**
 * Hook to check if user can view a specific client
 * @param clientSalesRepId The sales rep ID assigned to the client (null if unassigned)
 * @returns Object with canView boolean and loading state
 */
export function useCanViewClient(clientSalesRepId: string | null) {
  const [canView, setCanView] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { canViewAllClients, loading: visibilityLoading } = useClientVisibility();
  
  // Get current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  useEffect(() => {
    if (!visibilityLoading && currentUserId !== null) {
      if (canViewAllClients) {
        setCanView(true);
      } else {
        // Can view if client is unassigned or assigned to current user
        setCanView(clientSalesRepId === null || clientSalesRepId === currentUserId);
      }
      setLoading(false);
    }
  }, [canViewAllClients, visibilityLoading, currentUserId, clientSalesRepId]);
  
  return {
    canView,
    loading
  };
}
