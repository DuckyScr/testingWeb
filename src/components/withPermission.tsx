import React, { forwardRef } from 'react';
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
// Update your withPermission HOC to handle refs properly
export function withPermission<P = {}, R = unknown>(
  Component: React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>,
  permission: string
) {
  const WithPermission = forwardRef<R, P>((props, ref) => {
    // Your permission check logic
    return <Component {...props} ref={ref} />;
  });
  
  WithPermission.displayName = `withPermission(${Component.displayName || 'Component'})`;
  return WithPermission;
}