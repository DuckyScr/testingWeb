import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { createLog } from "@/lib/logging";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let decoded;
    try {
      decoded = verify(authToken, JWT_SECRET) as { id: string, role: string };
      if (decoded.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    
    // Log the action
    await createLog(
      "GET_USERS",
      decoded.id,
      "Admin fetched all users",
      "User",
      "",
      "info"
    );
    
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let decoded;
    try {
      decoded = verify(authToken, JWT_SECRET) as { id: string, role: string };
      if (decoded.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(body.password, salt);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword, // Store the hashed password
        role: body.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    
    // Log the action
    await createLog(
      "CREATE_USER",
      decoded.id,
      `Admin created new user: ${user.email}`,
      "User",
      user.id,
      "info"
    );
    
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}