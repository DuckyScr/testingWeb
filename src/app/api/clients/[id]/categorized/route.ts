import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createLog } from "@/lib/logging";
import { Prisma } from '@prisma/client';

// Get all scalar fields from Prisma Client to use for dynamic selection
const allClientScalarFields = Prisma.dmmf.datamodel.models.find(m => m.name === 'Client')?.fields
  .filter(f => f.kind === 'scalar')
  .map(f => f.name) || [];

// Define the mapping between database fields and categories
const FIELD_CATEGORIES = {
  // Základní informace
  companyName: "základní_informace",
  ico: "základní_informace",
  parentCompany: "základní_informace",
  parentCompanyIco: "základní_informace",
  dataBox: "základní_informace",
  fveName: "základní_informace",
  installedPower: "základní_informace",
  fveAddress: "základní_informace",
  gpsCoordinates: "základní_informace",
  distanceKm: "základní_informace",
  serviceCompany: "základní_informace",
  serviceCompanyIco: "základní_informace",
  
  // Kontakty
  contactPerson: "kontakty",
  phone: "kontakty",
  email: "kontakty",
  contactRole: "kontakty",
  
  // Nabídka a smlouva
  marketingBan: "nabídka_a_smlouva",
  offerSent: "nabídka_a_smlouva",
  offerSentTo: "nabídka_a_smlouva",
  offerSentDate: "nabídka_a_smlouva",
  offerApproved: "nabídka_a_smlouva",
  offerApprovedDate: "nabídka_a_smlouva",
  offerRejectionReason: "nabídka_a_smlouva",
  priceExVat: "nabídka_a_smlouva",
  dataAnalysisPrice: "nabídka_a_smlouva",
  dataCollectionPrice: "nabídka_a_smlouva",
  transportationPrice: "nabídka_a_smlouva",
  marginGroup: "nabídka_a_smlouva",
  multipleInspections: "nabídka_a_smlouva",
  inspectionDeadline: "nabídka_a_smlouva",
  customContract: "nabídka_a_smlouva",
  contractSignedDate: "nabídka_a_smlouva",
  readyForBilling: "nabídka_a_smlouva",
  
  // Fakturace
  firstInvoiceAmount: "fakturace",
  firstInvoiceDate: "fakturace",
  firstInvoiceDueDate: "fakturace",
  firstInvoicePaid: "fakturace",
  secondInvoiceAmount: "fakturace",
  secondInvoiceDate: "fakturace",
  secondInvoiceDueDate: "fakturace",
  secondInvoicePaid: "fakturace",
  finalInvoiceAmount: "fakturace",
  finalInvoiceDate: "fakturace",
  finalInvoiceDueDate: "fakturace",
  finalInvoicePaid: "fakturace",
  totalPriceExVat: "fakturace",
  totalPriceIncVat: "fakturace",
  
  // Dokumenty od klienta a povolení k letu
  flightConsentSent: "dokumenty_od_klienta",
  flightConsentSentDate: "dokumenty_od_klienta",
  flightConsentSigned: "dokumenty_od_klienta",
  flightConsentSignedDate: "dokumenty_od_klienta",
  fveDrawingsReceived: "dokumenty_od_klienta",
  fveDrawingsReceivedDate: "dokumenty_od_klienta",
  permissionRequired: "dokumenty_od_klienta",
  permissionRequested: "dokumenty_od_klienta",
  permissionRequestedDate: "dokumenty_od_klienta",
  permissionRequestNumber: "dokumenty_od_klienta",
  permissionStatus: "dokumenty_od_klienta",
  permissionValidUntil: "dokumenty_od_klienta",
  
  // Sběr dat - pilot
  assignedToPilot: "sběr_dat_pilot",
  pilotName: "sběr_dat_pilot",
  pilotAssignedDate: "sběr_dat_pilot",
  expectedFlightDate: "sběr_dat_pilot",
  photosTaken: "sběr_dat_pilot",
  photosDate: "sběr_dat_pilot",
  photosTime: "sběr_dat_pilot",
  panelTemperature: "sběr_dat_pilot",
  irradiance: "sběr_dat_pilot",
  weather: "sběr_dat_pilot",
  windSpeed: "sběr_dat_pilot",
  dataUploaded: "sběr_dat_pilot",
  
  // Analýza a report
  analysisStarted: "analýza_a_report",
  analysisStartDate: "analýza_a_report",
  analysisCompleted: "analýza_a_report",
  analysisCompletedDate: "analýza_a_report",
  reportCreated: "analýza_a_report",
  reportSent: "analýza_a_report",
  reportSentDate: "analýza_a_report",
  
  // Zákaznická zkušenost
  feedbackReceived: "zákaznická_zkušenost",
  feedbackContent: "zákaznická_zkušenost"
};

