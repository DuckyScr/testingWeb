import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { role: string } }
) {
  try {
    const { role } = await params;
    const body = await request.json();

    for (const [permission, allowed] of Object.entries(body)) {
      // Find existing permission
      const existingPermission = await prisma.rolePermission.findFirst({
        where: {
          role,
          permission
        }
      });

      if (existingPermission) {
        // Update existing permission
        await prisma.rolePermission.update({
          where: {
            id: existingPermission.id
          },
          data: {
            allowed: Boolean(allowed)
          }
        });
      } else {
        // Create new permission
        await prisma.rolePermission.create({
          data: {
            role,
            permission,
            allowed: Boolean(allowed)
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}