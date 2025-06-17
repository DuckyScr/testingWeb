"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { CsvImport } from "@/components/csv-import";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { AddClientDialog } from "@/components/AddClientDialog";
import { Download, ExternalLink, Plus } from "lucide-react";
import * as XLSX from 'xlsx';
import { XLSXImport } from "@/components/xlsx-import";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define client interface based on CSV structure
interface Client {
  id: string;
  companyName: string;
  ico: string;
  fveName: string;
  installedPower: string;
  fveAddress: string;
  distance: string;
  contactPerson: string;
  phone: string;
  email: string;
  contactRole: string;
  salesRep: string;
  marketingBan: boolean;
  offerSent: boolean;
  offerSentTo: string;
  offerSentDate: string;
  offerApproved: boolean;
  offerApprovedDate: string;
  offerRejectionReason: string;
  offerPrice: string;
  dataEvalPrice: string;
  dataCollectionPrice: string;
  transportPrice: string;
  marginGroup: string;
  multipleInspections: boolean;
  inspectionDeadline: string;
  customContract: boolean;
  contractSignedDate: string;
  readyForBilling: boolean;
  // Add other fields as needed
  status?: string;
}

// Define the categories from the CSV
const CATEGORIES = [
  "základní_informace",
  "kontakty",
  "nabídka_a_smlouva",
  "fakturace",
  "dokumenty_od_klienta",
  "sběr_dat_pilot",
  "analýza_a_report",
  "zákaznická_zkušenost"
];

// Map for display names
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "základní_informace": "Základní informace",
  "kontakty": "Kontakty",
  "nabídka_a_smlouva": "Nabídka a smlouva",
  "fakturace": "Fakturace",
  "dokumenty_od_klienta": "Dokumenty od klienta a povolení k letu",
  "sběr_dat_pilot": "Sběr dat - pilot",
  "analýza_a_report": "Analýza a report",
  "zákaznická_zkušenost": "Zákaznická zkušenost"
};

