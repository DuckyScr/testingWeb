import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLog } from "@/lib/logging";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { checkFieldPermissions, filterDataByPermissions } from "@/lib/field-permissions";
import { canViewClient } from "@/lib/client-visibility";
import { Prisma } from '@prisma/client';

// Define date fields that need processing
const FVE_DATE_FIELDS = [
  'offerSentDate', 'offerApprovedDate', 'inspectionDeadline', 
  'contractSignedDate', 'firstInvoiceDate', 'firstInvoiceDueDate', 
  'secondInvoiceDate', 'secondInvoiceDueDate', 'finalInvoiceDate', 
  'finalInvoiceDueDate', 'flightConsentSentDate', 'flightConsentSignedDate', 
  'fveDrawingsReceivedDate', 'permissionRequestedDate', 'permissionValidUntil', 
  'pilotAssignedDate', 'expectedFlightDate', 'photosDate', 
  'analysisStartedDate', 'analysisCompletedDate', 'reportSentDate',
  'analysisStartDate'
];

// Define fields that should be stored as strings but might come as numbers
const NUMERIC_STRING_FIELDS = [
  'installedPower',
  'distanceKm',
  'priceExVat',
  'dataAnalysisPrice',
  'dataCollectionPrice',
  'transportationPrice',
  'firstInvoiceAmount',
  'secondInvoiceAmount',
  'finalInvoiceAmount',
  'totalPriceExVat',
  'totalPriceIncVat',
  'panelTemperature',
  'irradiance',
  'windSpeed'
];

// Define fields for "základní_informace" category
const ZAKLADNI_INFORMACE_FIELDS = [
  "companyName",
  "ico",
  "parentCompany",
  "parentCompanyIco",
  "dataBox",
  "fveName",
  "installedPower",
  "fveAddress",
  "gpsCoordinates",
  "distanceKm",
  "serviceCompany",
  "serviceCompanyIco"
];

// Function to convert numeric fields to strings
function convertNumericFieldsToStrings(data: any) {
  const result = { ...data };
  NUMERIC_STRING_FIELDS.forEach(field => {
    if (field in result && result[field] !== null) {
      result[field] = String(result[field]);
    }
  });
  return result;
}

// Function to ensure proper date format
function ensureISODate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    // If it's just a date string (YYYY-MM-DD), add time component
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00:00.000Z`);
    }
    // Try to parse as ISO string
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

// Update the processDates function
function processDates(data: any, dateFields: string[]) {
  const result = { ...data };
  dateFields.forEach(field => {
    if (field in result) {
      result[field] = ensureISODate(result[field]);
    }
  });
  return result;
}

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
    
    // Check field-level permissions
    const fieldNames = Object.keys(body);
    const fieldPermissions = await checkFieldPermissions(user.role, fieldNames, hasPermission);
    
    // Filter out fields that the user doesn't have permission to edit
    const allowedFields = fieldNames.filter(field => fieldPermissions[field]);
    const deniedFields = fieldNames.filter(field => !fieldPermissions[field]);
    
    // If there are denied fields, return an error with details
    if (deniedFields.length > 0) {
      return NextResponse.json(
        { 
          message: "Insufficient permissions to edit some fields", 
          deniedFields: deniedFields,
          allowedFields: allowedFields 
        },
        { status: 403 }
      );
    }
    
    // Before processing the update, check permissions based on salesRepId
    const existingClient = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: {
        salesRepId: true,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    
    // Check if user can view this specific client
    const canView = await canViewClient(user.role, user.id, existingClient.salesRepId);
    if (!canView) {
      return NextResponse.json(
        { message: "You don't have permission to edit this client" },
        { status: 403 }
      );
    }

    // If a sales rep is assigned to the client, restrict editing
    if (existingClient.salesRepId) {
      const isAssignedSalesRep = user.id === existingClient.salesRepId;
      const isAdmin = user.role === "ADMIN";

      if (!isAssignedSalesRep && !isAdmin) {
        return NextResponse.json(
          { message: "You don't have permission to edit this client" },
          { status: 403 }
        );
      }
    }

    // Process dates to ensure they're in the correct format for Prisma
    let processedData = processDates(body, FVE_DATE_FIELDS);

    // Convert numeric fields to strings
    processedData = convertNumericFieldsToStrings(processedData);

    // Remove salesRepId and salesRepEmail from processedData as they're handled separately
    const { salesRepId, salesRepEmail, ...restData } = processedData;

    // Update the client using the id from the URL params
    const updatedClient = await prisma.client.update({
      where: { 
        id: Number(id) // Convert string id to number
      },
      data: {
        ...restData,
        // Handle salesRep relation
        salesRep: salesRepId ? {
          connect: { id: salesRepId }
        } : {
          disconnect: true
        },
        salesRepEmail: salesRepEmail || null
      }
    });

    // Fetch the updated client with sales rep info
    const clientWithSalesRep = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        companyName: true,
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        salesRepEmail: true
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

    return NextResponse.json(clientWithSalesRep);
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
    
    // Check if user has permission to view clients
    const hasViewPermission = await hasPermission(user.role, "view_clients");
    if (!hasViewPermission) {
      return NextResponse.json(
        { message: "You don't have permission to view clients" },
        { status: 403 }
      );
    }
    
    // First, fetch only the salesRepId and companyName to determine access
    const initialClientCheck = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        companyName: true,
        salesRepId: true,
      },
    });

    if (!initialClientCheck) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    
    // Check if user can view this specific client
    const canView = await canViewClient(user.role, user.id, initialClientCheck.salesRepId);
    if (!canView) {
      return NextResponse.json(
        { message: "You don't have permission to view this client" },
        { status: 403 }
      );
    }

    const isAssignedSalesRep = user.id === initialClientCheck.salesRepId;
    const isAdmin = await hasPermission(user.role, "admin");

    let selectFields: Prisma.ClientSelect = {
      id: true,
      companyName: true,
      salesRepId: true, // Always select salesRepId for UI logic
      salesRep: { // Always select salesRep for UI display (name/email)
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    // If a salesRepId is assigned and the user is neither the assigned sales rep nor an admin,
    // restrict the fields to only basic information.
    if (initialClientCheck.salesRepId && !isAssignedSalesRep && !isAdmin) {
      ZAKLADNI_INFORMACE_FIELDS.forEach(field => {
        selectFields = { ...selectFields, [field]: true };
      });
    } else {
      // Otherwise, select all scalar fields
      Object.values(Prisma.ClientScalarFieldEnum).forEach(field => {
        selectFields = { ...selectFields, [field]: true };
      });
    }

    // Fetch the client data with the determined select fields
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: selectFields,
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
    
    return NextResponse.json(client); // Return the potentially filtered client
  } catch (error) {
    // console.error("Error fetching client:", error);
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
    
    // Fetch client first to get its details for logging and check visibility
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      select: {
        companyName: true,
        salesRepId: true
      }
    });
    
    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    
    // Check if user can view this specific client
    const canView = await canViewClient(user.role, user.id, client.salesRepId);
    if (!canView) {
      return NextResponse.json(
        { message: "You don't have permission to delete this client" },
        { status: 403 }
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