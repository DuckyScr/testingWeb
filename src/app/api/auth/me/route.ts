import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
      const decoded = verify(authToken, JWT_SECRET) as { id: string; email: string; name: string; role: string };
      
      // Get the user from the database to ensure we have the latest data
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
      
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      
      return NextResponse.json(user);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}