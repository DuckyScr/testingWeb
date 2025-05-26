import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and has admin role
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    let decodedToken;
    try {
      decodedToken = verify(authToken, JWT_SECRET) as { id: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Check if user has admin role
    if (decodedToken.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    const log = await prisma.log.findUnique({
      where: { 
        id: parseInt(id) // Convert string ID to integer
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!log) {
      return NextResponse.json(
        { error: "Log not found" },
        { status: 404 }
      );
    }

    // Format log for frontend
    const formattedLog = {
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      action: log.action,
      user: log.user?.email || 'system',
      entityId: log.entityId,
      entityType: log.entityType,
      level: log.level,
      message: log.message
    };

    return NextResponse.json(formattedLog);
  } catch (error) {
    console.error("Error fetching log details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}