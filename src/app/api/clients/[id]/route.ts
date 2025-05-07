import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDates } from "@/lib/date-utils";
import { createLog } from "@/lib/logging";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Define date fields that need processing
const DATE_FIELDS = [
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
      const hasEditNamePermission = await hasPermission(user.role, "edit_client_name");
      if (!hasEditNamePermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit client name" },
          { status: 403 }
        );
      }
    }
    
    // Check for contact information updates
    if (body.contactPerson !== undefined || body.phone !== undefined || body.email !== undefined) {
      const hasEditContactPermission = await hasPermission(user.role, "edit_client_contact");
      if (!hasEditContactPermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit client contact information" },
          { status: 403 }
        );
      }
    }
    
    // Check for address updates
    if (body.fveAddress !== undefined) {
      const hasEditAddressPermission = await hasPermission(user.role, "edit_client_address");
      if (!hasEditAddressPermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit client address" },
          { status: 403 }
        );
      }
    }
    
    // Check for status updates
    if (body.status !== undefined) {
      const hasEditStatusPermission = await hasPermission(user.role, "edit_client_status");
      if (!hasEditStatusPermission) {
        return NextResponse.json(
          { message: "You don't have permission to edit client status" },
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
    const processedData = processDates(body, DATE_FIELDS);
    
    // Add the salesRep connect if salesRepId was provided
    if (salesRepId) {
      processedData.salesRep = {
        connect: { id: salesRepId }
      };
    }
    
    // Update client
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
    
    // Log the update
    await createLog(
      "UPDATE_CLIENT",
      user.id,
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
      user.id,
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
      user.id,
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