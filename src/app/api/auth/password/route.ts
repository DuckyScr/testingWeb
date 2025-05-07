import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function PUT(request: Request) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let decoded;
    try {
      decoded = verify(authToken, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const { currentPassword, newPassword } = await request.json();
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
    }
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        password: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await prisma.user.update({
      where: { id: decoded.id },
      data: { password: hashedPassword }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}