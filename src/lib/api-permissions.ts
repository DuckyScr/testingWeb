import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { hasPermission } from '@/lib/permissions';
import { Permission } from '@/lib/permissions-list';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function checkApiPermission(permission: Permission) {
  const authToken = (await cookies()).get('auth-token')?.value;
  
  if (!authToken) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  try {
    const decoded = verify(authToken, JWT_SECRET) as { role: string };
    const hasPerm = await hasPermission(decoded.role, permission);
    
    if (!hasPerm) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Permission check failed:', error);
    return {
      success: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    };
  }
}

// Helper function to wrap API handlers with permission checks
export function withApiPermission(permission: Permission) {
  return async (handler: (req: Request, context: any) => Promise<NextResponse>) => {
    return async (req: Request, context: any) => {
      const checkResult = await checkApiPermission(permission);
      
      if (!checkResult.success) {
        return checkResult.response;
      }

      return handler(req, context);
    };
  };
}
