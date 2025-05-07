import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to check if the current user has a specific permission
 * @param permission The permission to check
 * @returns An object with loading state and whether the permission is allowed
 */
export function usePermission(permission: string) {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission }),
      });

      if (!response.ok) {
        throw new Error('Failed to check permission');
      }

      const data = await response.json();
      setAllowed(data.allowed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }, [permission]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return { allowed, loading, error, refresh: checkPermission };
}