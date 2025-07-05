import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface ClientData {
  companyName: string;
  ico: string;
  fveName: string;
  installedPower: number | string;
  [key: string]: any;
}

export async function POST(req: Request) {
  try {
    // Verify authentication
    const cookieStore = cookies();
    const authToken = (await cookieStore).get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let userId: string;
    let userRole: string;
    try {
      const decoded = verify(authToken, JWT_SECRET) as { id: string; role: string };
      userId = decoded.id;
      userRole = decoded.role;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to import clients
    const hasImportPermission = await hasPermission(userRole, 'import_clients');
    if (!hasImportPermission) {
      return NextResponse.json(
        { error: 'You don\'t have permission to import clients' },
        { status: 403 }
      );
    }

    // Get the uploaded file
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read and parse the XLSX file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<ClientData>(worksheet, { raw: false });

    if (!jsonData.length) {
      return NextResponse.json(
        { error: 'No data found in the file' },
        { status: 400 }
      );
    }

    // Fetch all users for sales rep matching
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    // Import clients
    const importedClients: any[] = [];
    const updatedClients: any[] = [];
    const errors: Array<{row: number; error: string; data: any}> = [];

    // Helper function to find sales rep by name
    const findSalesRepByName = (salesRepName: string | null) => {
      if (!salesRepName || typeof salesRepName !== 'string') {
        return null;
      }
      
      const trimmedName = salesRepName.trim();
      if (!trimmedName) {
        return null;
      }
      
      // Try exact match first (case insensitive)
      let user = allUsers.find(u => 
        u.name && u.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      // If no exact match, try partial match
      if (!user) {
        user = allUsers.find(u => 
          u.name && (
            u.name.toLowerCase().includes(trimmedName.toLowerCase()) ||
            trimmedName.toLowerCase().includes(u.name.toLowerCase())
          )
        );
      }
      
      // Try matching by email as well
      if (!user) {
        user = allUsers.find(u => 
          u.email.toLowerCase() === trimmedName.toLowerCase()
        );
      }
      
      return user;
    };

    for (const [index, clientRow] of jsonData.entries()) {
      try {
        const clientData = clientRow as ClientData;

        // Validate required fields
        if (!clientData.companyName || !clientData.ico) {
          const errorMsg = `Missing required fields in row ${index + 2}. Required: companyName, ico`;
          console.error(errorMsg, clientData);
          throw new Error(errorMsg);
        }
        
        // Check if client already exists (based on ICO)
        const existingClient = await prisma.client.findFirst({
          where: {
            ico: clientData.ico
          }
        });
        
        // Determine sales rep
        let salesRepId = null;
        let salesRepEmail = null;
        
        // Try to match sales rep by name from import data
        if (clientData.salesRepName || clientData.salesRep || clientData.obchodniZastupce) {
          const salesRepName = clientData.salesRepName || clientData.salesRep || clientData.obchodniZastupce;
          const foundUser = findSalesRepByName(salesRepName);
          
          if (foundUser) {
            salesRepId = foundUser.id;
            salesRepEmail = foundUser.email;
          } else {
            console.warn(`Sales rep not found for name: ${salesRepName} in row ${index + 2}`);
          }
        }
        
        // If no sales rep found in import data, use current user as fallback
        if (!salesRepId) {
          salesRepId = userId;
        }

        // Prepare client data for Prisma
        // Map all fields from XLSX to Prisma model
        const clientDataForCreate: any = {
          // Required fields
          companyName: clientData.companyName,
          ico: clientData.ico,
          fveName: clientData.fveName || '',
          installedPower: clientData.installedPower ? String(clientData.installedPower) : '0',
          
          // Associate with sales rep (matched or current user)
          salesRep: salesRepId ? {
            connect: { id: salesRepId }
          } : undefined,
          salesRepEmail: salesRepEmail,
          
          // Map all other fields from XLSX
          parentCompany: clientData.parentCompany || null,
          parentCompanyIco: clientData.parentCompanyIco || null,
          dataBox: clientData.dataBox || null,
          fveAddress: clientData.fveAddress || null,
          gpsCoordinates: clientData.gpsCoordinates || null,
          distanceKm: clientData.distanceKm || null,
          serviceCompany: clientData.serviceCompany || null,
          serviceCompanyIco: clientData.serviceCompanyIco || null,
          contactPerson: clientData.contactPerson || null,
          phone: clientData.phone || null,
          email: clientData.email || null,
          contactRole: clientData.contactRole || null,
          marketingBan: Boolean(clientData.marketingBan),
          offerSent: Boolean(clientData.offerSent),
          offerSentTo: clientData.offerSentTo || null,
          offerSentDate: clientData.offerSentDate ? new Date(clientData.offerSentDate) : null,
          offerApproved: Boolean(clientData.offerApproved),
          offerApprovedDate: clientData.offerApprovedDate ? new Date(clientData.offerApprovedDate) : null,
          offerRejectionReason: clientData.offerRejectionReason || null,
          dataCollectionPrice: clientData.dataCollectionPrice || null,
          marginGroup: clientData.marginGroup || null,
          multipleInspections: Boolean(clientData.multipleInspections),
          inspectionDeadline: clientData.inspectionDeadline ? new Date(clientData.inspectionDeadline) : null,
          customContract: Boolean(clientData.customContract),
          contractSignedDate: clientData.contractSignedDate ? new Date(clientData.contractSignedDate) : null,
          readyForBilling: Boolean(clientData.readyForBilling),
          firstInvoiceAmount: clientData.firstInvoiceAmount || null,
          firstInvoiceDate: clientData.firstInvoiceDate ? new Date(clientData.firstInvoiceDate) : null,
          firstInvoiceDueDate: clientData.firstInvoiceDueDate ? new Date(clientData.firstInvoiceDueDate) : null,
          firstInvoicePaid: Boolean(clientData.firstInvoicePaid),
          secondInvoiceAmount: clientData.secondInvoiceAmount || null,
          secondInvoiceDate: clientData.secondInvoiceDate ? new Date(clientData.secondInvoiceDate) : null,
          secondInvoiceDueDate: clientData.secondInvoiceDueDate ? new Date(clientData.secondInvoiceDueDate) : null,
          secondInvoicePaid: Boolean(clientData.secondInvoicePaid),
          finalInvoiceAmount: clientData.finalInvoiceAmount || null,
          finalInvoiceDate: clientData.finalInvoiceDate ? new Date(clientData.finalInvoiceDate) : null,
          finalInvoiceDueDate: clientData.finalInvoiceDueDate ? new Date(clientData.finalInvoiceDueDate) : null,
          finalInvoicePaid: Boolean(clientData.finalInvoicePaid),
          totalPriceExVat: clientData.totalPriceExVat || null,
          totalPriceIncVat: clientData.totalPriceIncVat || null,
          flightConsentSent: Boolean(clientData.flightConsentSent),
          flightConsentSentDate: clientData.flightConsentSentDate ? new Date(clientData.flightConsentSentDate) : null,
          flightConsentSigned: Boolean(clientData.flightConsentSigned),
          flightConsentSignedDate: clientData.flightConsentSignedDate ? new Date(clientData.flightConsentSignedDate) : null,
          fveDrawingsReceived: Boolean(clientData.fveDrawingsReceived),
          fveDrawingsReceivedDate: clientData.fveDrawingsReceivedDate ? new Date(clientData.fveDrawingsReceivedDate) : null,
          permissionRequired: Boolean(clientData.permissionRequired),
          permissionRequested: Boolean(clientData.permissionRequested),
          permissionRequestedDate: clientData.permissionRequestedDate ? new Date(clientData.permissionRequestedDate) : null,
          permissionRequestNumber: clientData.permissionRequestNumber || null,
          permissionStatus: clientData.permissionStatus || null,
          permissionValidUntil: clientData.permissionValidUntil ? new Date(clientData.permissionValidUntil) : null,
          assignedToPilot: Boolean(clientData.assignedToPilot),
          pilotName: clientData.pilotName || null,
          pilotAssignedDate: clientData.pilotAssignedDate ? new Date(clientData.pilotAssignedDate) : null,
          expectedFlightDate: clientData.expectedFlightDate ? new Date(clientData.expectedFlightDate) : null,
          photosTaken: Boolean(clientData.photosTaken),
          photosDate: clientData.photosDate ? new Date(clientData.photosDate) : null,
          photosTime: clientData.photosTime || null,
          panelTemperature: clientData.panelTemperature || null,
          irradiance: clientData.irradiance || null,
          weather: clientData.weather || null,
          windSpeed: clientData.windSpeed || null,
          dataUploaded: Boolean(clientData.dataUploaded),
          analysisStarted: Boolean(clientData.analysisStarted),
          analysisStartDate: clientData.analysisStartDate ? new Date(clientData.analysisStartDate) : null,
          analysisCompleted: Boolean(clientData.analysisCompleted),
          analysisCompletedDate: clientData.analysisCompletedDate ? new Date(clientData.analysisCompletedDate) : null,
          reportCreated: Boolean(clientData.reportCreated),
          reportSent: Boolean(clientData.reportSent),
          reportSentDate: clientData.reportSentDate ? new Date(clientData.reportSentDate) : null,
          feedbackReceived: Boolean(clientData.feedbackReceived),
          feedbackContent: clientData.feedbackContent || null,
          status: 'active', // Default status
          clientType: 'fve' // Default client type
        };

        let resultClient;
        
        if (existingClient) {
          // Update existing client (overwrite with new data)
          resultClient = await prisma.client.update({
            where: { id: existingClient.id },
            data: clientDataForCreate,
          });
          updatedClients.push(resultClient);
        } else {
          // Create new client
          resultClient = await prisma.client.create({
            data: clientDataForCreate,
          });
          importedClients.push(resultClient);
        }
      } catch (error) {
        console.error(error);
        errors.push({
          row: index + 2, // +2 because XLSX rows are 1-based and we have a header
          error: error instanceof Error ? error.message : 'Unknown error',
          data: clientRow,
        });
      }
    }

    const result = {
      success: true,
      imported: importedClients.length,
      updated: updatedClients.length,
      total: jsonData.length,
      errors,
      summary: {
        newClients: importedClients.length,
        updatedClients: updatedClients.length,
        errorCount: errors.length,
        totalProcessed: jsonData.length
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add CORS headers if needed
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}