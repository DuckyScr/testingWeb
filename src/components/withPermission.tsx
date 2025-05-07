import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface WithPermissionProps {
  permission: string;
  fallback?: React.ReactNode;
}

/**
 * Higher-order component that conditionally renders children based on permission
 */
export function WithPermission({
  permission,
  children,
  fallback = null
}: WithPermissionProps & { children: React.ReactNode }) {
  const { allowed, loading } = usePermission(permission);

  if (loading) {
    // You could return a loading indicator here
    return null;
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component factory that wraps a component with permission check
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string,
  FallbackComponent: React.ComponentType<P> | null = null
) {
  return function WithPermissionWrapper(props: P) {
    const { allowed, loading } = usePermission(permission);

    if (loading) {
      // You could return a loading indicator here
      return null;
    }

    if (!allowed) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}