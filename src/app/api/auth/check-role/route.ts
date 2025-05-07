import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ role: null }, { status: 401 });
    }
    
    try {
      const decoded = verify(authToken, JWT_SECRET) as { role: string };
      return NextResponse.json({ role: decoded.role });
    } catch (error) {
      return NextResponse.json({ role: null }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ role: null }, { status: 500 });
  }
}