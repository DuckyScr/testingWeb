import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDates } from "@/lib/date-utils";
import { createLog } from "@/lib/logging";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Define date fields that need processing
const FVE_DATE_FIELDS = [
  'offerSentDate', 'offerApprovedDate', 'inspectionDeadline', 
  'contractSignedDate', 'firstInvoiceDate', 'firstInvoiceDueDate', 
  'secondInvoiceDate', 'secondInvoiceDueDate', 'finalInvoiceDate', 
  'finalInvoiceDueDate', 'flightConsentSentDate', 'flightConsentSignedDate', 
  'fveDrawingsReceivedDate', 'permissionRequestedDate', 'permissionValidUntil', 
  'pilotAssignedDate', 'expectedFlightDate', 'photosDate', 
  'analysisStartedDate', 'analysisCompletedDate', 'reportSentDate'
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Remove the id field from the data object
    if ('id' in body) {
      delete body.id;
    }

    let salesRepId;
    if ('salesRepId' in body) {
      salesRepId = body.salesRepId;
      delete body.salesRepId;
    }

    if ('salesRep' in body) {
      delete body.salesRep;
    }

    // Process dates to ensure they're in the correct format for Prisma
    let processedData = processDates(body, FVE_DATE_FIELDS);

    if (salesRepId) {
      processedData.salesRep = {
        connect: { id: salesRepId }
      };
    }

    if (body.categorizedData) {
      Object.keys(body.categorizedData).forEach(category => {
        Object.keys(body.categorizedData[category]).forEach(field => {
          processedData[field] = body.categorizedData[category][field];
        });
      });
      delete processedData.categorizedData;
    }

    const updatedClient = await prisma.client.update({
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

    await createLog(
      "UPDATE_CLIENT",
      String(user.id),
      `Updated client: ${updatedClient.companyName}`,
      "Client",
      id,
      "info"
    );

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { message: "Error updating client", error: String(error) },
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
    
    // Fetch client
    const client = await prisma.client.findUnique({
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
    
    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    
    // Log the access
    await createLog(
      "GET_CLIENT",
      String(user.id),
      `Viewed client: ${client.companyName}`,
      "Client",
      id,
      "info"
    );
    
    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { message: "Error fetching client", error: String(error) },
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
    
    // Check if user has permission to delete clients
    const hasDeletePermission = await hasPermission(user.role, "delete_clients");
    if (!hasDeletePermission) {
      return NextResponse.json(
        { message: "You don't have permission to delete clients" },
        { status: 403 }
      );
    }
    
    // Fetch client first to get its details for logging
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: {
        companyName: true
      }
    });
    
    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    
    // Actually delete the client
    const deletedClient = await prisma.client.delete({
      where: { id: Number(id) }
    });
    
    // Log the deletion
    await createLog(
      "DELETE_CLIENT",
      String(user.id),
      `Deleted client: ${client.companyName}`,
      "Client",
      id,
      "info"
    );
    
    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { message: "Error deleting client", error: String(error) },
      { status: 500 }
    );
  }
}