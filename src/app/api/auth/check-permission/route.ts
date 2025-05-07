import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { hasPermission } from "@/lib/permissions";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: Request) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ allowed: false, error: "Unauthorized" }, { status: 401 });
    }
    
    try {
      const decoded = verify(authToken, JWT_SECRET) as { role: string };
      const { permission } = await request.json();
      
      if (!permission) {
        return NextResponse.json({ allowed: false, error: "Permission parameter is required" }, { status: 400 });
      }
      
      // Add defensive check for the role
      if (!decoded.role) {
        return NextResponse.json({ allowed: false, error: "User role is missing" }, { status: 400 });
      }
      
      try {
        const allowed = await hasPermission(decoded.role, permission);
        return NextResponse.json({ allowed });
      } catch (permissionError) {
        console.error("Error in hasPermission function:", permissionError);
        return NextResponse.json({ allowed: false, error: "Error checking permission" }, { status: 500 });
      }
      
    } catch (error) {
      return NextResponse.json({ allowed: false, error: "Invalid token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json({ allowed: false, error: "Server error" }, { status: 500 });
  }
}