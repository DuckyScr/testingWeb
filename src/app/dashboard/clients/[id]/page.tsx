"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isNumericField, isFloatField, isICOField, isValidNumber, lookupCompanyByICO } from "@/lib/validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Update the ValidationResult type
type ValidationResult = {
  isValid: boolean;
  formattedValue: string | number | null;
  error?: string;
  rawValue: string | number | null;
};

// Define the categories from the CSV first row
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

// Add User interface
interface User {
  id: string;
  name: string | null;
  email: string;
}

// Define fields for each category
const CATEGORY_FIELDS: Record<string, { field: string, label: string, type: string }[]> = {
  "základní_informace": [
    { field: "companyName", label: "Název společnosti", type: "text" },
    { field: "ico", label: "IČO", type: "ico" },
    { field: "parentCompany", label: "Mateřská firma", type: "text" },
    { field: "parentCompanyIco", label: "IČO mateřské firmy", type: "ico" },
    { field: "dataBox", label: "Datová schránka", type: "text" },
    { field: "fveName", label: "Název FVE", type: "text" },
    { field: "installedPower", label: "Instalovaný výkon", type: "number" },
    { field: "fveAddress", label: "Adresa FVE", type: "text" },
    { field: "gpsCoordinates", label: "GPS souřadnice", type: "gps" },
    { field: "distanceKm", label: "Vzdálenost tam a zpět (km)", type: "number" },
    { field: "serviceCompany", label: "Servisní firma", type: "text" },
    { field: "serviceCompanyIco", label: "IČO servisní firmy", type: "ico" }
  ],
  "kontakty": [
    { field: "contactPerson", label: "Kontaktní osoba", type: "text" },
    { field: "phone", label: "Telefon", type: "phone" },
    { field: "email", label: "Email", type: "email" },
    { field: "contactRole", label: "Funkce kontaktu", type: "text" },
    { field: "salesRepId", label: "Obchodní zástupce", type: "select" }
  ],
  "nabídka_a_smlouva": [
    { field: "marketingBan", label: "Zákaz marketingových oslovení", type: "boolean" },
    { field: "offerSent", label: "Nabídka odeslána", type: "boolean" },
    { field: "offerSentTo", label: "Nabídka odeslána kam", type: "text" },
    { field: "offerSentDate", label: "Datum odeslání nabídky", type: "date" },
    { field: "offerApproved", label: "Nabídka schválena", type: "boolean" },
    { field: "offerApprovedDate", label: "Datum schválení nabídky", type: "date" },
    { field: "offerRejectionReason", label: "Důvod odmítnutí nabídky", type: "text" },
    { field: "priceExVat", label: "Cena bez DPH", type: "number" },
    { field: "dataAnalysisPrice", label: "Cena za vyhodnocení dat", type: "number" },
    { field: "dataCollectionPrice", label: "Cena za sběr dat", type: "number" },
    { field: "transportationPrice", label: "Cena dopravy", type: "number" },
    { field: "marginGroup", label: "Maržová skupina", type: "text" },
    { field: "multipleInspections", label: "Více inspekcí", type: "boolean" },
    { field: "inspectionDeadline", label: "Termín inspekce", type: "date" },
    { field: "customContract", label: "Individuální smlouva", type: "boolean" },
    { field: "contractSignedDate", label: "Datum podpisu smlouvy", type: "date" },
    { field: "readyForBilling", label: "Připraveno k fakturaci", type: "boolean" }
  ],
  "fakturace": [
    { field: "firstInvoiceAmount", label: "Částka první zálohy", type: "number" },
    { field: "firstInvoiceDate", label: "Datum první faktury", type: "date" },
    { field: "firstInvoiceDueDate", label: "Splatnost první faktury", type: "date" },
    { field: "firstInvoicePaid", label: "První faktura zaplacena", type: "boolean" },
    { field: "secondInvoiceAmount", label: "Částka druhé zálohy", type: "number" },
    { field: "secondInvoiceDate", label: "Datum druhé faktury", type: "date" },
    { field: "secondInvoiceDueDate", label: "Splatnost druhé faktury", type: "date" },
    { field: "secondInvoicePaid", label: "Druhá faktura zaplacena", type: "boolean" },
    { field: "finalInvoiceAmount", label: "Částka finální faktury", type: "number" },
    { field: "finalInvoiceDate", label: "Datum finální faktury", type: "date" },
    { field: "finalInvoiceDueDate", label: "Splatnost finální faktury", type: "date" },
    { field: "finalInvoicePaid", label: "Finální faktura zaplacena", type: "boolean" },
    { field: "totalPriceExVat", label: "Celkem bez DPH", type: "number" },
    { field: "totalPriceIncVat", label: "Celkem s DPH", type: "number" }
  ],
  "dokumenty_od_klienta": [
    { field: "flightConsentSent", label: "Souhlas s létáním odeslán", type: "boolean" },
    { field: "flightConsentSentDate", label: "Datum odeslání souhlasu", type: "date" },
    { field: "flightConsentSigned", label: "Souhlas podepsán", type: "boolean" },
    { field: "flightConsentSignedDate", label: "Datum podpisu souhlasu", type: "date" },
    { field: "fveDrawingsReceived", label: "Výkresy FVE doručeny", type: "boolean" },
    { field: "fveDrawingsReceivedDate", label: "Datum doručení výkresů", type: "date" },
    { field: "permissionRequired", label: "Nutné žádat o OKL", type: "boolean" },
    { field: "permissionRequested", label: "Žádost o OKL/OKP odeslána", type: "boolean" },
    { field: "permissionRequestedDate", label: "Datum odeslání žádosti", type: "date" },
    { field: "permissionRequestNumber", label: "Číslo žádosti", type: "text" },
    { field: "permissionStatus", label: "Status žádosti", type: "text" },
    { field: "permissionValidUntil", label: "Platnost do", type: "date" }
  ],
  "sběr_dat_pilot": [
    { field: "assignedToPilot", label: "Předáno pilotovi", type: "boolean" },
    { field: "pilotName", label: "Jméno pilota", type: "text" },
    { field: "pilotAssignedDate", label: "Datum předání pilotovi", type: "date" },
    { field: "expectedFlightDate", label: "Očekávaný termín letu", type: "date" },
    { field: "photosTaken", label: "Fotografie pořízeny", type: "boolean" },
    { field: "photosDate", label: "Datum pořízení fotografií", type: "date" },
    { field: "photosTime", label: "Čas pořízení fotografií", type: "text" },
    { field: "panelTemperature", label: "Teplota panelu", type: "number" },
    { field: "irradiance", label: "Osvit (Watt)", type: "number" },
    { field: "weather", label: "Počasí", type: "text" },
    { field: "windSpeed", label: "Rychlost větru (m/s)", type: "number" },
    { field: "dataUploaded", label: "Data nahrána", type: "boolean" }
  ],
  "analýza_a_report": [
    { field: "analysisStarted", label: "Analýza zahájena", type: "boolean" },
    { field: "analysisStartDate", label: "Datum zahájení analýzy", type: "date" },
    { field: "analysisCompleted", label: "Analýza dokončena", type: "boolean" },
    { field: "analysisCompletedDate", label: "Datum dokončení analýzy", type: "date" },
    { field: "reportCreated", label: "Report vytvořen", type: "boolean" },
    { field: "reportSent", label: "Report odeslán", type: "boolean" },
    { field: "reportSentDate", label: "Datum odeslání reportu", type: "date" }
  ],
  "zákaznická_zkušenost": [
    { field: "feedbackReceived", label: "Zpětná vazba obdržena", type: "boolean" },
    { field: "feedbackContent", label: "Obsah zpětné vazby", type: "text" }
  ]
};

