"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Country codes for phone numbers
const countryCodes = [
  { code: "+420", country: "Česká republika" },
  { code: "+421", country: "Slovensko" },
  { code: "+48", country: "Polsko" },
  { code: "+49", country: "Německo" },
  { code: "+43", country: "Rakousko" },
  { code: "+36", country: "Maďarsko" },
];

type ClientFormData = {
  companyName: string;
  ico: string;
  contactPerson: string;
  phone: string;
  countryCode: string;
  email: string;
  fveAddress: string;
  // Add other fields as necessary
};

export function AddClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    companyName: "",
    ico: "",
    contactPerson: "",
    phone: "",
    countryCode: "+420", // Default to Czech Republic
    email: "",
    fveAddress: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If ICO is 8 digits, trigger company lookup
    if (name === "ico" && value.length === 8 && /^\d+$/.test(value)) {
      lookupCompanyByIco(value);
    }
  };

  const handleCountryCodeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, countryCode: value }));
  };

  // Function to lookup company information by ICO
  const lookupCompanyByIco = async (ico: string) => {
    setIsLookingUp(true);
    try {
      // Call the ARES API (Czech Business Register)
      const response = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.warning("Společnost s tímto IČO nebyla nalezena");
        } else {
          throw new Error(`API responded with status: ${response.status}`);
        }
        return;
      }
      
      const data = await response.json();
      
      // Update form with company data
      if (data) {
        setFormData(prev => ({
          ...prev,
          companyName: data.obchodniJmeno || data.nazev || prev.companyName,
          fveAddress: data.sidlo?.textovaAdresa || prev.fveAddress,
          // Add more fields as available in the API response
        }));
        toast.success("Informace o společnosti byly načteny");
      }
    } catch (error) {
      console.error("Error looking up company:", error);
      toast.error(error instanceof Error 
        ? `Nepodařilo se načíst informace o společnosti: ${error.message}` 
        : "Nepodařilo se načíst informace o společnosti");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length <= 9) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
  };

  // Handle phone input with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatPhoneNumber(rawValue);
    setFormData(prev => ({ ...prev, phone: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.companyName.trim() || !formData.ico.trim()) {
        throw new Error("Vyplňte všechna povinná pole");
      }

      // Combine country code and phone number
      const fullPhoneNumber = formData.phone ? `${formData.countryCode} ${formData.phone}` : "";
      
      // Prepare data for submission
      const submissionData = {
        ...formData,
        phone: fullPhoneNumber,
      };
      
      // Remove countryCode as it's not part of the client model
      const { countryCode, ...clientData } = submissionData;

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Kontrola na chybu 403 a zobrazení specifické hlášky
        if (response.status === 403) {
          throw new Error("Nemáte oprávnění k této akci");
        } else {
          throw new Error(errorData.message || `Error ${response.status}: Failed to create client`);
        }
      }

      const result = await response.json();
      toast.success("Klient byl úspěšně vytvořen");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error(error instanceof Error ? error.message : "Nepodařilo se vytvořit klienta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Check if form has been modified
    const isFormModified = Object.values(formData).some(value => value !== "");
    
    if (isFormModified) {
      setShowConfirmDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Přidat nového klienta</DialogTitle>
              <DialogDescription>
                Vyplňte informace o novém klientovi. Povinná pole jsou označena *.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ico">IČO *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ico"
                      name="ico"
                      value={formData.ico}
                      onChange={handleChange}
                      required
                      maxLength={8}
                      placeholder="12345678"
                    />
                    {isLookingUp && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Po zadání IČO se automaticky doplní údaje o společnosti
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Název společnosti *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Kontaktní osoba</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.countryCode} 
                      onValueChange={handleCountryCodeChange}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="+420" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.code} ({country.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="123 456 789"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fveAddress">Adresa FVE</Label>
                  <Input
                    id="fveAddress"
                    name="fveAddress"
                    value={formData.fveAddress}
                    onChange={handleChange}
                  />
                </div>
              </div>
              {/* Add more fields as necessary */}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Zrušit
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Ukládám..." : "Uložit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete zrušit vytváření klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Všechny zadané údaje budou ztraceny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ne, pokračovat v úpravách</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowConfirmDialog(false);
              onOpenChange(false);
            }}>
              Ano, zrušit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}