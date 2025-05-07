import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { createLog } from "@/lib/logging";


const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper function to validate Prisma dates
function isValidPrismaDate(date: Date | string | null): Date | null {
  if (!date) return null;
  
  try {
    const parsed = new Date(date);
    // Check if the date is valid and within a reasonable range (e.g., between 1900 and 2100)
    const year = parsed.getFullYear();
    if (!isNaN(parsed.getTime()) && year >= 1900 && year <= 2100) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper function to validate dates
function isValidDate(date: any): Date | null {
  if (!date) return null;
  
  try {
    const parsed = new Date(date);
    // Check if the date is valid and within a reasonable range (e.g., between 1900 and 2100)
    const year = parsed.getFullYear();
    if (!isNaN(parsed.getTime()) && year >= 1900 && year <= 2100) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Get the auth token from cookies
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify the token and get the current user
    let user;
    try {
      user = verify(authToken, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Check if user has permission to import clients
    const hasImportPermission = await hasPermission(user.role, "IMPORT_CLIENT");
    if (!hasImportPermission) {
      return NextResponse.json({ error: "You don't have permission to import clients" }, { status: 403 });
    }
    
    // Get the current user from the database
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    const records = parseCSV(text);

    // Get admin user to assign as sales rep
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser || !adminUser.id) {
      return NextResponse.json(
        { error: "No valid admin user found to assign as sales rep" },
        { status: 400 }
      );
    }

    // Use the current user instead of admin user
    const importedClients = [];
    
    for (const record of records) {
      // Skip empty rows or rows without valid IČO
      if (!record[0] || !record[1] || !/^\d+$/.test(record[1].trim())) continue;
      
      const clientData = {
        companyName: record[0] || "",
        ico: record[1] || "",
        fveName: record[2] || null,
        fveAddress: record[3] || null,
        distanceKm: parseNumber(record[4]),
        installedPower: parseNumber(record[5]),
        contactPerson: record[6] || null,
        phone: record[7] || null,
        email: record[8] || null,
        salesRepId: adminUser.id, // Keep as string, don't convert to number
      
        // Marketing and Offers
        marketingBan: toBool(record[10]),
        offerSent: toBool(record[11]),
        offerSentTo: record[12] || null,
        offerSentDate: parseDate(record[13]),
        offerApproved: toBool(record[14]),
        offerApprovedDate: parseDate(record[15]),
        offerRejectionReason: record[16] || null,
        offerPrice: parseNumber(record[17]),
        analysisPrice: parseNumber(record[18]),
        dataCollectionPrice: parseNumber(record[19]),
        transportPrice: parseNumber(record[20]),
        marginGroup: record[21] || null,
        multipleInspections: toBool(record[22]),
        inspectionDeadline: parseDate(record[23]),
        
        // Contract
        customContract: toBool(record[24]),
        contractSignedDate: parseDate(record[25]),
        readyForBilling: toBool(record[26]),
        
        // Invoicing
        firstInvoiceAmount: parseNumber(record[27]),
        firstInvoiceDate: parseDate(record[28]),
        firstInvoiceDueDate: parseDate(record[29]),
        firstInvoicePaid: toBool(record[30]),
        secondInvoiceAmount: parseNumber(record[31]),
        secondInvoiceDate: parseDate(record[32]), // Ensure this is a valid Date
        secondInvoiceDueDate: parseDate(record[33]),
        secondInvoicePaid: toBool(record[34]),
        finalInvoiceAmount: parseNumber(record[35]),
        finalInvoiceDate: parseDate(record[36]),
        finalInvoiceDueDate: parseDate(record[37]),
        finalInvoicePaid: toBool(record[38]),
        totalPriceExVat: parseNumber(record[39]),
        totalPriceIncVat: parseNumber(record[40]),
        
        // Client Documents
        flightConsentSent: toBool(record[41]),
        flightConsentSentDate: parseDate(record[42]),
        flightConsentSigned: toBool(record[43]),
        flightConsentSignedDate: parseDate(record[44]),
        fveDrawingsReceived: toBool(record[45]),
        fveDrawingsReceivedDate: parseDate(record[46]),
        
        // Flight Permissions
        permissionRequired: toBool(record[47]),
        permissionRequested: toBool(record[48]),
        permissionRequestedDate: parseDate(record[49]),
        permissionRequestNumber: record[50] || null,
        permissionStatus: record[51] || null,
        permissionValidUntil: parseDate(record[52]),
        
        // Pilot Assignment
        assignedToPilot: toBool(record[53]),
        pilotName: record[54] || null,
        pilotAssignedDate: parseDate(record[55]),
        expectedFlightDate: parseDate(record[56]),
        
        // Data Collection
        photosTaken: toBool(record[57]),
        photosDate: parseDate(record[58]),
        photosTime: record[59] || null,
        panelTemperature: parseNumber(record[60]),
        irradiance: record[61] || null,
        dataUploaded: toBool(record[62]),
        
        // Analysis
        analysisStarted: toBool(record[63]),
        analysisStartDate: parseDate(record[64]),
        analysisCompleted: toBool(record[65]),
        analysisCompletedDate: parseDate(record[66]),
        reportCreated: toBool(record[67]),
        reportSent: toBool(record[68]),
        reportSentDate: parseDate(record[69]),
        
        // Customer Feedback
        feedbackReceived: toBool(record[70]),
        feedbackContent: record[71] || null,
        
        status: "Importováno"
      };

      // Validate required fields
      if (!clientData.ico || !clientData.companyName) continue;

      try {
        const existingClient = await prisma.client.findUnique({
          where: { ico: clientData.ico },
        });

        if (existingClient) {
          await prisma.client.update({
            where: { ico: clientData.ico },
            data: {
              companyName: clientData.companyName,
              ico: clientData.ico,
              fveName: clientData.fveName,
              fveAddress: clientData.fveAddress,
              distanceKm: clientData.distanceKm,
              installedPower: clientData.installedPower,
              contactPerson: clientData.contactPerson,
              phone: clientData.phone,
              email: clientData.email,
              salesRepId: currentUser.id,
              marketingBan: clientData.marketingBan,
              offerSent: clientData.offerSent,
              offerSentTo: clientData.offerSentTo,
              offerSentDate: isValidPrismaDate(clientData.offerSentDate),
              offerApproved: clientData.offerApproved,
              offerApprovedDate: isValidPrismaDate(clientData.offerApprovedDate),
              inspectionDeadline: isValidPrismaDate(clientData.inspectionDeadline),
              contractSignedDate: isValidPrismaDate(clientData.contractSignedDate),
              firstInvoiceDate: isValidPrismaDate(clientData.firstInvoiceDate),
              firstInvoiceDueDate: isValidPrismaDate(clientData.firstInvoiceDueDate),
              secondInvoiceDate: isValidPrismaDate(clientData.secondInvoiceDate),
              secondInvoiceDueDate: isValidPrismaDate(clientData.secondInvoiceDueDate),
              finalInvoiceDate: isValidPrismaDate(clientData.finalInvoiceDate),
              finalInvoiceDueDate: isValidPrismaDate(clientData.finalInvoiceDueDate),
              flightConsentSentDate: isValidPrismaDate(clientData.flightConsentSentDate),
              flightConsentSignedDate: isValidPrismaDate(clientData.flightConsentSignedDate),
              fveDrawingsReceivedDate: isValidPrismaDate(clientData.fveDrawingsReceivedDate),
              permissionRequestedDate: isValidPrismaDate(clientData.permissionRequestedDate),
              permissionValidUntil: isValidPrismaDate(clientData.permissionValidUntil),
              pilotAssignedDate: isValidPrismaDate(clientData.pilotAssignedDate),
              expectedFlightDate: isValidPrismaDate(clientData.expectedFlightDate),
              photosDate: isValidPrismaDate(clientData.photosDate),
              analysisStartedDate: isValidPrismaDate(clientData.analysisStartDate),
              analysisCompletedDate: isValidPrismaDate(clientData.analysisCompletedDate),
              reportSentDate: isValidPrismaDate(clientData.reportSentDate),
              feedbackReceived: clientData.feedbackReceived,
              feedbackContent: clientData.feedbackContent,
              status: clientData.status
            }
          });
        } else {
          // Modify the create client block to properly sanitize the data
          try {
            // Add this helper function at the beginning of your file
            function isValidPrismaDate(date: any): Date | null {
              if (!date) return null;
              
              try {
                const parsed = new Date(date);
                // Check if the date is valid and within a reasonable range (e.g., between 1900 and 2100)
                const year = parsed.getFullYear();
                if (!isNaN(parsed.getTime()) && year >= 1900 && year <= 2100) {
                  return parsed;
                }
                return null;
              } catch {
                return null;
              }
            }

            // In your client creation block:
            try {
              // Create a sanitized data object with only the fields that exist in your schema
              const sanitizedData = {
                companyName: clientData.companyName?.trim(),
                ico: clientData.ico,
                fveName: clientData.fveName,
                fveAddress: clientData.fveAddress?.replace(/`/g, '').trim(),
                distanceKm: clientData.distanceKm,
                installedPower: clientData.installedPower,
                contactPerson: clientData.contactPerson?.trim(),
                phone: clientData.phone?.trim(),
                email: clientData.email?.trim() || null,
                salesRepId: adminUser.id, // Keep as string, don't convert to number
                // Removed salesRep field since it doesn't exist in the schema
                marketingBan: clientData.marketingBan === true || clientData.marketingBan === false ? clientData.marketingBan : null,
                offerSent: clientData.offerSent === true || clientData.offerSent === false ? clientData.offerSent : null,
                offerSentTo: clientData.offerSentTo,
                offerSentDate: isValidDate(clientData.offerSentDate) ? clientData.offerSentDate : null,
                offerApproved: clientData.offerApproved,
                offerApprovedDate: isValidDate(clientData.offerApprovedDate) ? clientData.offerApprovedDate : null,
                offerRejectionReason: clientData.offerRejectionReason,
                totalPriceExVat: clientData.totalPriceExVat,
                analysisPrice: clientData.analysisPrice,
                dataCollectionPrice: clientData.dataCollectionPrice,
                transportPrice: clientData.transportPrice,
                marginGroup: clientData.marginGroup,
                multipleInspections: clientData.multipleInspections,
                inspectionDeadline: isValidDate(clientData.inspectionDeadline) ? clientData.inspectionDeadline : null,
                customContract: clientData.customContract,
                contractSignedDate: isValidDate(clientData.contractSignedDate) ? clientData.contractSignedDate : null,
                readyForBilling: clientData.readyForBilling,
                firstInvoiceAmount: clientData.firstInvoiceAmount,
                firstInvoiceDate: isValidDate(clientData.firstInvoiceDate) ? clientData.firstInvoiceDate : null,
                firstInvoiceDueDate: isValidDate(clientData.firstInvoiceDueDate) ? clientData.firstInvoiceDueDate : null,
                firstInvoicePaid: clientData.firstInvoicePaid,
                secondInvoiceAmount: clientData.secondInvoiceAmount,
                secondInvoiceDate: isValidDate(clientData.secondInvoiceDate) ? clientData.secondInvoiceDate : null,
                secondInvoiceDueDate: isValidDate(clientData.secondInvoiceDueDate) ? clientData.secondInvoiceDueDate : null,
                secondInvoicePaid: clientData.secondInvoicePaid,
                finalInvoiceAmount: clientData.finalInvoiceAmount,
                finalInvoiceDate: isValidDate(clientData.finalInvoiceDate) ? clientData.finalInvoiceDate : null,
                finalInvoiceDueDate: isValidDate(clientData.finalInvoiceDueDate) ? clientData.finalInvoiceDueDate : null,
                finalInvoicePaid: clientData.finalInvoicePaid,
                totalPriceIncVat: clientData.totalPriceIncVat,
                flightConsentSent: clientData.flightConsentSent,
                flightConsentSentDate: isValidDate(clientData.flightConsentSentDate) ? clientData.flightConsentSentDate : null,
                flightConsentSigned: clientData.flightConsentSigned,
                flightConsentSignedDate: isValidDate(clientData.flightConsentSignedDate) ? clientData.flightConsentSignedDate : null,
                fveDrawingsReceived: clientData.fveDrawingsReceived,
                fveDrawingsReceivedDate: isValidDate(clientData.fveDrawingsReceivedDate) ? clientData.fveDrawingsReceivedDate : null,
                permissionRequired: clientData.permissionRequired,
                permissionRequested: clientData.permissionRequested,
                permissionRequestedDate: isValidDate(clientData.permissionRequestedDate) ? clientData.permissionRequestedDate : null,
                permissionRequestNumber: clientData.permissionRequestNumber,
                permissionStatus: clientData.permissionStatus,
                permissionValidUntil: isValidDate(clientData.permissionValidUntil) ? clientData.permissionValidUntil : null,
                assignedToPilot: clientData.assignedToPilot,
                pilotName: clientData.pilotName,
                pilotAssignedDate: isValidDate(clientData.pilotAssignedDate) ? clientData.pilotAssignedDate : null,
                expectedFlightDate: isValidDate(clientData.expectedFlightDate) ? clientData.expectedFlightDate : null,
                photosTaken: clientData.photosTaken,
                photosDate: isValidDate(clientData.photosDate) ? clientData.photosDate : null,
                photosTime: typeof clientData.photosTime === 'string' && clientData.photosTime.includes('.') ? null : clientData.photosTime,
                panelTemperature: clientData.panelTemperature,
                irradiance: clientData.irradiance ? parseFloat(String(clientData.irradiance).replace(/"/g, '')) : null,
                dataUploaded: clientData.dataUploaded,
                analysisStarted: clientData.analysisStarted,
                analysisStartDate: isValidDate(clientData.analysisStartDate) ? clientData.analysisStartDate : null,
                analysisCompleted: clientData.analysisCompleted,
                analysisCompletedDate: isValidDate(clientData.analysisCompletedDate) ? clientData.analysisCompletedDate : null,
                reportCreated: clientData.reportCreated,
                reportSent: clientData.reportSent,
                reportSentDate: isValidDate(clientData.reportSentDate) ? clientData.reportSentDate : null,
                feedbackReceived: clientData.feedbackReceived,
                feedbackContent: clientData.feedbackContent,
                status: "Importováno"
              };
            
              // Remove any fields that don't exist in your schema
              // This is important to handle fields like 'offerPrice' that might be in your CSV but not in your schema
              const schemaFields = [
                'companyName', 'ico', 'fveName', 'fveAddress', 'distanceKm', 'installedPower', 
                'contactPerson', 'phone', 'email', 'salesRepId', 'salesRep', 'marketingBan', 
                'offerSent', 'offerSentTo', 'offerSentDate', 'offerApproved', 'offerApprovedDate', 
                'offerRejectionReason', 'totalPriceExVat', 'analysisPrice', 'dataCollectionPrice', 
                'transportPrice', 'marginGroup', 'multipleInspections', 'inspectionDeadline', 
                'customContract', 'contractSignedDate', 'readyForBilling', 'firstInvoiceAmount', 
                'firstInvoiceDate', 'firstInvoiceDueDate', 'firstInvoicePaid', 'secondInvoiceAmount', 
                'secondInvoiceDate', 'secondInvoiceDueDate', 'secondInvoicePaid', 'finalInvoiceAmount', 
                'finalInvoiceDate', 'finalInvoiceDueDate', 'finalInvoicePaid', 'totalPriceIncVat', 
                'flightConsentSent', 'flightConsentSentDate', 'flightConsentSigned', 'flightConsentSignedDate', 
                'fveDrawingsReceived', 'fveDrawingsReceivedDate', 'permissionRequired', 'permissionRequested', 
                'permissionRequestedDate', 'permissionRequestNumber', 'permissionStatus', 'permissionValidUntil', 
                'pilotAssigned', 'pilotName', 'pilotAssignedDate', 'expectedFlightDate', 'photosTaken', 
                'photosDate', 'photosTime', 'panelTemperature', 'illumination', 'photosUploaded', 
                'analysisStarted', 'analysisStartedDate', 'analysisCompleted', 'analysisCompletedDate', 
                'reportCreated', 'reportSent', 'reportSentDate', 'feedbackReceived', 'feedbackContent', 'status'
              ];
            
              const validData: Record<string, any> = {};
              for (const field of schemaFields) {
                if (field in sanitizedData) {
                  validData[field] = (sanitizedData as any)[field];
                }
              }
            
              const newClient = await prisma.client.create({
                data: {
                  ico: clientData.ico,
                  companyName: clientData.companyName,
                  status: clientData.status,
                  ...validData
                }
              });
              importedClients.push(newClient);

              // Log the client import
              await createLog(
                "IMPORT_CLIENT",
                user.id,
                `Imported client: ${newClient.companyName} with ICO: ${newClient.ico}`,
                "Client",
                String(newClient.id),
                "info"
              );
            } catch (error) {
              console.error(`Error importing client ${clientData.companyName}:`, error);
              console.error('Problematic data:', {
                ...clientData,
                // Stringify dates for better debugging
                finalInvoiceDate: String(clientData.finalInvoiceDate),
                finalInvoiceDueDate: String(clientData.finalInvoiceDueDate)
              });
            }
          } catch (error) {
            console.error(`Error importing client ${clientData.companyName}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error importing client ${clientData.companyName}:`, error);
      }
    }

    return NextResponse.json({
      message: "Import successful",
      imported: importedClients.length,
      total: records.length,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to process CSV file" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions for data parsing
function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.toString().replace(/[^\d.-]/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return isNaN(parsed) ? null : parsed;
}

function toBool(value: string | null | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  return ['ano', 'true', '1', 'yes'].includes(normalized) ? true :
         ['ne', 'false', '0', 'no'].includes(normalized) ? false : null;
}

function parseCSV(text: string) {
  return parse(text, {
    skip_empty_lines: true,
    trim: true
  });
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    // Skip invalid dates like "+070179-12-31T23:00:00.000Z"
    if (dateStr.startsWith('+') || dateStr.startsWith('-') || 
        dateStr.includes('undefined') || dateStr.trim() === '') {
      return null;
    }

    // Handle Czech date format (DD.MM.YYYY)
    const czechFormat = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (czechFormat) {
      const date = new Date(
        parseInt(czechFormat[3]),
        parseInt(czechFormat[2]) - 1,
        parseInt(czechFormat[1])
      );
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    return null;
  } catch (e) {
    console.error("Date parsing error:", e);
    return null;
  }
}

// For the other any types in the file:
interface ImportedData {
  // Add specific types based on your data structure
  [key: string]: string | number | boolean | Date | null;
}
