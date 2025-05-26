import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Properly await params before destructuring
    const { id } = await params;
    const body = await request.json();

    const updatedUser = await prisma.user.update({
      where: { 
        id: String(id) // Ensure ID is treated as string
      },
      data: {
        role: body.role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}