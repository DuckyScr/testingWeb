"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
// Import validation utilities
import { isValidNumber, isValidICO, lookupCompanyByICO, isNumericField, isFloatField, isICOField } from "@/lib/validation";

// Define the categories for drone sales
const CATEGORIES = [
  "základní_informace",
  "kontakty",
];

// Map for display names
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "základní_informace": "Základní informace",
  "kontakty": "Kontakty",
};

// Define fields for each category
const CATEGORY_FIELDS: Record<string, { field: string, label: string, type?: string }[]> = {
  "základní_informace": [
    { field: "companyName", label: "Název společnosti",  },
    { field: "ico", label: "IČO" },
    { field: "address", label: "Adresa FVE" },  // Changed from fveAddress to address
    { field: "distanceKm", label: "Vzdálenost tam a zpět (km)" }
  ],
  "kontakty": [
    { field: "contactPerson", label: "Kontaktní osoba" },
    { field: "phone", label: "Telefon" },
    { field: "email", label: "Email", type: "email" },
    { field: "salesRep", label: "Obchodní zástupce" },
    { field: "marginGroup", label: "Maržová skupina" }
  ],
};

// Status options for the select field

// Interface for drone sale data
interface DroneSaleData {
  id: string;
  companyName: string;
  [key: string]: any;
}

// Interface for categorized data
interface CategorizedData {
  [category: string]: {
    [field: string]: any;
  };
}

