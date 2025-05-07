"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { CsvImport } from "@/components/csv-import";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { AddClientDialog } from "./AddClientDialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Define the client type based on the updated schema
type Client = {
  id: string;
  ico: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string | null;
  salesRep?: {
    name: string;
    email: string;
  };
  // FVE Information
  fveName: string | null;
  fveAddress: string | null;
  distanceKm: number | null;
  installedPower: number | null;
  
  // Marketing and Offers
  marketingBan: boolean | null;
  offerSent: boolean | null;
  offerSentTo: string | null;
  offerSentDate: string | null;
  offerApproved: boolean | null;
  offerApprovedDate: string | null;
  offerRejectionReason: string | null;
  
  // Pricing
  offerPrice: number | null;
  dataEvalPrice: number | null;
  dataCollectionPrice: number | null;
  transportPrice: number | null;
  marginGroup: string | null;
  
  // Multiple inspections
  multipleInspections: boolean | null;
  inspectionDeadline: string | null;
  
  // Contract
  customContract: boolean | null;
  contractSignedDate: string | null;
  
  // Invoicing
  readyForBilling: boolean | null;
  
  // First invoice
  firstInvoiceAmount: number | null;
  firstInvoiceDate: string | null;
  firstInvoiceDueDate: string | null;
  firstInvoicePaid: boolean | null;
  
  // Second invoice
  secondInvoiceAmount: number | null;
  secondInvoiceDate: string | null;
  secondInvoiceDueDate: string | null;
  secondInvoicePaid: boolean | null;
  
  // Final invoice
  finalInvoiceAmount: number | null;
  finalInvoiceDate: string | null;
  finalInvoiceDueDate: string | null;
  finalInvoicePaid: boolean | null;
  
  // Totals
  totalPriceExVat: number | null;
  totalPriceIncVat: number | null;
  
  // Flight consent
  flightConsentSent: boolean | null;
  flightConsentSentDate: string | null;
  flightConsentSigned: boolean | null;
  flightConsentSignedDate: string | null;
  
  // FVE drawings
  fveDrawingsReceived: boolean | null;
  fveDrawingsReceivedDate: string | null;
  
  // Permission
  permissionRequired: boolean | null;
  permissionRequested: boolean | null;
  permissionRequestedDate: string | null;
  permissionRequestNumber: string | null;
  permissionStatus: string | null;
  permissionValidUntil: string | null;
  
  // Pilot assignment
  assignedToPilot: boolean | null;
  pilotName: string | null;
  pilotAssignedDate: string | null;
  expectedFlightDate: string | null;
  
  // Photos
  photosTaken: boolean | null;
  photosDate: string | null;
  photosTime: string | null;
  panelTemperature: string | null;
  irradiance: string | null;
  dataUploaded: boolean | null;
  
  // Analysis
  analysisStarted: boolean | null;
  analysisStartDate: string | null;
  analysisCompleted: boolean | null;
  analysisCompletedDate: string | null;
  
  // Report
  reportCreated: boolean | null;
  reportSent: boolean | null;
  reportSentDate: string | null;
  
  // Feedback
  feedbackReceived: boolean | null;
  feedbackContent: string | null;
};