// Interface for client data with categories
interface ClientData {
  id: number;
  companyName: string;
  [key: string]: any;
}

// Interface for categorized data
interface CategorizedData {
  [category: string]: {
    [field: string]: any;
  };
}

// Update the GPS coordinates validation
const validateAndFormatInput = (fieldName: string, value: string): ValidationResult => {
  // If value is empty, return empty
  if (!value) {
    return { isValid: true, formattedValue: '', rawValue: '' };
  }

  // GPS coordinates validation (format: XX.XXXXX,YY.YYYYY)
  if (fieldName === 'gpsCoordinates') {
    // Remove spaces and normalize decimal separator
    const cleanValue = value.replace(/\s/g, '').replace(',', '.');
    
    // If no comma yet, just return the value
    if (!value.includes(',')) {
      return { isValid: true, formattedValue: value, rawValue: value };
    }

    // Split and validate coordinates
    const [lat, lon] = value.split(',');
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Basic validation
    if (isNaN(latNum) || isNaN(lonNum)) {
      return { 
        isValid: true, // Changed to true to allow partial input
        formattedValue: value,
        rawValue: value
      };
    }

    // Range validation
    if (latNum < -90 || latNum > 90) {
      return { 
        isValid: true, // Changed to true to allow partial input
        formattedValue: value,
        rawValue: value
      };
    }
    if (lonNum < -180 || lonNum > 180) {
      return { 
        isValid: true, // Changed to true to allow partial input
        formattedValue: value,
        rawValue: value
      };
    }

    return { 
      isValid: true, 
      formattedValue: value,
      rawValue: value
    };
  }

  // Number fields (prices, distance, etc.)
  if (fieldName.includes('Price') || fieldName.includes('Amount') || fieldName === 'distanceKm' || fieldName === 'installedPower') {
    // Remove all spaces and normalize decimal separator
    const cleanValue = value.replace(/\s/g, '').replace(',', '.');
    
    // If the value is just a decimal point or comma, allow it
    if (cleanValue === '.' || cleanValue === ',') {
      return { isValid: true, formattedValue: value, rawValue: value };
    }

    // Try to parse the number
    const num = parseFloat(cleanValue);
    
    // If it's not a valid number, still allow the input
    if (isNaN(num)) {
      return { isValid: true, formattedValue: value, rawValue: value };
    }

    // Format for display - use different formatting for different fields
    let formatted: string;
    if (fieldName.includes('Price')) {
      formatted = new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(num);
    } else {
      formatted = new Intl.NumberFormat('cs-CZ', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: fieldName === 'distanceKm' ? 1 : 2
      }).format(num);
    }

    return { 
      isValid: true, 
      formattedValue: formatted,
      rawValue: num
    };
  }

  // Default case - no special validation, just pass through the value
  return { isValid: true, formattedValue: value, rawValue: value };
};

