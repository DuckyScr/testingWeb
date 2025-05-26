import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDates } from "@/lib/date-utils";
import { createLog } from "@/lib/logging";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Define date fields that need processing
const DRONE_DATE_FIELDS = [
  'offerSentDate', 'offerApprovedDate', 'contractSignedDate',
  'invoiceDate', 'invoiceDueDate', 'deliveryDate', 'trainingDate'
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Check specific permissions based on what's being updated
    if (body.companyName !== undefined) {
      const hasEditNamePermission = await hasPermission(user.role, "edit_drone_sale_name");
      if (!hasEditNamePermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit drone sale name" },
          { status: 403 }
        );
      }
    }
    
    // Check for contact information updates
    if (body.contactPerson !== undefined || body.phone !== undefined || body.email !== undefined) {
      const hasEditContactPermission = await hasPermission(user.role, "edit_drone_sale_contact");
      if (!hasEditContactPermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit drone sale contact information" },
          { status: 403 }
        );
      }
    }
    
    // Check for status updates
    if (body.status !== undefined) {
      const hasEditStatusPermission = await hasPermission(user.role, "edit_drone_sale_status");
      if (!hasEditStatusPermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit drone sale status" },
          { status: 403 }
        );
      }
    }
    
    // Remove the id field from the data object
    if ('id' in body) {
      delete body.id;
    }
    
    // Handle salesRepId separately for the relation
    let salesRepId;
    if ('salesRepId' in body) {
      salesRepId = body.salesRepId;
      delete body.salesRepId;
    }
    
    // Remove salesRep if it's in the body (it should be in include, not data)
    if ('salesRep' in body) {
      delete body.salesRep;
    }
    
    // Process dates to ensure they're in the correct format for Prisma
    const processedData = processDates(body, DRONE_DATE_FIELDS);
    
    // Add the salesRep connect if salesRepId was provided
    if (salesRepId) {
      processedData.salesRep = {
        connect: { id: salesRepId }
      };
    }
    
    // Update drone sale
    const updatedDroneSale = await prisma.droneSale.update({
      where: { id: Number(id) },
      data: processedData,
      include: {
        salesRep: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    // Log the update
    await createLog(
      "UPDATE_DRONE_SALE",
      String(user.id),
      `Updated drone sale: ${updatedDroneSale.companyName}`,
      "DroneSale",
      id,
      "info"
    );
    
    return NextResponse.json(updatedDroneSale);
  } catch (error) {
    console.error("Error updating drone sale:", error);
    return NextResponse.json(
      { message: "Error updating drone sale", error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Fetch drone sale
    const droneSale = await prisma.droneSale.findUnique({
      where: { id: Number(id) },
      include: {
        salesRep: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!droneSale) {
      return NextResponse.json(
        { message: "Drone sale not found" },
        { status: 404 }
      );
    }
    
    // Log the access
    await createLog(
      "GET_DRONE_SALE",
      String(user.id),
      `Viewed drone sale: ${droneSale.companyName}`,
      "DroneSale",
      id,
      "info"
    );
    
    return NextResponse.json(droneSale);
  } catch (error) {
    console.error("Error fetching drone sale:", error);
    return NextResponse.json(
      { message: "Error fetching drone sale", error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user has permission to delete drone sales
    const hasDeletePermission = await hasPermission(user.role, "delete_drone_sale");
    if (!hasDeletePermission) {
      return NextResponse.json(
        { message: "You don't have permission to delete drone sales" },
        { status: 403 }
      );
    }
    
    // Get the drone sale before deleting it (for logging)
    const droneSale = await prisma.droneSale.findUnique({
      where: { id: Number(id) }
    });
    
    if (!droneSale) {
      return NextResponse.json(
        { message: "Drone sale not found" },
        { status: 404 }
      );
    }
    
    // Delete the drone sale
    await prisma.droneSale.delete({
      where: { id: Number(id) }
    });
    
    // Log the deletion
    await createLog(
      "DELETE_DRONE_SALE",
      String(user.id),
      `Deleted drone sale: ${droneSale.companyName}`,
      "DroneSale",
      id,
      "info"
    );
    
    return NextResponse.json({ message: "Drone sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting drone sale:", error);
    return NextResponse.json(
      { message: "Error deleting drone sale", error: String(error) },
      { status: 500 }
    );
  }
}