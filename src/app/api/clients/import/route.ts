import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
    try {
      const decoded = verify(authToken, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
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

    // Import clients
    const importedClients: any[] = [];
    const errors: Array<{row: number; error: string; data: any}> = [];

    for (const [index, clientRow] of jsonData.entries()) {
      try {
        const clientData = clientRow as ClientData;

        // Validate required fields
        if (!clientData.companyName || !clientData.ico) {
          const errorMsg = `Missing required fields in row ${index + 2}. Required: companyName, ico`;
          console.error(errorMsg, clientData);
          throw new Error(errorMsg);
        }

        // Prepare client data for Prisma
        // Map all fields from XLSX to Prisma model
        const clientDataForCreate: any = {
          // Required fields
          companyName: clientData.companyName,
          ico: clientData.ico,
          fveName: clientData.fveName || '',
          installedPower: clientData.installedPower ? String(clientData.installedPower) : '0',
          
          // Associate with sales rep (user)
          salesRep: {
            connect: { id: userId }
          },
          
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

        const createdClient = await prisma.client.create({
          data: clientDataForCreate,
        });

        importedClients.push(createdClient);
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
      total: jsonData.length,
      errors,
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