// Define fields for each category
const CATEGORY_FIELDS: Record<string, { field: string, label: string }[]> = {
  "základní_informace": [
    { field: "companyName", label: "Název společnosti" },
    { field: "ico", label: "IČO" },
    { field: "parentCompany", label: "Mateřská firma" },
    { field: "parentCompanyIco", label: "IČO mateřské firmy" },
    { field: "dataBox", label: "Datová schránka" },
    { field: "fveName", label: "Název FVE" },
    { field: "installedPower", label: "Instalovaný výkon" },
    { field: "fveAddress", label: "Adresa FVE" },
    { field: "gpsCoordinates", label: "GPS souřadnice" },
    { field: "distanceKm", label: "Vzdálenost tam a zpět (km)" },
    { field: "serviceCompany", label: "Servisní firma" },
    { field: "serviceCompanyIco", label: "IČO servisní firmy" }
  ],
  "kontakty": [
    { field: "contactPerson", label: "Kontaktní osoba" },
    { field: "phone", label: "Telefon" },
    { field: "email", label: "Email" },
    { field: "contactRole", label: "Funkce kontaktu" },
    { field: "salesRep", label: "Obchodní zástupce" }
  ],
  "nabídka_a_smlouva": [
    { field: "marketingBan", label: "Zákaz marketingových oslovení" },
    { field: "offerSent", label: "Nabídka odeslána" },
    { field: "offerSentTo", label: "Nabídka odeslána kam" },
    { field: "offerSentDate", label: "Datum odeslání nabídky" },
    { field: "offerApproved", label: "Nabídka schválena" },
    { field: "offerApprovedDate", label: "Datum schválení nabídky" },
    { field: "offerRejectionReason", label: "Důvod odmítnutí nabídky" },
    { field: "offerPrice", label: "Cena bez DPH" },
    { field: "dataEvalPrice", label: "Cena za vyhodnocení dat" },
    { field: "dataCollectionPrice", label: "Cena za sběr dat" },
    { field: "transportPrice", label: "Cena dopravy" },
    { field: "marginGroup", label: "Maržová skupina" },
    { field: "multipleInspections", label: "Více inspekcí" },
    { field: "inspectionDeadline", label: "Termín inspekce" },
    { field: "customContract", label: "Individuální smlouva" },
    { field: "contractSignedDate", label: "Datum podpisu smlouvy" },
    { field: "readyForBilling", label: "Připraveno k fakturaci" }
  ],
  "fakturace": [
    { field: "firstInvoiceAmount", label: "Částka první zálohy" },
    { field: "firstInvoiceDate", label: "Datum první faktury" },
    { field: "firstInvoiceDueDate", label: "Splatnost první faktury" },
    { field: "firstInvoicePaid", label: "První faktura zaplacena" },
    { field: "secondInvoiceAmount", label: "Částka druhé zálohy" },
    { field: "secondInvoiceDate", label: "Datum druhé faktury" },
    { field: "secondInvoiceDueDate", label: "Splatnost druhé faktury" },
    { field: "secondInvoicePaid", label: "Druhá faktura zaplacena" },
    { field: "finalInvoiceAmount", label: "Částka finální faktury" },
    { field: "finalInvoiceDate", label: "Datum finální faktury" },
    { field: "finalInvoiceDueDate", label: "Splatnost finální faktury" },
    { field: "finalInvoicePaid", label: "Finální faktura zaplacena" },
    { field: "totalPriceExVat", label: "Celkem bez DPH" },
    { field: "totalPriceIncVat", label: "Celkem s DPH" }
  ],
  "dokumenty_od_klienta": [
    { field: "flightConsentSent", label: "Souhlas s létáním odeslán" },
    { field: "flightConsentSentDate", label: "Datum odeslání souhlasu" },
    { field: "flightConsentSigned", label: "Souhlas podepsán" },
    { field: "flightConsentSignedDate", label: "Datum podpisu souhlasu" },
    { field: "fveDrawingsReceived", label: "Výkresy FVE doručeny" },
    { field: "fveDrawingsReceivedDate", label: "Datum doručení výkresů" },
    { field: "permissionRequired", label: "Nutné žádat o OKL" },
    { field: "permissionRequested", label: "Žádost o OKL/OKP odeslána" },
    { field: "permissionRequestedDate", label: "Datum odeslání žádosti" },
    { field: "permissionRequestNumber", label: "Číslo žádosti" },
    { field: "permissionStatus", label: "Status žádosti" },
    { field: "permissionValidUntil", label: "Platnost do" }
  ],
  "sběr_dat_pilot": [
    { field: "assignedToPilot", label: "Předáno pilotovi" },
    { field: "pilotName", label: "Jméno pilota" },
    { field: "pilotAssignedDate", label: "Datum předání pilotovi" },
    { field: "expectedFlightDate", label: "Očekávaný termín letu" },
    { field: "photosTaken", label: "Fotografie pořízeny" },
    { field: "photosDate", label: "Datum pořízení fotografií" },
    { field: "photosTime", label: "Čas pořízení fotografií" },
    { field: "panelTemperature", label: "Teplota panelu" },
    { field: "irradiance", label: "Osvit (Watt)" },
    { field: "weather", label: "Počasí" },
    { field: "windSpeed", label: "Rychlost větru (m/s)" },
    { field: "dataUploaded", label: "Data nahrána" }
  ],
  "analýza_a_report": [
    { field: "analysisStarted", label: "Analýza zahájena" },
    { field: "analysisStartDate", label: "Datum zahájení analýzy" },
    { field: "analysisCompleted", label: "Analýza dokončena" },
    { field: "analysisCompletedDate", label: "Datum dokončení analýzy" },
    { field: "reportCreated", label: "Report vytvořen" },
    { field: "reportSent", label: "Report odeslán" },
    { field: "reportSentDate", label: "Datum odeslání reportu" }
  ],
  "zákaznická_zkušenost": [
    { field: "feedbackReceived", label: "Zpětná vazba obdržena" },
    { field: "feedbackContent", label: "Obsah zpětné vazby" }
  ]
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const clientsTableRef = useRef<{ fetchClients: () => Promise<void> }>(null);
  const canCreate = usePermission("create_client");
  const canExport = usePermission("view_clients");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", "10");
      
      if (search) {
        queryParams.append("search", search);
      }
      
      if (status) {
        queryParams.append("status", status);
      }
      
      const response = await fetch(`/api/clients?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      
      const data = await response.json();
      setClients(data.data || data); // Handle both paginated and non-paginated responses
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Add this useEffect to fetch clients when the component mounts
  useEffect(() => {
    fetchClients();
  }, [page, status]); // Re-fetch when page or status changes
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };
  
  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? '' : value);
    setPage(1);
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleAddClient = () => {
    setDialogOpen(true);
  };
  
  const handleAddClientSuccess = () => {
    setDialogOpen(false);
    if (clientsTableRef.current) {
      clientsTableRef.current.fetchClients();
    }
    toast.success("Client added successfully");
    window.location.reload();
  };
  
  const handleExportXLSX = async () => {
    try {
      // Fetch all clients without pagination
      const response = await fetch('/api/clients?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();
      const clients = data.data || data;

      // Prepare data with all fields
      const exportData = clients.map(client => {
        const exportRow = {};
        
        // Add all fields from all categories
        Object.entries(CATEGORY_FIELDS).forEach(([category, fields]) => {
          fields.forEach(field => {
            exportRow[field.field] = client[field.field];
          });
        });

        return exportRow;
      });

      // Create XLSX file
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      
      // Generate filename with timestamp
      const filename = `clients-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Export successful! File saved as ${filename}`);
    } catch (error) {
      console.error("Error exporting clients:", error);
      toast.error("Failed to export clients. Please try again.");
    }
  };

  // Helper function to format field values
  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    
    // Check if the field is a date field and format it
    if (field.includes("Date") && typeof value === "string") {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error(`Error parsing date for field ${field}: ${value}`, e);
      }
    }

    if (typeof value === "object" && value !== null) {
      // Handle salesRep object specifically
      if (field === 'salesRep') {
        return (value as { name?: string; email?: string }).name || (value as { name?: string; email?: string }).email || "Nepřiřazeno";
      }
      return String(value);
    }
    return String(value);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Klienti</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Správa a přehled všech klientů
          </p>
        </div>
        <div className="flex gap-2">
          {showImport && (
            <XLSXImport onImportSuccess={() => {
              setShowImport(false);
              if (clientsTableRef.current) {
                clientsTableRef.current.fetchClients();
              }
            }} />
          )}
          {canExport && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportXLSX}>
                <Download className="mr-2 h-4 w-4" />
                Export XLSX
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImport(!showImport)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import XLSX
              </Button>
              {canCreate && (
                <Button onClick={handleAddClient}>
                  <Plus className="mr-2 h-4 w-4" />
                  Přidat klienta
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Hledat podle názvu společnosti, kontaktu, emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny statusy</SelectItem>
              <SelectItem value="Nový">Nový</SelectItem>
              <SelectItem value="Kontaktován">Kontaktován</SelectItem>
              <SelectItem value="Nabídka odeslána">Nabídka odeslána</SelectItem>
              <SelectItem value="Nabídka schválena">Nabídka schválena</SelectItem>
              <SelectItem value="Smlouva podepsána">Smlouva podepsána</SelectItem>
              <SelectItem value="Dokončeno">Dokončeno</SelectItem>
              <SelectItem value="Zrušeno">Zrušeno</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Hledat</Button>
        </form>
      </div>
      
      {loading ? (
        <div className="text-center py-10">Načítání...</div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-2">
              {CATEGORIES.slice(0, 4).map((category) => (
                <TabsTrigger key={category} value={category}>
                  {CATEGORY_DISPLAY_NAMES[category]}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsList className="grid grid-cols-4 mb-4">
              {CATEGORIES.slice(4).map((category) => (
                <TabsTrigger key={category} value={category}>
                  {CATEGORY_DISPLAY_NAMES[category]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {CATEGORIES.map((category) => (
              <TabsContent key={`tab-content-${category}`} value={category}>
                <Card>
                  <CardHeader>
                    <CardTitle>{CATEGORY_DISPLAY_NAMES[category]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead key="client-name">Klient</TableHead>
                            {CATEGORY_FIELDS[category].map((field) => (
                              <TableHead key={`${category}-${field.field}`}>{field.label}</TableHead>
                            ))}
                            <TableHead key="actions">Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clients.length > 0 ? (
                            clients.map((client) => (
                              <TableRow key={`${category}-${client.id}`}>
                                <TableCell key={`${category}-${client.id}-name`} className="font-medium">{client.companyName}</TableCell>
                                {CATEGORY_FIELDS[category].map((field) => (
                                  <TableCell key={`${category}-${client.id}-${field.field}`}>
                                    {formatValue(client[field.field as keyof Client], field.field)}
                                  </TableCell>
                                ))}
                                <TableCell key={`${category}-${client.id}-actions`}>
                                  <Link href={`/dashboard/clients/${client.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow key={`${category}-empty`}>
                              <TableCell colSpan={CATEGORY_FIELDS[category].length + 2} className="text-center py-4">
                                Žádní klienti nebyli nalezeni
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
      
      <AddClientDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSuccess={handleAddClientSuccess}
      />
    </div>
  );
}