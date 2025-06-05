import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createLog } from "@/lib/logging";

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params before accessing
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: "Invalid client ID" }, { status: 400 });
    }

    const clientId = Number(id);
    if (isNaN(clientId)) {
      return NextResponse.json({ message: "Invalid client ID format" }, { status: 400 });
    }

    // Fetch client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        ico: true,
        parentCompany: true,
        parentCompanyIco: true,
        dataBox: true,
        fveName: true,
        installedPower: true,
        fveAddress: true,
        gpsCoordinates: true,
        distanceKm: true,
        serviceCompany: true,
        serviceCompanyIco: true,
        contactPerson: true,
        phone: true,
        email: true,
        contactRole: true,
        marketingBan: true,
        offerSent: true,
        offerSentTo: true,
        offerSentDate: true,
        offerApproved: true,
        offerApprovedDate: true,
        offerRejectionReason: true,
        priceExVat: true,
        dataAnalysisPrice: true,
        dataCollectionPrice: true,
        transportationPrice: true,
        marginGroup: true,
        multipleInspections: true,
        inspectionDeadline: true,
        customContract: true,
        contractSignedDate: true,
        readyForBilling: true,
        firstInvoiceAmount: true,
        firstInvoiceDate: true,
        firstInvoiceDueDate: true,
        firstInvoicePaid: true,
        secondInvoiceAmount: true,
        secondInvoiceDate: true,
        secondInvoiceDueDate: true,
        secondInvoicePaid: true,
        finalInvoiceAmount: true,
        finalInvoiceDate: true,
        finalInvoiceDueDate: true,
        finalInvoicePaid: true,
        totalPriceExVat: true,
        totalPriceIncVat: true,
        flightConsentSent: true,
        flightConsentSentDate: true,
        flightConsentSigned: true,
        flightConsentSignedDate: true,
        fveDrawingsReceived: true,
        fveDrawingsReceivedDate: true,
        permissionRequired: true,
        permissionRequested: true,
        permissionRequestedDate: true,
        permissionRequestNumber: true,
        permissionStatus: true,
        permissionValidUntil: true,
        assignedToPilot: true,
        pilotName: true,
        pilotAssignedDate: true,
        expectedFlightDate: true,
        photosTaken: true,
        photosDate: true,
        photosTime: true,
        panelTemperature: true,
        irradiance: true,
        weather: true,
        windSpeed: true,
        dataUploaded: true,
        analysisStarted: true,
        analysisStartDate: true,
        analysisCompleted: true,
        analysisCompletedDate: true,
        reportCreated: true,
        reportSent: true,
        reportSentDate: true,
        feedbackReceived: true,
        feedbackContent: true,
        status: true,
        notes: true,
        clientType: true,
        salesRep: true,
        salesRepEmail: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }
  
    // Continue with the rest of your logic
    // Get current user 
    const user = await getUser(request as NextRequest);
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
        { message: "You don't have permission to view client details" },
        { status: 403 }
      );
    }
    
    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    
    // Categorize client data
    const categorizedData: Record<string, Record<string, any>> = {};
    
    // Initialize categories
    Object.values(FIELD_CATEGORIES).forEach(category => {
      if (!categorizedData[category]) {
        categorizedData[category] = {};
      }
    });
    
    // Populate categories with client data
    Object.entries(client).forEach(([field, value]) => {
      const category = FIELD_CATEGORIES[field as keyof typeof FIELD_CATEGORIES];
      if (category) {
        const displayName = FIELD_DISPLAY_NAMES[field] || field;
        categorizedData[category][displayName] = value;
      }
    });
    
    // Add sales rep to contacts category if available
    if (client.salesRep) {
      categorizedData["kontakty"]["Obchodní zástupce"] = client.salesRep;
      categorizedData["kontakty"]["Email obchodního zástupce"] = client.salesRepEmail;
    }
    
    // Log the access
    await createLog(
      "GET_CLIENT_CATEGORIZED",
      String(user.id),
      `Viewed categorized client data: ${client.companyName}`,
      "Client",
      String(clientId),
      "info"
    );
    
    return NextResponse.json({
      client: {
        id: client.id,
        companyName: client.companyName,
        ico: client.ico
      },
      categorizedData
    });
  } catch (error) {
    console.error("Error fetching categorized client data:", error);
    return NextResponse.json(
      { message: "Error fetching client data", error: String(error) },
      { status: 500 }
    );
  }
}