export default function DroneSaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const droneSaleId = params.id as string;
  
  const [droneSale, setDroneSale] = useState<DroneSaleData | null>(null);
  const [categorizedData, setCategorizedData] = useState<CategorizedData>({});
  const [editedData, setEditedData] = useState<CategorizedData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  useEffect(() => {
    const fetchDroneSaleData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/drone-sales/${droneSaleId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch drone sale data");
        }
        
        const data = await response.json();
        
        // Create categorized data structure
        const categorized: CategorizedData = {};
        
        // Initialize categories
        CATEGORIES.forEach(category => {
          categorized[category] = {};
        });
        
        // Populate categories with data
        Object.entries(data).forEach(([key, value]) => {
          // Find which category this field belongs to
          for (const category of CATEGORIES) {
            const fieldExists = CATEGORY_FIELDS[category].some(field => field.field === key);
            if (fieldExists) {
              categorized[category][key] = value;
              break;
            }
          }
        });
        
        setDroneSale(data);
        setCategorizedData(categorized);
        setEditedData(JSON.parse(JSON.stringify(categorized))); // Deep copy
      } catch (error) {
        console.error("Error fetching drone sale data:", error);
        toast.error("Failed to load drone sale data");
      } finally {
        setLoading(false);
      }
    };
    
    if (droneSaleId) {
      fetchDroneSaleData();
    }
  }, [droneSaleId]);

  // Handle field changes
  const handleFieldChange = async (category: string, field: string, value: any) => {
    // For numeric fields, validate and convert to number
    if (isNumericField(field)) {
      if (value && !isValidNumber(value)) {
        toast.error(`${field} musí být číslo`);
        return;
      }
      
      // Convert to appropriate number type
      if (value) {
        value = isFloatField(field) ? parseFloat(value) : parseInt(value, 10);
      }
    }
    
    // For ICO fields, validate and lookup company info
    if (isICOField(field)) {
      // Update the field immediately
      setEditedData(prev => {
        const newData = { ...prev };
        newData[category] = { ...newData[category], [field]: value };
        return newData;
      });
    
      // Perform lookup only if ICO is valid
      if (value && isValidICO(value)) {
        const companyInfo = await lookupCompanyByICO(value);
        if (companyInfo && companyInfo.companyName) {
          // Update company name and address if available
          setEditedData(prev => {
            const newData = { ...prev };
    
            // Find which category contains companyName
            for (const cat of CATEGORIES) {
              const hasCompanyName = CATEGORY_FIELDS[cat].some(f => f.field === "companyName");
              if (hasCompanyName) {
                newData[cat] = { ...newData[cat], companyName: companyInfo.companyName };
                break;
              }
            }
    
            return newData;
          });
    
          toast.success(`Název společnosti byl automaticky doplněn: ${companyInfo.companyName}`);
        }
      }
    } else {
      // For other fields, just update the value
      setEditedData(prev => {
        const newData = { ...prev };
        newData[category] = { ...newData[category], [field]: value };
        return newData;
      });
    }
    
    setHasChanges(true);
  };

  // Start editing
  const handleStartEditing = () => {
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEditing = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      discardChanges();
    }
  };

  // Discard changes
  const discardChanges = () => {
    setEditedData(JSON.parse(JSON.stringify(categorizedData))); // Reset to original data
    setIsEditing(false);
    setHasChanges(false);
    setShowDiscardDialog(false);
  };

  // Save changes
  const handleSaveChanges = async () => {
    // Validate all fields before saving
    if (!validateAllFields(editedData)) {
      return;
    }
    
    setSaving(true);
    
    try {
      // Flatten the categorized data for API
      const flattenedData: Record<string, any> = {};
      
      Object.entries(editedData).forEach(([category, fields]) => {
        Object.entries(fields).forEach(([field, value]) => {
          flattenedData[field] = value;
        });
      });
      
      const response = await fetch(`/api/drone-sales/${droneSaleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flattenedData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update drone sale");
      }
      
      const updatedData = await response.json();
      
      // Update the categorized data with the response
      const updatedCategorized: CategorizedData = {};
      
      // Initialize categories
      CATEGORIES.forEach(category => {
        updatedCategorized[category] = {};
      });
      
      // Populate categories with updated data
      Object.entries(updatedData).forEach(([key, value]) => {
        // Find which category this field belongs to
        for (const category of CATEGORIES) {
          const fieldExists = CATEGORY_FIELDS[category].some(field => field.field === key);
          if (fieldExists) {
            updatedCategorized[category][key] = value;
            break;
          }
        }
      });
      
      setDroneSale(updatedData);
      setCategorizedData(updatedCategorized);
      setEditedData(JSON.parse(JSON.stringify(updatedCategorized))); // Deep copy
      setIsEditing(false);
      setHasChanges(false);
      
      toast.success("Drone sale updated successfully");
    } catch (error) {
      console.error("Error updating drone sale:", error);
      toast.error("Failed to update drone sale");
    } finally {
      setSaving(false);
    }
  };

  // Delete drone sale
  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/drone-sales/${droneSaleId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete drone sale");
      }
      
      toast.success("Drone sale deleted successfully");
      router.push("/dashboard/drone-sales");
    } catch (error) {
      console.error("Error deleting drone sale:", error);
      toast.error("Failed to delete drone sale");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Format field value for display
  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    if (typeof value === "object" && value !== null) {
      // Handle nested objects like salesRep
      if (value.name) return value.name;
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Render field based on type
  const renderField = (category: string, fieldInfo: { field: string, label: string, type?: string }) => {
    const { field, label, type = "text" } = fieldInfo;
    const value = editedData[category][field] ?? "";
    
    if (!isEditing) {
      return (
        <div key={field} className="mb-4">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <div className="mt-1">{formatFieldValue(value)}</div>
        </div>
      );
    }
    
    switch (type) {
      case "textarea":
        return (
          <div key={field} className="mb-4">
            <Label htmlFor={field}>{label}</Label>
            <Textarea
              id={field}
              value={value || ""}
              onChange={(e) => handleFieldChange(category, field, e.target.value)}
              className="mt-1"
            />
          </div>
        );
      
      case "select":
        if (field === "status") {
          return (
            <div key={field} className="mb-4">
              <Label htmlFor={field}>{label}</Label>
              <Select
                value={value || ""}
                onValueChange={(newValue) => handleFieldChange(category, field, newValue)}
              >
                <SelectTrigger id={field} className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                </SelectContent>
              </Select>
            </div>
          );
        }
        return null;
      
      case "boolean":
        return (
          <div key={field} className="mb-4 flex items-center justify-between">
            <Label htmlFor={field}>{label}</Label>
            <Switch
              id={field}
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(category, field, checked)}
            />
          </div>
        );
      
      case "date":
        return (
          <div key={field} className="mb-4">
            <Label htmlFor={field}>{label}</Label>
            <Input
              id={field}
              type="date"
              value={value ? new Date(value).toISOString().split('T')[0] : ""}
              onChange={(e) => handleFieldChange(category, field, e.target.value)}
              className="mt-1"
            />
          </div>
        );
      
      case "number":
        return (
          <div key={field} className="mb-4">
            <Label htmlFor={field}>{label}</Label>
            <Input
              id={field}
              type="number"
              value={value || ""}
              onChange={(e) => handleFieldChange(category, field, e.target.value)}
              className="mt-1"
              step={isFloatField(field) ? "0.01" : "1"}
              min="0"
              onBlur={(e) => {
                if (e.target.value && !isValidNumber(e.target.value)) {
                  toast.error(`${label} musí být číslo`);
                }
              }}
            />
          </div>
        );
      
      default:
        // For ICO fields, add special handling
        if (isICOField(field)) {
          return (
            <div key={field} className="mb-4">
              <Label htmlFor={field}>{label}</Label>
              <Input
                id={field}
                type={type}
                value={value || ""}
                onChange={(e) => handleFieldChange(category, field, e.target.value)}
                className="mt-1"
                maxLength={8}
                pattern="\d{8}"
                onBlur={(e) => {
                  if (e.target.value && !isValidICO(e.target.value)) {
                    toast.error("IČO musí být 8místné číslo");
                  }
                }}
              />
            </div>
          );
        }
        
        return (
          <div key={field} className="mb-4">
            <Label htmlFor={field}>{label}</Label>
            <Input
              id={field}
              type={type}
              value={value || ""}
              onChange={(e) => handleFieldChange(category, field, e.target.value)}
              className="mt-1"
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!droneSale) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na seznam
          </Button>
        </div>
        <Card>
          <CardContent className="flex justify-center items-center h-32">
            <p className="text-muted-foreground">Prodej dronu nebyl nalezen</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/drone-sales")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na seznam
          </Button>
          <h1 className="text-2xl font-bold">{droneSale.companyName}</h1>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEditing} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Zrušit
              </Button>
              <Button onClick={handleSaveChanges} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ukládání...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Uložit změny
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
                Smazat
              </Button>
              <Button onClick={handleStartEditing}>
                Upravit
              </Button>
            </>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {CATEGORIES.map((category) => (
            <TabsTrigger key={category} value={category}>
              {CATEGORY_DISPLAY_NAMES[category]}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {CATEGORIES.map((category) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle>{CATEGORY_DISPLAY_NAMES[category]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {CATEGORY_FIELDS[category].map((fieldInfo) => (
                    <div key={fieldInfo.field}>
                      {renderField(category, fieldInfo)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tento prodej dronu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Prodej dronu bude trvale odstraněn z databáze.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mazání...
                </>
              ) : (
                "Smazat"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zahodit změny?</AlertDialogTitle>
            <AlertDialogDescription>
              Máte neuložené změny. Opravdu chcete zahodit všechny provedené změny?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={discardChanges}>
              Zahodit změny
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add validation before saving
const validateAllFields = (data: CategorizedData): boolean => {
  let isValid = true;
  
  Object.entries(data).forEach(([category, fields]) => {
    Object.entries(fields).forEach(([field, value]) => {
      // Validate numeric fields
      if (isNumericField(field) && value && !isValidNumber(value)) {
        toast.error(`${field} musí být číslo`);
        isValid = false;
      }
      
      // Validate ICO fields
      if (isICOField(field) && value && !isValidICO(value)) {
        toast.error(`${field} musí být 8místné číslo`);
        isValid = false;
      }
    });
  });
  
  return isValid;
};