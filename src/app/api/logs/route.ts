import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

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
    
    // Check if user has permission to view logs
    const hasViewLogsPermission = await hasPermission(decodedToken.role, "view_logs");
    if (!hasViewLogsPermission) {
      return NextResponse.json(
        { error: "You don't have permission to view logs" },
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
      entityId: log.entityId,
      entityType: log.entityType,
      level: log.level,
      message: log.message
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