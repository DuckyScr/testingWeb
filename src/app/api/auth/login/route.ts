import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { sign } from "jsonwebtoken";

// This would be in an environment variable in a real app
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email a heslo jsou povinné" },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { message: "Neplatné přihlašovací údaje" },
        { status: 401 }
      );
    }

    // Create a JWT token
    const token = sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Set the token in a cookie
    // When setting the cookie
    (await cookies()).set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production" ? false : false, // Set to false for both environments temporarily
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: "lax"
    });

    return NextResponse.json({
      message: "Přihlášení úspěšné",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Chyba při přihlašování" },
      { status: 500 }
    );
  }
}