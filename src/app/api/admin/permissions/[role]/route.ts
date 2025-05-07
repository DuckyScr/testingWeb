import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

type RouteSegment = { params: Promise<{ role: string }> };

export async function PUT(
  request: NextRequest,
  segment: RouteSegment
): Promise<Response> {
  try {
    const { role } = await segment.params;
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
      const decoded = verify(authToken, JWT_SECRET) as { role: string };
      if (decoded.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch (_error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    for (const [permission, allowed] of Object.entries(body)) {
      await prisma.rolePermission.upsert({
        where: {
          role_permission: {
            role,
            permission
          }
        },
        update: {
          allowed: allowed as boolean
        },
        create: {
          role,
          permission,
          allowed: allowed as boolean
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating permissions:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}