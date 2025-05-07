import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logging";
import { sign } from 'jsonwebtoken';

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
    
    const { name, email } = await request.json();
    
    // Validate input
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    
    // Check if email is already in use by another user
    if (email !== decoded.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser && existingUser.id !== decoded.id) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    // Log the profile update
    await createLog(
      "UPDATE_PROFILE",
      decoded.id,
      `User updated their profile`,
      "User",
      decoded.id,
      "info"
    );
    
    // Update the JWT token with new user info
    const newToken = sign(
      { 
        id: updatedUser.id, 
        email: updatedUser.email, 
        name: updatedUser.name, 
        role: updatedUser.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Set the new token in cookies
    const response = NextResponse.json(updatedUser);
    response.cookies.set({
      name: 'auth-token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}