import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface PermissionMap {
  [role: string]: {
    [permission: string]: boolean;
  };
}

export async function GET() {
  try {
    const permissions = await prisma.rolePermission.findMany();
    
    // Transform the permissions into a map of role -> permission -> allowed
    const formattedPermissions = permissions.reduce<PermissionMap>((acc, permission) => {
      if (!acc[permission.role]) {
        acc[permission.role] = {};
      }
      acc[permission.role][permission.permission] = permission.allowed;
      return acc;
    }, {});

    return NextResponse.json(formattedPermissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}