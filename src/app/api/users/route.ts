import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all users and convert id to string
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Map users to ensure id is a string
    const formattedUsers = users.map(u => ({
      ...u,
      id: String(u.id)
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Error fetching users", error: String(error) },
      { status: 500 }
    );
  }
} 