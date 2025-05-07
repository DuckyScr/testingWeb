import { PrismaClient } from '@prisma/client';
import { compare } from 'bcrypt';
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";


const prisma = new PrismaClient();

export async function authenticateUser(email: string, password: string) {
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // If no user found, return null
    if (!user) {
      return null;
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await compare(password, user.password);

    // If password doesn't match, return null
    if (!passwordMatch) {
      return null;
    }

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function getUser(request: NextRequest) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return null;
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
        return null;
      }
      
      return user;
    } catch (error) {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}