// Field display names mapping
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  companyName: "Název společnosti",
  ico: "IČO",
  parentCompany: "Mateřská firma",
  parentCompanyIco: "IČO mateřské firmy",
  dataBox: "Datová schránka",
  fveName: "Název FVE",
  installedPower: "Instalovaný výkon",
  fveAddress: "Adresa FVE",
  gpsCoordinates: "GPS souřadnice",
  distanceKm: "Vzdálenost tam a zpět (km)",
  serviceCompany: "Servisní firma",
  serviceCompanyIco: "IČO servisní firmy",
  
  contactPerson: "Kontaktní osoba",
  phone: "Telefon",
  email: "Email",
  contactRole: "Funkce kontaktu",
  
  marketingBan: "Zákaz marketingových oslovení",
  offerSent: "Nabídka odeslána",
  offerSentTo: "Nabídka odeslána kam",
  offerSentDate: "Datum odeslání nabídky",
  offerApproved: "Nabídka schválena",
  offerApprovedDate: "Datum schválení nabídky",
  offerRejectionReason: "Důvod odmítnutí nabídky",
  priceExVat: "Cena bez DPH",
  dataAnalysisPrice: "Cena za vyhodnocení dat",
  dataCollectionPrice: "Cena za sběr dat",
  transportationPrice: "Cena dopravy",
  marginGroup: "Maržová skupina",
  multipleInspections: "Více inspekcí",
  inspectionDeadline: "Termín inspekce",
  customContract: "Individuální smlouva",
  contractSignedDate: "Datum podpisu smlouvy",
  readyForBilling: "Připraveno k fakturaci",
  
  firstInvoiceAmount: "Částka první zálohy",
  firstInvoiceDate: "Datum první faktury",
  firstInvoiceDueDate: "Splatnost první faktury",
  firstInvoicePaid: "První faktura zaplacena",
  secondInvoiceAmount: "Částka druhé zálohy",
  secondInvoiceDate: "Datum druhé faktury",
  secondInvoiceDueDate: "Splatnost druhé faktury",
  secondInvoicePaid: "Druhá faktura zaplacena",
  finalInvoiceAmount: "Částka finální faktury",
  finalInvoiceDate: "Datum finální faktury",
  finalInvoiceDueDate: "Splatnost finální faktury",
  finalInvoicePaid: "Finální faktura zaplacena",
  totalPriceExVat: "Celkem bez DPH",
  totalPriceIncVat: "Celkem s DPH",
  
  flightConsentSent: "Souhlas s létáním odeslán",
  flightConsentSentDate: "Datum odeslání souhlasu",
  flightConsentSigned: "Souhlas podepsán",
  flightConsentSignedDate: "Datum podpisu souhlasu",
  fveDrawingsReceived: "Výkresy FVE doručeny",
  fveDrawingsReceivedDate: "Datum doručení výkresů",
  permissionRequired: "Nutné žádat o OKL",
  permissionRequested: "Žádost o OKL/OKP odeslána",
  permissionRequestedDate: "Datum odeslání žádosti",
  permissionRequestNumber: "Číslo žádosti",
  permissionStatus: "Status žádosti",
  permissionValidUntil: "Platnost do",
  
  assignedToPilot: "Předáno pilotovi",
  pilotName: "Jméno pilota",
  pilotAssignedDate: "Datum předání pilotovi",
  expectedFlightDate: "Očekávaný termín letu",
  photosTaken: "Fotografie pořízeny",
  photosDate: "Datum pořízení fotografií",
  photosTime: "Čas pořízení fotografií",
  panelTemperature: "Teplota panelu",
  irradiance: "Osvit (Watt)",
  weather: "Počasí",
  windSpeed: "Rychlost větru (m/s)",
  dataUploaded: "Data nahrána",
  
  analysisStarted: "Analýza zahájena",
  analysisStartDate: "Datum zahájení analýzy",
  analysisCompleted: "Analýza dokončena",
  analysisCompletedDate: "Datum dokončení analýzy",
  reportCreated: "Report vytvořen",
  reportSent: "Report odeslán",
  reportSentDate: "Datum odeslání reportu",
  
  feedbackReceived: "Zpětná vazba obdržena",
  feedbackContent: "Obsah zpětné vazby"
};

