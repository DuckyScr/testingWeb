import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFieldPermission } from '@/lib/field-permissions';

interface PermissionAwareInputProps {
  fieldName: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'boolean' | 'date' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}

export function PermissionAwareInput({
  fieldName,
  value,
  onChange,
  type = 'text',
  placeholder,
  options = [],
  className,
  disabled = false
}: PermissionAwareInputProps) {
  const requiredPermission = getFieldPermission(fieldName);
  const { allowed: hasPermission, loading } = usePermission(requiredPermission);
  
  const isDisabled = disabled || loading || !hasPermission;
  
  // Helper function to render permission tooltip
  const renderWithTooltip = (element: React.ReactNode) => {
    if (!hasPermission && !loading) {
      return (
        <div className="relative">
          {element}
          <div className="absolute inset-0 bg-gray-200 bg-opacity-50 cursor-not-allowed flex items-center justify-center">
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
              No permission
            </span>
          </div>
        </div>
      );
    }
    return element;
  };
  
  const handleChange = (newValue: any) => {
    if (!isDisabled) {
      onChange(newValue);
    }
  };
  
  switch (type) {
    case 'textarea':
      return renderWithTooltip(
        <Textarea
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={className}
        />
      );
      
    case 'boolean':
      return renderWithTooltip(
        <Switch
          checked={Boolean(value)}
          onCheckedChange={handleChange}
          disabled={isDisabled}
          className={className}
        />
      );
      
    case 'select':
      return renderWithTooltip(
        <Select value={value || ''} onValueChange={handleChange} disabled={isDisabled}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      
    case 'date':
      return renderWithTooltip(
        <Input
          type="date"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={(e) => handleChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={className}
        />
      );
      
    case 'number':
      return renderWithTooltip(
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={className}
        />
      );
      
    default:
      return renderWithTooltip(
        <Input
          type={type}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          className={className}
        />
      );
  }
}

// Higher-order component for wrapping existing inputs with permission checks
export function withPermissionCheck<T extends { disabled?: boolean }>(
  Component: React.ComponentType<T>,
  fieldName: string
) {
  return function PermissionCheckedComponent(props: T) {
    const requiredPermission = getFieldPermission(fieldName);
    const { allowed: hasPermission, loading } = usePermission(requiredPermission);
    
    const isDisabled = props.disabled || loading || !hasPermission;
    
    return (
      <div className={!hasPermission && !loading ? 'relative' : ''}>
        <Component {...props} disabled={isDisabled} />
        {!hasPermission && !loading && (
          <div className="absolute inset-0 bg-gray-200 bg-opacity-50 cursor-not-allowed flex items-center justify-center">
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
              No permission to edit this field
            </span>
          </div>
        )}
      </div>
    );
  };
}