// Utility functions for formatting
const formatPrice = (value: number | null) => {
  if (value === null) return "";
  return new Intl.NumberFormat('cs-CZ', { 
    style: 'currency', 
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatNumber = (value: number | null, field: string) => {
  if (value === null) return "";
  // Special handling for installedPower to use 3 decimal places
  if (field === 'installedPower') {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(value);
  }
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDateForDisplay = (dateString: string | null) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "—";
  }
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;
  
  const [client, setClient] = useState<ClientData | null>(null);
  const [categorizedData, setCategorizedData] = useState<CategorizedData>({});
  const [editedData, setEditedData] = useState<CategorizedData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Add the users state here, inside the component
  const [users, setUsers] = useState<User[]>([]);

  // Add this useEffect inside the component
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
          // console.log('Fetched users:', data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        
        // Validate clientId before making the request
        if (!clientId || isNaN(Number(clientId))) {
          toast.error("Invalid client ID");
          router.push('/dashboard/clients');
          return;
        }

        const response = await fetch(`/api/clients/${clientId}/categorized`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch client data: ${response.statusText}`);
        }
        
        const data = await response.json();
        // console.log('Fetched client data (full response):', data);
        
        if (!data.client) {
          throw new Error('Client data not found');
        }

        const clientData = data.client;
        const categorizedDataFromApi = data.categorizedData;

        // Ensure salesRepId is correctly placed in categorizedData.kontakty
        if (clientData.salesRepId) {
          if (!categorizedDataFromApi.kontakty) {
            categorizedDataFromApi.kontakty = {};
          }
          categorizedDataFromApi.kontakty.salesRepId = clientData.salesRepId;
        }

        setClient(clientData);
        setCategorizedData(categorizedDataFromApi);
        setEditedData(categorizedDataFromApi);
        console.log('salesRepId in categorizedData after fetch:', data.categorizedData?.kontakty?.salesRepId);
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast.error("Nepodařilo se načíst data klienta");
        router.push('/dashboard/clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, router]);

  // Update the handleInputChange function to handle sales rep selection
  const handleInputChange = async (category: string, field: string, value: any) => {
    // Special handling for sales rep selection
    if (field === 'salesRepId') {
      const selectedUser = users.find(user => user.id === value);
      // console.log('handleInputChange - salesRepId:', { value, selectedUser, users });
      setEditedData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: value,
          'salesRepEmail': selectedUser?.email || null
        }
      }));
      return;
    }

    // Special handling for ICO fields to ensure they're stored as strings
    if (isICOField(field)) {
      // Convert to string and remove any non-digit characters
      const icoString = String(value).replace(/\D/g, '');
      
      setEditedData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: icoString
        }
      }));

      // If ICO is 8 digits, trigger company lookup
      if (icoString.length === 8) {
        const result = await lookupCompanyByICO(icoString);
        if (result.isValid && result.data) {
          setEditedData(prev => ({
            ...prev,
            'základní_informace': {
              ...prev['základní_informace'],
              'companyName': result.data?.companyName || prev['základní_informace'].companyName,
              'fveAddress': result.data?.address || prev['základní_informace'].fveAddress,
              'dataBox': result.data?.dataBox || prev['základní_informace'].dataBox
            }
          }));
          toast.success(`Informace o společnosti načteny: ${result.data.companyName}`);
        } else if (result.error) {
          toast.error(result.error);
        }
      }
      return;
    }

    // Handle numeric fields
    if (isNumericField(field)) {
      const validation = isValidNumber(value);
      if (!validation.isValid) {
        toast.error(validation.error || 'Neplatné číslo');
        return;
      }
      value = validation.formattedValue;
    }

    // Update the field value
    setEditedData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  // Add this function to map display names back to field names
  const getFieldNameFromDisplayName = (displayName: string): string | null => {
    // Iterate through all categories and fields to find the matching field
    for (const category in CATEGORY_FIELDS) {
      const field = CATEGORY_FIELDS[category].find(f => f.label === displayName);
      if (field) {
        return field.field;
      }
    }
    return null;
  };
  
  // Add this function before handleSave
  const validateAllFields = () => {
    try {
      // Validate all fields in editedData
      for (const [category, fields] of Object.entries(editedData)) {
        for (const [field, value] of Object.entries(fields)) {
          // Skip validation for sales rep fields
          if (field === 'salesRepId' || field === 'salesRepEmail') {
            continue;
          }

          // Get field configuration
          const fieldConfig = CATEGORY_FIELDS[category]?.find(f => f.field === field);
          if (!fieldConfig) {
            console.warn(`No field configuration found for ${category}.${field}`);
            continue;
          }

          // Validate numeric fields
          if (isNumericField(field)) {
            const validation = isValidNumber(value);
            if (!validation.isValid) {
              toast.error(`${fieldConfig.label}: ${validation.error || 'Neplatné číslo'}`);
              return false;
            }
          }

          // Validate ICO fields
          if (isICOField(field) && value) {
            const icoString = String(value).replace(/\D/g, '');
            if (icoString.length !== 8) {
              toast.error(`${fieldConfig.label}: IČO musí být 8místné číslo`);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating fields:', error);
      toast.error('Chyba při validaci polí');
      return false;
    }
  };
  
  // Update the handleSave function to include sales rep data
  const handleSave = async () => {
    if (!validateAllFields()) {
      return;
    }

    setSaving(true);
    try {
      // Transform the data back to the format expected by the API
      const transformedData: Record<string, any> = {};
      
      // First, handle the sales rep data
      if (editedData.kontakty?.salesRepId) {
        transformedData.salesRepId = editedData.kontakty.salesRepId;
        transformedData.salesRepEmail = editedData.kontakty.salesRepEmail;
      } else {
        transformedData.salesRepId = null;
        transformedData.salesRepEmail = null;
      }

      // Then handle all other fields
      Object.entries(editedData).forEach(([category, fields]) => {
        Object.entries(fields).forEach(([field, value]) => {
          // Skip sales rep fields as they're handled above
          if (field === 'salesRepId' || field === 'salesRepEmail') {
            return;
          }

          // Get the field name from the category fields mapping
          const fieldConfig = CATEGORY_FIELDS[category]?.find(f => f.field === field);
          if (fieldConfig) {
            transformedData[field] = value;
          }
        });
      });

      console.log('Sending update with data:', transformedData);

      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update client');
      }

      const updatedClient = await response.json();
      
      // After successful save, re-fetch categorized data to update frontend state
      const refetchResponse = await fetch(`/api/clients/${clientId}/categorized`);
      if (!refetchResponse.ok) {
        throw new Error(`Failed to refetch client data after save: ${refetchResponse.statusText}`);
      }
      const refetchedData = await refetchResponse.json();

      // Apply the same salesRepId mapping logic as in fetchClientData
      const refetchedClientData = refetchedData.client;
      const refetchedCategorizedData = refetchedData.categorizedData;

      if (refetchedClientData.salesRepId) {
        if (!refetchedCategorizedData.kontakty) {
          refetchedCategorizedData.kontakty = {};
        }
        refetchedCategorizedData.kontakty.salesRepId = refetchedClientData.salesRepId;
      }

      setClient(refetchedClientData);
      setCategorizedData(refetchedCategorizedData);
      setEditedData(refetchedCategorizedData);

      toast.success("Klient byl úspěšně aktualizován!");
      setIsEditing(false); // Exit editing mode after successful save
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(`Nepodařilo se uložit změny: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    // Reset edited data to the original data
    setEditedData(categorizedData);
    setIsEditing(false);
    toast.info("Changes discarded");
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete client");
      }

      toast.success("Client deleted successfully");
      router.push('/dashboard/clients');
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Update the renderFieldValue function
  const renderFieldValue = (category: string, field: string, value: any, fieldLabel: string, type: string) => {
    if (!isEditing) {
      // Special handling for sales rep display
      if (field === 'salesRepId') {
        const selectedUser = users.find(user => user.id === value);
        // console.log('Rendering sales rep display:', { value, selectedUser, users });
        return (
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              {selectedUser ? (selectedUser.name || selectedUser.email) : "Žádný"}
            </span>
            {selectedUser?.email && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({selectedUser.email})
              </span>
            )}
          </div>
        );
      }

      // Format display value for non-editing mode
      if (fieldLabel?.includes('Price') || fieldLabel?.includes('Amount')) {
        return formatPrice(value);
      }
      if (isNumericField(field)) {
        return formatNumber(value, field);
      }
      if (value === true) return "Ano";
      if (value === false) return "Ne";
      if (value === null || value === undefined) return "—";
      if (type === 'date') {
        return formatDateForDisplay(value);
      }
      return String(value);
    }

    switch (type) {
      case 'boolean':
        return (
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => handleInputChange(category, field, checked)}
            disabled={!isEditing}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ""}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="w-full"
            disabled={!isEditing}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="w-full"
            disabled={!isEditing}
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="w-full"
            disabled={!isEditing}
          />
        );
      case 'ico':
        return (
          <Input 
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={value || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="w-full"
            placeholder="12345678"
            disabled={!isEditing}
          />
        );
      case 'gps':
        return (
          <Input 
            type="text"
            inputMode="decimal"
            value={value || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="w-full"
            placeholder="50.12345,14.12345"
            disabled={!isEditing}
          />
        );
      case 'select':
        if (field === 'salesRepId') {
          console.log('Rendering salesRepId select: value=', value, 'users=', users);
          return (
            <Select
              value={value === null || value === undefined ? "__none__" : String(value)}
              onValueChange={(newValue) => {
                handleInputChange(category, field, newValue === "__none__" ? null : newValue);
              }}
              disabled={!isEditing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vyberte obchodního zástupce" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Žádný</SelectItem>
                {users.map((user) => {
                  return (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          );
        }
        return null;
      case 'number':
        return (
          <Input
            type="number"
            value={value === null ? "" : value}
            onChange={(e) => {
              const newValue = e.target.value === "" ? null : parseFloat(e.target.value);
              handleInputChange(category, field, newValue);
            }}
            step={field === 'installedPower' ? "0.001" : "0.01"}
            className="w-full"
            disabled={!isEditing}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="w-full"
            disabled={!isEditing}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Načítání...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium">Klient nenalezen</p>
          <Button onClick={() => router.push('/dashboard/clients')}>
            Zpět na seznam klientů
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zpět na seznam
            </Button>
          </Link>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleDiscard}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Zahodit změny
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Uložit změny
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-500 hover:text-red-700"
              >
                Smazat klienta
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Upravit
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{client.companyName}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          IČO: {client.ico || "Neuvedeno"}
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col gap-2">
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
        </div>
        
        {CATEGORIES.map((category) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle>{CATEGORY_DISPLAY_NAMES[category]}</CardTitle>
              </CardHeader>
              <CardContent>
                {
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CATEGORY_FIELDS[category]?.map((fieldConfig) => {
                      const field = fieldConfig.field;
                      const fieldLabel = fieldConfig.label;
                      const type = fieldConfig.type || 'text';
                      const value = editedData[category]?.[field];

                      return (
                        <div key={field} className="flex flex-col gap-1.5">
                          <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {fieldLabel}
                          </Label>
                          {renderFieldValue(category, field, value, fieldLabel, type)}
                        </div>
                      );
                    })}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat klienta</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat klienta {client.companyName}? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Zrušit
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteClient}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Make sure the import for Select components is at the top of the file with other imports
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";