import React from 'react';
import { useClientVisibility } from '@/hooks/useClientVisibility';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Eye, EyeOff } from 'lucide-react';

/**
 * Component that shows a visual indicator about client visibility permissions
 */
export function ClientVisibilityIndicator() {
  const { canViewAllClients, loading } = useClientVisibility();
  
  if (loading) {
    return null;
  }
  
  if (canViewAllClients) {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Eye className="h-4 w-4" />
        <AlertDescription>
          You can view all clients in the system.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <EyeOff className="h-4 w-4" />
      <AlertDescription>
        You can only view clients assigned to you or unassigned clients.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Simple text indicator for inline use
 */
export function ClientVisibilityText() {
  const { canViewAllClients, loading } = useClientVisibility();
  
  if (loading) {
    return <span className="text-gray-500">Checking permissions...</span>;
  }
  
  return (
    <span className={canViewAllClients ? "text-green-600" : "text-orange-600"}>
      {canViewAllClients ? "All clients" : "Assigned clients only"}
    </span>
  );
}
