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
    { field: "salesRep", label: "Obchodní zástupce", type: "text" },
    { field: "salesRepEmail", label: "Email obchodního zástupce", type: "email" }
  ],
  "nabídka_a_smlouva": [
    { field: "marketingBan", label: "Zákaz marketingových oslovení", type: "boolean" },
    { field: "offerSent", label: "Nabídka odeslána", type: "boolean" },
    { field: "offerSentTo", label: "Nabídka odeslána kam", type: "text" },
    { field: "offerSentDate", label: "Datum odeslání nabídky", type: "date" },
    { field: "offerApproved", label: "Nabídka schválena", type: "boolean" },
    { field: "offerApprovedDate", label: "Datum schválení nabídky", type: "date" },
    { field: "offerRejectionReason", label: "Důvod odmítnutí nabídky", type: "text" },
    // Change this line from offerPrice to priceExVat to match your schema
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
  // GPS coordinates validation (format: XX.XXXXX,YY.YYYYY)
  if (fieldName === 'gpsCoordinates') {
    if (!value) {
      return { isValid: true, formattedValue: '', rawValue: '' };
    }

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
        isValid: false, 
        formattedValue: value,
        rawValue: value,
        error: 'Neplatné souřadnice'
      };
    }

    // Range validation
    if (latNum < -90 || latNum > 90) {
      return { 
        isValid: false, 
        formattedValue: value,
        rawValue: value,
        error: 'Zeměpisná šířka musí být mezi -90 a 90'
      };
    }
    if (lonNum < -180 || lonNum > 180) {
      return { 
        isValid: false, 
        formattedValue: value,
        rawValue: value,
        error: 'Zeměpisná délka musí být mezi -180 a 180'
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
    if (!value) {
      return { isValid: true, formattedValue: '', rawValue: null };
    }

    // Remove all spaces and normalize decimal separator
    const cleanValue = value.replace(/\s/g, '').replace(',', '.');
    
    // If the value is just a decimal point or comma, return empty
    if (cleanValue === '.' || cleanValue === ',') {
      return { isValid: true, formattedValue: '', rawValue: null };
    }

    // Try to parse the number
    const num = parseFloat(cleanValue);
    
    // If it's not a valid number, return the original value
    if (isNaN(num)) {
      return { isValid: true, formattedValue: value, rawValue: null };
    }

    // Validate range
    if (num < 0) {
      return { 
        isValid: false, 
        formattedValue: value,
        rawValue: num,
        error: 'Hodnota musí být kladné číslo'
      };
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

  // Default case - no special validation
  return { isValid: true, formattedValue: value, rawValue: value };
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
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([]);

  // Add this useEffect inside the component
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const userData = await response.json();
          setUsers(userData);
        } else {
          console.error('Failed to fetch users');
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
        setClient(data.client);
        setCategorizedData(data.categorizedData);
        setEditedData(data.categorizedData);
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast.error("Failed to load client data");
        router.push('/dashboard/clients');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientData();
  }, [clientId, router]);

  // Update handleInputChange to handle all numeric fields as strings
  const handleInputChange = async (category: string, field: string, value: any) => {
    if (!isEditing) return;
    
    const fieldName = getFieldNameFromDisplayName(field);
    if (!fieldName) return;

    // Special handling for ICO fields to ensure they're stored as strings
    if (isICOField(fieldName)) {
      // Convert to string and remove any non-digit characters
      const icoString = String(value).replace(/\D/g, '');
      
      setEditedData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: icoString
        }
      }));

      // Only do ICO lookup if we have exactly 8 digits
      if (icoString.length === 8) {
        const companyInfo = await lookupCompanyByICO(icoString);
        if (companyInfo) {
          // If this is the main ICO field, update company name
          if (fieldName === "ico") {
            setEditedData(prev => ({
              ...prev,
              ["základní_informace"]: {
                ...prev["základní_informace"],
                "Název společnosti": companyInfo.companyName || prev["základní_informace"]["Název společnosti"],
                "Adresa FVE": companyInfo.address || prev["základní_informace"]["Adresa FVE"]
              }
            }));
            toast.success(`Informace o společnosti načteny: ${companyInfo.companyName}`);
          }
          
          // If this is parent company ICO, update parent company name
          if (fieldName === "parentCompanyIco") {
            setEditedData(prev => ({
              ...prev,
              ["základní_informace"]: {
                ...prev["základní_informace"],
                "Mateřská firma": companyInfo.companyName || prev["základní_informace"]["Mateřská firma"]
              }
            }));
            toast.success(`Informace o mateřské společnosti načteny: ${companyInfo.companyName}`);
          }
          
          // If this is service company ICO, update service company name
          if (fieldName === "serviceCompanyIco") {
            setEditedData(prev => ({
              ...prev,
              ["základní_informace"]: {
                ...prev["základní_informace"],
                "Servisní firma": companyInfo.companyName || prev["základní_informace"]["Servisní firma"]
              }
            }));
            toast.success(`Informace o servisní společnosti načteny: ${companyInfo.companyName}`);
          }
        }
      }
      return;
    }

    // Special handling for numeric fields to store as strings
    if (fieldName === 'installedPower' || 
        fieldName === 'distanceKm' ||
        fieldName.includes('Price') || 
        fieldName.includes('Amount')) {
      // Convert to string and remove any non-digit characters
      const stringValue = String(value).replace(/\D/g, '');
      
      setEditedData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: stringValue
        }
      }));
      return;
    }

    // Special handling for number inputs to allow partial input
    if (fieldName.includes('Price') || fieldName.includes('Amount')) {
      // Allow partial input (like decimal point)
      if (value === '' || value === '.' || value === ',') {
        setEditedData(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [field]: value
          }
        }));
        return;
      }
    }

    const { isValid, formattedValue, error, rawValue } = validateAndFormatInput(fieldName, value);
    
    if (!isValid) {
      toast.error(error);
      return;
    }

    // Special handling for salesRep and salesRepEmail
    if (fieldName === 'salesRep' || fieldName === 'salesRepEmail') {
      setEditedData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: formattedValue
        }
      }));
      return;
    }
    
    // For number fields, store the raw number value
    // For other fields, store the formatted value
    const valueToStore = typeof rawValue === 'number' ? rawValue : formattedValue;
    
    setEditedData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: valueToStore
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
  const validateAllFields = (): boolean => {
    let isValid = true;
    
    // Check all edited fields for validation
    Object.keys(editedData).forEach(category => {
      Object.entries(editedData[category]).forEach(([displayName, value]) => {
        const fieldName = getFieldNameFromDisplayName(displayName);
        
        if (fieldName && isNumericField(fieldName) && value !== "" && !isValidNumber(value)) {
          toast.error(`Pole ${displayName} obsahuje neplatnou číselnou hodnotu.`);
          isValid = false;
        }
        
        if (fieldName && isICOField(fieldName) && value && !/^\d{8}$/.test(value.toString())) {
          toast.error(`Pole ${displayName} musí obsahovat 8místné číslo.`);
          isValid = false;
        }
      });
    });
    
    return isValid;
  };
  
  // Update handleSave to ensure all price fields are stored as strings
  const handleSave = async () => {
    if (!validateAllFields()) {
      return;
    }
    
    setSaving(true);
    try {
      const processedData: Record<string, any> = {};
      
      Object.keys(editedData).forEach(category => {
        Object.entries(editedData[category]).forEach(([displayName, value]) => {
          const fieldName = getFieldNameFromDisplayName(displayName);
          if (fieldName) {
            // Convert ICO, distanceKm, installedPower and price fields to strings
            if (isICOField(fieldName) || 
                fieldName === 'installedPower' || 
                fieldName === 'distanceKm' ||
                fieldName.includes('Price') || 
                fieldName.includes('Amount')) {
              processedData[fieldName] = value ? String(value) : null;
            }
            // Convert date fields to ISO-8601 format
            else if (CATEGORY_FIELDS[category].find(f => f.field === fieldName)?.type === 'date') {
              processedData[fieldName] = new Date(value).toISOString();
            } 
            // Keep other fields as is
            else {
              processedData[fieldName] = value;
            }
          }
        });
      });
      
      // Now TypeScript knows processedData can have any string key
      if ('categorizedData' in processedData) {
        delete processedData.categorizedData;
      }
      
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        throw new Error("Failed to update client data");
      }

      // Update the displayed data with the edited data
      setCategorizedData(editedData);
      setIsEditing(false);
      toast.success("Client data updated successfully");
    } catch (error) {
      console.error("Error updating client data:", error);
      toast.error("Failed to update client data: " + (error instanceof Error ? error.message : String(error)));
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
  function renderFieldValue(category: string, field: string, value: any) {
    const fieldType = CATEGORY_FIELDS[category].find(f => f.label === field)?.type || 'text';
    const fieldName = getFieldNameFromDisplayName(field);

    if (!isEditing) {
      // Format display value for non-editing mode
      if (fieldName?.includes('Price') || fieldName?.includes('Amount')) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return (
            <span className="text-base">
              {new Intl.NumberFormat('cs-CZ', {
                style: 'currency',
                currency: 'CZK',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              }).format(num)}
            </span>
          );
        }
      }
      if (fieldName === 'distanceKm' || fieldName === 'installedPower') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return (
            <span className="text-base">
              {new Intl.NumberFormat('cs-CZ', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              }).format(num)}
            </span>
          );
        }
      }
      return (
        <span className="text-base">
          {value === true ? "Ano" : 
           value === false ? "Ne" : 
           value || "—"}
        </span>
      );
    }

    switch (fieldType) {
      case 'boolean':
        return (
          <Switch 
            checked={editedData[category][field] || false}
            onCheckedChange={(checked) => handleInputChange(category, field, checked)}
          />
        );
      case 'number':
        return (
          <Input 
            type="text"
            inputMode="decimal"
            value={editedData[category][field] || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
            placeholder={fieldName?.includes('Price') || fieldName?.includes('Amount') ? "0 Kč" : "0"}
          />
        );
      case 'date':
        return (
          <Input 
            type="date"
            value={value || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
          />
        );
      case 'email':
        return (
          <Input 
            type="email"
            value={editedData[category][field] || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
            placeholder="napr@email.cz"
          />
        );
      case 'phone':
        return (
          <Input 
            type="tel"
            value={editedData[category][field] || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
            placeholder="123 456 789"
          />
        );
      case 'ico':
        return (
          <Input 
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={editedData[category][field] || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
            placeholder="12345678"
          />
        );
      case 'gps':
        return (
          <Input 
            type="text"
            inputMode="decimal"
            value={editedData[category][field] || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
            placeholder="50.12345,14.12345"
          />
        );
      default:
        return (
          <Input 
            type="text"
            value={editedData[category][field] || ''}
            onChange={(e) => handleInputChange(category, field, e.target.value)}
            className="max-w-xs"
          />
        );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Klient nenalezen</h1>
          <Link href="/dashboard/clients">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zpět na seznam klientů
            </Button>
          </Link>
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
                {editedData[category] ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(editedData[category]).map(([field, value]) => (
                      <div key={field} className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {field}
                        </Label>
                        {renderFieldValue(category, field, value)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Žádná data k zobrazení</p>
                )}
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