// Change the component definition to use forwardRef
export const ClientsTable = forwardRef((props, ref) => {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [showAddClient, setShowAddClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Add this line to define searchTerm
  
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/clients");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Kontrola na chybu 403 a zobrazení specifické hlášky
        if (response.status === 403) {
          throw new Error("Nemáte oprávnění k této akci");
        } else {
          throw new Error(errorData.message || `Error ${response.status}: Failed to fetch clients`);
        }
      }
      
      const data = await response.json();
      setClients(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err instanceof Error ? err.message : "Nepodařilo se načíst klienty");
      toast.error(err instanceof Error ? err.message : "Nepodařilo se načíst klienty");
    } finally {
      setLoading(false);
    }
  };

  // Expose the fetchClients method to the parent component via ref
  useImperativeHandle(ref, () => ({
    fetchClients
  }));

  useEffect(() => {
    fetchClients();
  }, []);

  // Filter clients based on search term
  const filteredClients = clients.filter((client) =>
    Object.entries(client).some(
      ([key, value]) => {
        if (key === 'salesRep' && value && typeof value === 'object') {
          return Object.values(value).some(
            (nestedValue) => 
              nestedValue && 
              nestedValue.toString().toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return value && 
               typeof value !== 'object' &&
               value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      }
    )
  );

  const handleImportSuccess = () => {
    fetchClients();
    setShowImport(false);
  };

  if (loading) {
    return <div className="text-center py-4">Načítání klientů...</div>;
  }

  // Add this to your render method where you display the clients table
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
        <p className="text-red-700 dark:text-red-300 mb-2">{error}</p>
        <Button variant="outline" onClick={fetchClients}>
          Zkusit znovu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Hledat klienty..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport(!showImport)}>
            {showImport ? "Zrušit import" : "Import CSV"}
          </Button>
          <Button onClick={() => setShowAddClient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat klienta
          </Button>
        </div>
      </div>

      {showImport && (
        <div className="p-4 border rounded-md bg-muted/50">
          <h3 className="text-lg font-medium mb-2">Import klientů z CSV</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Vyberte CSV soubor s daty klientů pro import do systému.
          </p>
          <CsvImport onImportSuccess={handleImportSuccess} />
        </div>
      )}

      {showAddClient && (
        <AddClientDialog
          open={showAddClient}
          onOpenChange={setShowAddClient}
          onSuccess={() => fetchClients()}
        />
      )}

      <Tabs defaultValue="basic" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Základní informace</TabsTrigger>
          <TabsTrigger value="offers">Nabídky</TabsTrigger>
          <TabsTrigger value="invoicing">Fakturace</TabsTrigger>
          <TabsTrigger value="flight">Let a dokumenty</TabsTrigger>
          <TabsTrigger value="analysis">Analýza a report</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="rounded-md border">
          <Table>
            <TableCaption>Seznam klientů - základní informace</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>IČO</TableHead>
                <TableHead>FVE</TableHead>
                <TableHead>Kontaktní osoba</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Obchodník</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>{client.ico}</TableCell>
                    <TableCell>{client.fveName || "-"}</TableCell>
                    <TableCell>{client.contactPerson}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.salesRep?.name}</TableCell>
                    <TableCell>{client.status}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Žádní klienti nebyli nalezeni
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="offers" className="rounded-md border">
          <Table>
            <TableCaption>Seznam klientů - nabídky</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>Zákaz marketingu</TableHead>
                <TableHead>Nabídka odeslána</TableHead>
                <TableHead>Kam</TableHead>
                <TableHead>Kdy</TableHead>
                <TableHead>Souhlas</TableHead>
                <TableHead>Cena bez DPH</TableHead>
                <TableHead>Skupina</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.marketingBan} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator value={client.offerSent} />
                    </TableCell>
                    <TableCell>{client.offerSentTo || "-"}</TableCell>
                    <TableCell>{formatDate(client.offerSentDate)}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.offerApproved} />
                    </TableCell>
                    <TableCell>{client.offerPrice ? `${client.offerPrice.toLocaleString()} Kč` : "-"}</TableCell>
                    <TableCell>{client.marginGroup || "-"}</TableCell>
                    <TableCell className="text-right">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Žádní klienti nebyli nalezeni
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="invoicing" className="rounded-md border">
          <Table>
            <TableCaption>Seznam klientů - fakturace</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>K fakturaci</TableHead>
                <TableHead>1. záloha</TableHead>
                <TableHead>Zaplaceno</TableHead>
                <TableHead>2. záloha</TableHead>
                <TableHead>Zaplaceno</TableHead>
                <TableHead>Finální faktura</TableHead>
                <TableHead>Zaplaceno</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.readyForBilling} />
                    </TableCell>
                    <TableCell>{client.firstInvoiceAmount ? `${client.firstInvoiceAmount.toLocaleString()} Kč` : "-"}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.firstInvoicePaid} />
                    </TableCell>
                    <TableCell>{client.secondInvoiceAmount ? `${client.secondInvoiceAmount.toLocaleString()} Kč` : "-"}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.secondInvoicePaid} />
                    </TableCell>
                    <TableCell>{client.finalInvoiceAmount ? `${client.finalInvoiceAmount.toLocaleString()} Kč` : "-"}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.finalInvoicePaid} />
                    </TableCell>
                    <TableCell className="text-right">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Žádní klienti nebyli nalezeni
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="flight" className="rounded-md border">
          <Table>
            <TableCaption>Seznam klientů - let a dokumenty</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>Souhlas s létáním</TableHead>
                <TableHead>Výkresy FVE</TableHead>
                <TableHead>Žádost o povolení</TableHead>
                <TableHead>Status povolení</TableHead>
                <TableHead>Pilot</TableHead>
                <TableHead>Nafoceno</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.flightConsentSigned} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator value={client.fveDrawingsReceived} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator value={client.permissionRequested} />
                    </TableCell>
                    <TableCell>{client.permissionStatus || "-"}</TableCell>
                    <TableCell>{client.pilotName || "-"}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.photosTaken} />
                    </TableCell>
                    <TableCell>{formatDate(client.photosDate)}</TableCell>
                    <TableCell className="text-right">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Žádní klienti nebyli nalezeni
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="analysis" className="rounded-md border">
          <Table>
            <TableCaption>Seznam klientů - analýza a report</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>Analýza zahájena</TableHead>
                <TableHead>Analýza dokončena</TableHead>
                <TableHead>Report vytvořen</TableHead>
                <TableHead>Report odeslán</TableHead>
                <TableHead>Datum odeslání</TableHead>
                <TableHead>Zpětná vazba</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.analysisStarted} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator value={client.analysisCompleted} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator value={client.reportCreated} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator value={client.reportSent} />
                    </TableCell>
                    <TableCell>{formatDate(client.reportSentDate)}</TableCell>
                    <TableCell>
                      <StatusIndicator value={client.feedbackReceived} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Žádní klienti nebyli nalezeni
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
});