// Define fields for "základní_informace" category (copied from route.ts)
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

// Define fields for each category
const CATEGORY_FIELDS: Record<string, { field: string, label: string, type: string }[]> = {
  "kontakty": [
    { field: "contactPerson", label: "Kontaktní osoba", type: "text" },
    { field: "phone", label: "Telefon", type: "phone" },
    { field: "email", label: "Email", type: "email" },
    { field: "contactRole", label: "Funkce kontaktu", type: "text" },
    { field: "salesRepId", label: "Obchodní zástupce", type: "select" }
  ],
  // ... other categories can be added if needed
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = Number(params.id);
    
    if (isNaN(clientId)) {
      return NextResponse.json({ message: "Invalid client ID format" }, { status: 400 });
    }

    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // First, fetch only the salesRepId and companyName to determine access
    const clientCheck = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        salesRepId: true,
      },
    });

    if (!clientCheck) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    const isAssignedSalesRep = user.id === clientCheck.salesRepId;
    const isAdmin = user.role === "ADMIN";

    let client;
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

    // Determine which fields to fetch based on permissions
    if (clientCheck.salesRepId && !isAssignedSalesRep && !isAdmin) {
      // If not authorized for full access, only add basic info fields to selectFields
      ZAKLADNI_INFORMACE_FIELDS.forEach(field => {
        selectFields[field as keyof typeof selectFields] = true; // Use type assertion to allow dynamic property assignment
      });
    } else {
      // If authorized, add all scalar fields to selectFields
      allClientScalarFields.forEach(field => {
        selectFields[field as keyof typeof selectFields] = true;
      });
    }

    // Fetch the client data with the determined select fields
    client = await prisma.client.findUnique({
      where: { id: clientId },
      select: selectFields,
    });
    
    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    // Categorize the client data
    const categorizedData: Record<string, any> = {};
    for (const key in client) {
      // @ts-ignore - type comes from Prisma and is safe
      const category = FIELD_CATEGORIES[key];
      if (category) {
        if (!categorizedData[category]) {
          categorizedData[category] = {};
        }
        // @ts-ignore - type comes from Prisma and is safe
        categorizedData[category][key] = client[key];
      }
    }

    // Handle salesRepId specifically for frontend as it's not in FIELD_CATEGORIES
    if (client.salesRepId) {
      if (!categorizedData["kontakty"]) {
        categorizedData["kontakty"] = {};
      }
      categorizedData["kontakty"].salesRepId = client.salesRepId;
      if (client.salesRep) {
        // Also include salesRep details for display if available
        categorizedData["kontakty"].salesRep = client.salesRep;
        categorizedData["kontakty"].salesRepEmail = client.salesRep.email; // Ensure email is passed for display
      }
    } else {
      // If no salesRepId, ensure it's explicitly null/undefined in contacts
      if (categorizedData["kontakty"]) {
        categorizedData["kontakty"].salesRepId = null;
        categorizedData["kontakty"].salesRep = null;
        categorizedData["kontakty"].salesRepEmail = null;
      }
    }

    // Create a client object with core fields and categorized data
    const responseClient = {
      id: client.id,
      companyName: client.companyName,
      ico: client.ico, // Include ICO as it's a core info
      // Add any other top-level fields needed for client overview
      salesRepId: client.salesRepId,
      salesRep: client.salesRep,
      salesRepEmail: client.salesRep?.email || null,
    };

    await createLog(
      "GET_CLIENT_CATEGORIZED",
      String(user.id),
      `Viewed categorized client: ${client.companyName}`,
      "Client",
      params.id,
      "info"
    );

    return NextResponse.json({ client: responseClient, categorizedData });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching categorized client", error: String(error) },
      { status: 500 }
    );
  }
}