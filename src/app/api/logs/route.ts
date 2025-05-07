import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
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
    
    // Fetch real logs from the database
    const logs = await prisma.log.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      take: 100 // Limit to the most recent 100 logs
    });
    
    // Format logs for the frontend
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      action: log.action,
      user: log.user?.email || 'system',
      details: log.details,
      entity: log.entity,
      entityId: log.entityId,
      severity: log.severity
    }));
    
    return NextResponse.json(formattedLogs);
    
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}