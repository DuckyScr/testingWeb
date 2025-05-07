import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let decodedToken;
    try {
      decodedToken = verify(authToken, JWT_SECRET) as { id: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    if (decodedToken.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    const log = await prisma.log.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    // Format the log for frontend consumption
    const formattedLog = {
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      action: log.action,
      user: log.user?.email || 'system',
      details: log.details,
      entity: log.entity,
      entityId: log.entityId,
      severity: log.severity
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