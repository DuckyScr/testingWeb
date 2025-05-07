import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface PermissionMap {
  [permission: string]: {
    [role: string]: boolean;
  };
}

export async function GET() {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
      const decoded = verify(authToken, JWT_SECRET) as { role: string };
      if (decoded.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const permissions = await prisma.rolePermission.findMany();
    
    // Transform the permissions into a more usable format with proper typing
    const formattedPermissions = permissions.reduce<PermissionMap>((acc, permission) => {
      if (!acc[permission.permission]) {
        acc[permission.permission] = {};
      }
      acc[permission.permission][permission.role] = permission.allowed;
      return acc;
    }, {});
    
    return NextResponse.json(formattedPermissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}