import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Helper function to convert Czech date format to Date object
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // Try to parse various date formats
  const formats = [
    // DD.MM.YYYY
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
    // YYYY-MM-DD
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        if (format === formats[0]) {
          // DD.MM.YYYY format
          return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
        } else {
          // YYYY-MM-DD format
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
      } catch (e) {
        console.error("Date parsing error:", e);
        return null;
      }
    }
  }
  
  return null;
}

// Helper function to convert Czech boolean values
function parseBoolean(value: string | null | undefined): boolean | null {
  if (!value) return null;
  
  const normalized = value.toString().trim().toLowerCase();
  
  if (['ano', 'true', '1', 'yes'].includes(normalized)) {
    return true;
  } else if (['ne', 'false', '0', 'no'].includes(normalized)) {
    return false;
  }
  
  return null;
}

// Helper function to parse float values
function parseFloat(value: string | null | undefined): number | null {
  if (!value) return null;
  
  // Remove non-numeric characters except decimal point and minus sign
  // Replace comma with dot for Czech number format
  const normalized = value.toString().replace(/[^\d.-]/g, '').replace(',', '.');
  
  if (!normalized) return null;
  
  const parsed = Number(normalized);
  return isNaN(parsed) ? null : parsed;
}

export async function POST(request: NextRequest) {
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
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const csvString = buffer.toString();
    
    // Split the CSV into lines to handle the header rows
    const lines = csvString.split('\n');
    
    // Get the category headers from row 2
    const categoryHeaders = parse(lines[1], {
      skip_empty_lines: true,
      trim: true,
    })[0];
    
    // Get the column headers from row 3
    const columnHeaders = parse(lines[2], {
      skip_empty_lines: true,
      trim: true,
    })[0];
    
    // Parse the data rows starting from row 4
    const records = parse(lines.slice(3).join('\n'), {
      columns: columnHeaders,
      skip_empty_lines: true,
      trim: true,
    });
    
    // Get the default admin user for salesRepId
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "No admin user found to assign as sales rep" },
        { status: 400 }
      );
    }
    
    // Process and insert records
    const results = [];
    
    for (const record of records) {
      // Skip empty rows
      if (!record["Klient - jméno"] || !record["IČO"]) continue;
      
      try {
        const client = await prisma.client.upsert({
          where: { ico: record["IČO"] },
          update: {
            // Basic information
            companyName: record["Klient - jméno"],
            fveName: record["FVE - jméno"] || null,
            fveAddress: record["Adresa FVE"] || null,
            distanceKm: parseFloat(record["Vzdálenost km od sídla a zpět"]),
            installedPower: parseFloat(record["Instalovaný výkon"]),
            
            // Contact information
            contactPerson: record["Kontakt - jméno"] || null,
            phone: record["Kontakt - telefon"] || null,
            email: record["Kontakt - email"] || null,
            
            // Remove salesRepId from update operation
            salesRep: record["Obchodní zástupce"] || null,
            
            // Marketing and offers
            marketingBan: parseBoolean(record["Zákaz dalších marketingových oslovení?"]),
            offerSent: parseBoolean(record["Poslána ANO/NE"]),
            offerSentTo: record["Posláno kam?"] || null,
            offerSentDate: parseDate(record["Kdy?"]),
            offerApproved: parseBoolean(record["Souhlas s nabídkou ANO/NE"]),
            offerApprovedDate: parseDate(record["Kdy?_1"]),
            offerRejectionReason: record["Pokud NE tak proč?"] || null,
            
            // Pricing
            totalPriceExVat: parseFloat(record["Cena uvedená na nabídce bez DPH?"]),
            analysisPrice: parseFloat(record["Z toho cena za vyhodnocení dat bez DPH?"]),
            dataCollectionPrice: parseFloat(record["Z toho cena za sběr dat bez DPH?"]),
            transportPrice: parseFloat(record["Samostatně cena dopravy - 15 kč/km - celkem bez DPH?"]),
            marginGroup: record["Maržová skupina A-B-C"] || null,
            
            // Multiple inspections
            multipleInspections: parseBoolean(record["Domluveno na více inspekcí?"]),
            inspectionDeadline: parseDate(record["Do kdy?"]),
            
            // Contract
            customContract: parseBoolean(record["Individuální smlouva? ANO/NE"]),
            contractSignedDate: parseDate(record["Podepsáno kdy?"]),
            
            // Invoicing
            readyForBilling: parseBoolean(record["Připraveno k fakturaci"]),
            
            // First invoice
            firstInvoiceAmount: parseFloat(record["1. zálohá faktura: částka"]),
            firstInvoiceDate: parseDate(record["Kdy?_2"]),
            firstInvoiceDueDate: parseDate(record["Splatnost?"]),
            firstInvoicePaid: parseBoolean(record["Zaplaceno?"]),
            
            // Second invoice
            secondInvoiceAmount: parseFloat(record["2. zálohá faktura: částka"]),
            secondInvoiceDate: parseDate(record["Kdy?_3"]),
            secondInvoiceDueDate: parseDate(record["Splatnost?_1"]),
            secondInvoicePaid: parseBoolean(record["Zaplaceno?_1"]),
            
            // Final invoice
            finalInvoiceAmount: parseFloat(record["finální faktura: částka"]),
            finalInvoiceDate: parseDate(record["Kdy?_4"]),
            finalInvoiceDueDate: parseDate(record["Splatnost?_2"]),
            finalInvoicePaid: parseBoolean(record["Zaplaceno?_2"]),
            
            // Totals
            totalPriceIncVat: parseFloat(record["Celkem s DPH"]),
            
            // Flight consent
            flightConsentSent: parseBoolean(record["Souhlas s létáním poslán ANO/NE"]),
            flightConsentSentDate: parseDate(record["Kdy?_5"]),
            flightConsentSigned: parseBoolean(record["Souhlas klientem podepsán?"]),
            flightConsentSignedDate: parseDate(record["Kdy?_6"]),
            
            // FVE drawings
            fveDrawingsReceived: parseBoolean(record["Výkresy FVE doručeny ANO/NE?"]),
            fveDrawingsReceivedDate: parseDate(record["Kdy?_7"]),
            
            // Permission
            permissionRequired: parseBoolean(record["Je nutné žádat?"]),
            permissionRequested: parseBoolean(record["Žádost o OKL/OKP poslána? ANO/NE"]),
            permissionRequestedDate: parseDate(record["Kdy?_8"]),
            permissionRequestNumber: record["Číslo žádosti"] || null,
            permissionStatus: record["Schváleno? Výsledný stav."] || null,
            permissionValidUntil: parseDate(record["Platnost do?"]),
            
            // Pilot assignment
            pilotAssigned: parseBoolean(record["Předáno pilotovi? ANO/NE"]),
            pilotName: record["Jméno pilota"] || null,
            pilotAssignedDate: parseDate(record["Kdy?_9"]),
            expectedFlightDate: parseDate(record["Očekávaný termín letu?"]),
            
            // Photos
            photosTaken: parseBoolean(record["Nafoceno? ANO/NE"]),
            photosDate: parseDate(record["Kdy?_10"]),
            photosTime: record["Čas?"] || null,
            panelTemperature: parseFloat(record["Teplota panelu?"]),
            illumination: parseFloat(record["Osvit? Watt"]),
            photosUploaded: parseBoolean(record["Upload? ANO/NE"]),
            
            // Analysis
            analysisStarted: parseBoolean(record["Zahájen proces analýzy? ANO/NE"]),
            analysisStartedDate: parseDate(record["Kdy?_11"]),
            analysisCompleted: parseBoolean(record["Analyzováno?"]) || record["Analyzováno?"] === "Hotovo",
            analysisCompletedDate: parseDate(record["Kdy?_12"]),
            
            // Report
            reportCreated: parseBoolean(record["Vytvořen report? ANO/NE"]),
            reportSent: parseBoolean(record["Odesláno klientovi? ANO/NE"]),
            reportSentDate: parseDate(record["Kdy?_13"]),
            
            // Feedback
            feedbackReceived: parseBoolean(record["Zpětná vazba od klienta? ANO/NE"]),
            feedbackContent: record["Jaká?"] || null,
            
            // Status
            status: "Importováno",
          },
        create: {
            // Basic information
            ico: record["IČO"],
            companyName: record["Klient - jméno"],
            fveName: record["FVE - jméno"] || null,
            fveAddress: record["Adresa FVE"] || null,
            distanceKm: parseFloat(record["Vzdálenost km od sídla a zpět"]),
            installedPower: parseFloat(record["Instalovaný výkon"]),
            
            // Contact information
            contactPerson: record["Kontakt - jméno"] || null,
            phone: record["Kontakt - telefon"] || null,
            email: record["Kontakt - email"] || null,
            
            // Sales rep
            salesRep: {
              connect: {
                id: adminUser.id
              }
            },
            
            // Marketing and offers
            marketingBan: parseBoolean(record["Zákaz dalších marketingových oslovení?"]),
            offerSent: parseBoolean(record["Poslána ANO/NE"]),
            offerSentTo: record["Posláno kam?"] || null,
            offerSentDate: parseDate(record["Kdy?"]),
            offerApproved: parseBoolean(record["Souhlas s nabídkou ANO/NE"]),
            offerApprovedDate: parseDate(record["Kdy?_1"]),
            offerRejectionReason: record["Pokud NE tak proč?"] || null,
            
            // Pricing
            totalPriceExVat: parseFloat(record["Cena uvedená na nabídce bez DPH?"]),
            analysisPrice: parseFloat(record["Z toho cena za vyhodnocení dat bez DPH?"]),
            dataCollectionPrice: parseFloat(record["Z toho cena za sběr dat bez DPH?"]),
            transportPrice: parseFloat(record["Samostatně cena dopravy - 15 kč/km - celkem bez DPH?"]),
            marginGroup: record["Maržová skupina A-B-C"] || null,
            
            // Multiple inspections
            multipleInspections: parseBoolean(record["Domluveno na více inspekcí?"]),
            inspectionDeadline: parseDate(record["Do kdy?"]),
            
            // Contract
            customContract: parseBoolean(record["Individuální smlouva? ANO/NE"]),
            contractSignedDate: parseDate(record["Podepsáno kdy?"]),
            
            // Invoicing
            readyForBilling: parseBoolean(record["Připraveno k fakturaci"]),
            
            // First invoice
            firstInvoiceAmount: parseFloat(record["1. zálohá faktura: částka"]),
            firstInvoiceDate: parseDate(record["Kdy?_2"]),
            firstInvoiceDueDate: parseDate(record["Splatnost?"]),
            firstInvoicePaid: parseBoolean(record["Zaplaceno?"]),
            
            // Second invoice
            secondInvoiceAmount: parseFloat(record["2. zálohá faktura: částka"]),
            secondInvoiceDate: parseDate(record["Kdy?_3"]),
            secondInvoiceDueDate: parseDate(record["Splatnost?_1"]),
            secondInvoicePaid: parseBoolean(record["Zaplaceno?_1"]),
            
            // Final invoice
            finalInvoiceAmount: parseFloat(record["finální faktura: částka"]),
            finalInvoiceDate: parseDate(record["Kdy?_4"]),
            finalInvoiceDueDate: parseDate(record["Splatnost?_2"]),
            finalInvoicePaid: parseBoolean(record["Zaplaceno?_2"]),
            
            // Totals
            totalPriceIncVat: parseFloat(record["Celkem s DPH"]),
            
            // Flight consent
            flightConsentSent: parseBoolean(record["Souhlas s létáním poslán ANO/NE"]),
            flightConsentSentDate: parseDate(record["Kdy?_5"]),
            flightConsentSigned: parseBoolean(record["Souhlas klientem podepsán?"]),
            flightConsentSignedDate: parseDate(record["Kdy?_6"]),
            
            // FVE drawings
            fveDrawingsReceived: parseBoolean(record["Výkresy FVE doručeny ANO/NE?"]),
            fveDrawingsReceivedDate: parseDate(record["Kdy?_7"]),
            
            // Permission
            permissionRequired: parseBoolean(record["Je nutné žádat?"]),
            permissionRequested: parseBoolean(record["Žádost o OKL/OKP poslána? ANO/NE"]),
            permissionRequestedDate: parseDate(record["Kdy?_8"]),
            permissionRequestNumber: record["Číslo žádosti"] || null,
            permissionStatus: record["Schváleno? Výsledný stav."] || null,
            permissionValidUntil: parseDate(record["Platnost do?"]),
            
            // Pilot assignment
            pilotAssigned: parseBoolean(record["Předáno pilotovi? ANO/NE"]),
            pilotName: record["Jméno pilota"] || null,
            pilotAssignedDate: parseDate(record["Kdy?_9"]),
            expectedFlightDate: parseDate(record["Očekávaný termín letu?"]),
            
            // Photos
            photosTaken: parseBoolean(record["Nafoceno? ANO/NE"]),
            photosDate: parseDate(record["Kdy?_10"]),
            photosTime: record["Čas?"] || null,
            panelTemperature: parseFloat(record["Teplota panelu?"]),
            illumination: parseFloat(record["Osvit? Watt"]),
            photosUploaded: parseBoolean(record["Upload? ANO/NE"]),
            
            // Analysis
            analysisStarted: parseBoolean(record["Zahájen proces analýzy? ANO/NE"]),
            analysisStartedDate: parseDate(record["Kdy?_11"]),
            analysisCompleted: parseBoolean(record["Analyzováno?"]) || record["Analyzováno?"] === "Hotovo",
            analysisCompletedDate: parseDate(record["Kdy?_12"]),
            
            // Report
            reportCreated: parseBoolean(record["Vytvořen report? ANO/NE"]),
            reportSent: parseBoolean(record["Odesláno klientovi? ANO/NE"]),
            reportSentDate: parseDate(record["Kdy?_13"]),
            
            // Feedback
            feedbackReceived: parseBoolean(record["Zpětná vazba od klienta? ANO/NE"]),
            feedbackContent: record["Jaká?"] || null,
            
            // Status
            status: "Nový",
            },
        });
        
        results.push(client);
      } catch (error) {
        console.error(`Error importing client ${record["Klient - jméno"]}:`, error);
        // Continue with next record
      }
    }
    
    return NextResponse.json({
      message: "Import successful",
      imported: results.length,
      total: records.length,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to process CSV file: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}