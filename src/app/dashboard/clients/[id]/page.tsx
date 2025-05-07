"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, X, Trash2 } from "lucide-react";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [editedClient, setEditedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/clients/${params.id}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error ${response.status}: Failed to fetch client details`);
        }
        
        const data = await response.json();
        setClient(data);
        setEditedClient(data);
      } catch (err) {
        console.error("Error fetching client details:", err);
        setError(err instanceof Error ? err.message : "Nepodařilo se načíst detaily klienta");
        toast.error(err instanceof Error ? err.message : "Nepodařilo se načíst detaily klienta");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchClientDetails();
    }
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedClient((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedClient((prev: any) => ({
      ...prev,
      [name]: value === "" ? null : Number(value)
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setEditedClient((prev: any) => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedClient((prev: any) => ({
      ...prev,
      [name]: value === "" ? null : value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedClient),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Kontrola na chybu 403 a zobrazení specifické hlášky
        if (response.status === 403) {
          throw new Error("Nemáte oprávnění k této akci");
        } else {
          throw new Error(errorData.message || `Error ${response.status}: Failed to update client`);
        }
      }

      const updatedClient = await response.json();
      setClient(updatedClient);
      setEditedClient(updatedClient);
      setIsEditing(false);
      toast.success("Klient byl úspěšně aktualizován");
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error(error instanceof Error ? error.message : "Nepodařilo se aktualizovat klienta");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Kontrola na chybu 403 a zobrazení specifické hlášky
        if (response.status === 403) {
          throw new Error("Nemáte oprávnění k této akci");
        } else {
          throw new Error(errorData.message || `Error ${response.status}: Failed to delete client`);
        }
      }

      toast.success("Klient byl úspěšně smazán");
      router.push("/dashboard/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error(error instanceof Error ? error.message : "Nepodařilo se smazat klienta");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCancel = () => {
    setEditedClient(client);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Načítání detailů klienta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 text-center">
          <p className="text-red-700 dark:text-red-300 mb-2">{error}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na seznam klientů
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět
          </Button>
          <h1 className="text-3xl font-bold">{client.companyName}</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Zrušit
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>Ukládám...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Uložit
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Smazat
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Upravit
              </Button>
            </>
          )}
        </div>
      </div>
      
      <p className="text-gray-500 dark:text-gray-400">
        IČO: {client.ico} | {client.fveName || "FVE není specifikována"}
      </p>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Základní informace</TabsTrigger>
          <TabsTrigger value="offers">Nabídky</TabsTrigger>
          <TabsTrigger value="invoicing">Fakturace</TabsTrigger>
          <TabsTrigger value="flight">Let a dokumenty</TabsTrigger>
          <TabsTrigger value="analysis">Analýza a report</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="p-4 border rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Informace o společnosti</h3>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">Název společnosti</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={isEditing ? editedClient.companyName : client.companyName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ico">IČO</Label>
                <Input
                  id="ico"
                  name="ico"
                  value={isEditing ? editedClient.ico : client.ico}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Kontaktní osoba</Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  value={isEditing ? editedClient.contactPerson || "" : client.contactPerson || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={isEditing ? editedClient.phone || "" : client.phone || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={isEditing ? editedClient.email || "" : client.email || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Informace o FVE</h3>
              
              <div className="space-y-2">
                <Label htmlFor="fveName">Název FVE</Label>
                <Input
                  id="fveName"
                  name="fveName"
                  value={isEditing ? editedClient.fveName || "" : client.fveName || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fveAddress">Adresa FVE</Label>
                <Input
                  id="fveAddress"
                  name="fveAddress"
                  value={isEditing ? editedClient.fveAddress || "" : client.fveAddress || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="installedPower">Instalovaný výkon (kWp)</Label>
                <Input
                  id="installedPower"
                  name="installedPower"
                  type="number"
                  value={isEditing ? editedClient.installedPower || "" : client.installedPower || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="distanceKm">Vzdálenost (km)</Label>
                <Input
                  id="distanceKm"
                  name="distanceKm"
                  type="number"
                  value={isEditing ? editedClient.distanceKm || "" : client.distanceKm || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Poznámky</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={isEditing ? editedClient.notes || "" : client.notes || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="offers" className="p-4 border rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Nabídka</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="marketingBan"
                  checked={isEditing ? editedClient.marketingBan || false : client.marketingBan || false}
                  onCheckedChange={(checked) => handleSwitchChange("marketingBan", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="marketingBan">Zákaz marketingu</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="offerSent"
                  checked={isEditing ? editedClient.offerSent || false : client.offerSent || false}
                  onCheckedChange={(checked) => handleSwitchChange("offerSent", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="offerSent">Nabídka odeslána</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="offerSentTo">Odesláno kam</Label>
                <Input
                  id="offerSentTo"
                  name="offerSentTo"
                  value={isEditing ? editedClient.offerSentTo || "" : client.offerSentTo || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="offerSentDate">Datum odeslání</Label>
                <Input
                  id="offerSentDate"
                  name="offerSentDate"
                  type="date"
                  value={isEditing ? 
                    (editedClient.offerSentDate ? new Date(editedClient.offerSentDate).toISOString().split('T')[0] : "") : 
                    (client.offerSentDate ? new Date(client.offerSentDate).toISOString().split('T')[0] : "")
                  }
                  onChange={handleDateChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="offerApproved"
                  checked={isEditing ? editedClient.offerApproved || false : client.offerApproved || false}
                  onCheckedChange={(checked) => handleSwitchChange("offerApproved", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="offerApproved">Nabídka schválena</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="offerApprovedDate">Datum schválení</Label>
                <Input
                  id="offerApprovedDate"
                  name="offerApprovedDate"
                  type="date"
                  value={isEditing ? 
                    (editedClient.offerApprovedDate ? new Date(editedClient.offerApprovedDate).toISOString().split('T')[0] : "") : 
                    (client.offerApprovedDate ? new Date(client.offerApprovedDate).toISOString().split('T')[0] : "")
                  }
                  onChange={handleDateChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="offerRejectionReason">Důvod odmítnutí</Label>
                <Textarea
                  id="offerRejectionReason"
                  name="offerRejectionReason"
                  value={isEditing ? editedClient.offerRejectionReason || "" : client.offerRejectionReason || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={2}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Cenové informace</h3>
              
              <div className="space-y-2">
                <Label htmlFor="totalPriceExVat">Cena bez DPH (Kč)</Label>
                <Input
                  id="totalPriceExVat"
                  name="totalPriceExVat"
                  type="number"
                  value={isEditing ? editedClient.totalPriceExVat || "" : client.totalPriceExVat || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalPriceIncVat">Cena s DPH (Kč)</Label>
                <Input
                  id="totalPriceIncVat"
                  name="totalPriceIncVat"
                  type="number"
                  value={isEditing ? editedClient.totalPriceIncVat || "" : client.totalPriceIncVat || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="analysisPrice">Cena analýzy (Kč)</Label>
                <Input
                  id="analysisPrice"
                  name="analysisPrice"
                  type="number"
                  value={isEditing ? editedClient.analysisPrice || "" : client.analysisPrice || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataCollectionPrice">Cena sběru dat (Kč)</Label>
                <Input
                  id="dataCollectionPrice"
                  name="dataCollectionPrice"
                  type="number"
                  value={isEditing ? editedClient.dataCollectionPrice || "" : client.dataCollectionPrice || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transportPrice">Cena dopravy (Kč)</Label>
                <Input
                  id="transportPrice"
                  name="transportPrice"
                  type="number"
                  value={isEditing ? editedClient.transportPrice || "" : client.transportPrice || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoicing" className="p-4 border rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Fakturace</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="readyForBilling"
                  checked={isEditing ? editedClient.readyForBilling || false : client.readyForBilling || false}
                  onCheckedChange={(checked) => handleSwitchChange("readyForBilling", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="readyForBilling">Připraveno k fakturaci</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="firstInvoiceAmount">1. záloha (Kč)</Label>
                <Input
                  id="firstInvoiceAmount"
                  name="firstInvoiceAmount"
                  type="number"
                  value={isEditing ? editedClient.firstInvoiceAmount || "" : client.firstInvoiceAmount || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="firstInvoicePaid"
                  checked={isEditing ? editedClient.firstInvoicePaid || false : client.firstInvoicePaid || false}
                  onCheckedChange={(checked) => handleSwitchChange("firstInvoicePaid", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="firstInvoicePaid">1. záloha zaplacena</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondInvoiceAmount">2. záloha (Kč)</Label>
                <Input
                  id="secondInvoiceAmount"
                  name="secondInvoiceAmount"
                  type="number"
                  value={isEditing ? editedClient.secondInvoiceAmount || "" : client.secondInvoiceAmount || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="secondInvoicePaid"
                  checked={isEditing ? editedClient.secondInvoicePaid || false : client.secondInvoicePaid || false}
                  onCheckedChange={(checked) => handleSwitchChange("secondInvoicePaid", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="secondInvoicePaid">2. záloha zaplacena</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="finalInvoiceAmount">Finální faktura (Kč)</Label>
                <Input
                  id="finalInvoiceAmount"
                  name="finalInvoiceAmount"
                  type="number"
                  value={isEditing ? editedClient.finalInvoiceAmount || "" : client.finalInvoiceAmount || ""}
                  onChange={handleNumberChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="finalInvoicePaid"
                  checked={isEditing ? editedClient.finalInvoicePaid || false : client.finalInvoicePaid || false}
                  onCheckedChange={(checked) => handleSwitchChange("finalInvoicePaid", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="finalInvoicePaid">Finální faktura zaplacena</Label>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Další informace</h3>
              
              <div className="space-y-2">
                <Label htmlFor="invoiceNotes">Poznámky k fakturaci</Label>
                <Textarea
                  id="invoiceNotes"
                  name="invoiceNotes"
                  value={isEditing ? editedClient.invoiceNotes || "" : client.invoiceNotes || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  name="status"
                  value={isEditing ? editedClient.status || "" : client.status || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flight" className="p-4 border rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Dokumenty a povolení</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="flightConsentSigned"
                  checked={isEditing ? editedClient.flightConsentSigned || false : client.flightConsentSigned || false}
                  onCheckedChange={(checked) => handleSwitchChange("flightConsentSigned", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="flightConsentSigned">Souhlas s létáním</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="fveDrawingsReceived"
                  checked={isEditing ? editedClient.fveDrawingsReceived || false : client.fveDrawingsReceived || false}
                  onCheckedChange={(checked) => handleSwitchChange("fveDrawingsReceived", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="fveDrawingsReceived">Výkresy FVE</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="permissionRequested"
                  checked={isEditing ? editedClient.permissionRequested || false : client.permissionRequested || false}
                  onCheckedChange={(checked) => handleSwitchChange("permissionRequested", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="permissionRequested">Žádost o povolení</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="permissionStatus">Status povolení</Label>
                <Input
                  id="permissionStatus"
                  name="permissionStatus"
                  value={isEditing ? editedClient.permissionStatus || "" : client.permissionStatus || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Informace o letu</h3>
              
              <div className="space-y-2">
                <Label htmlFor="pilotName">Pilot</Label>
                <Input
                  id="pilotName"
                  name="pilotName"
                  value={isEditing ? editedClient.pilotName || "" : client.pilotName || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="photosTaken"
                  checked={isEditing ? editedClient.photosTaken || false : client.photosTaken || false}
                  onCheckedChange={(checked) => handleSwitchChange("photosTaken", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="photosTaken">Nafoceno</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photosDate">Datum focení</Label>
                <Input
                  id="photosDate"
                  name="photosDate"
                  type="date"
                  value={isEditing ? 
                    (editedClient.photosDate ? new Date(editedClient.photosDate).toISOString().split('T')[0] : "") : 
                    (client.photosDate ? new Date(client.photosDate).toISOString().split('T')[0] : "")
                  }
                  onChange={handleDateChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="flightNotes">Poznámky k letu</Label>
                <Textarea
                  id="flightNotes"
                  name="flightNotes"
                  value={isEditing ? editedClient.flightNotes || "" : client.flightNotes || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="p-4 border rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Analýza</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="analysisStarted"
                  checked={isEditing ? editedClient.analysisStarted || false : client.analysisStarted || false}
                  onCheckedChange={(checked) => handleSwitchChange("analysisStarted", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="analysisStarted">Analýza zahájena</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="analysisCompleted"
                  checked={isEditing ? editedClient.analysisCompleted || false : client.analysisCompleted || false}
                  onCheckedChange={(checked) => handleSwitchChange("analysisCompleted", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="analysisCompleted">Analýza dokončena</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="analysisNotes">Poznámky k analýze</Label>
                <Textarea
                  id="analysisNotes"
                  name="analysisNotes"
                  value={isEditing ? editedClient.analysisNotes || "" : client.analysisNotes || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Report</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="reportCreated"
                  checked={isEditing ? editedClient.reportCreated || false : client.reportCreated || false}
                  onCheckedChange={(checked) => handleSwitchChange("reportCreated", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="reportCreated">Report vytvořen</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="reportSent"
                  checked={isEditing ? editedClient.reportSent || false : client.reportSent || false}
                  onCheckedChange={(checked) => handleSwitchChange("reportSent", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="reportSent">Report odeslán</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reportSentDate">Datum odeslání reportu</Label>
                <Input
                  id="reportSentDate"
                  name="reportSentDate"
                  type="date"
                  value={isEditing ? 
                    (editedClient.reportSentDate ? new Date(editedClient.reportSentDate).toISOString().split('T')[0] : "") : 
                    (client.reportSentDate ? new Date(client.reportSentDate).toISOString().split('T')[0] : "")
                  }
                  onChange={handleDateChange}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="feedbackReceived"
                  checked={isEditing ? editedClient.feedbackReceived || false : client.feedbackReceived || false}
                  onCheckedChange={(checked) => handleSwitchChange("feedbackReceived", checked)}
                  disabled={!isEditing}
                />
                <Label htmlFor="feedbackReceived">Zpětná vazba</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="feedbackNotes">Poznámky ke zpětné vazbě</Label>
                <Textarea
                  id="feedbackNotes"
                  name="feedbackNotes"
                  value={isEditing ? editedClient.feedbackNotes || "" : client.feedbackNotes || ""}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tohoto klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Klient a všechna jeho data budou trvale odstraněny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500"
            >
              {isDeleting ? "Mazání..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
