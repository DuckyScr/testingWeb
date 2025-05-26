import { toast } from "sonner";

// Numeric fields that should only accept numbers
const NUMERIC_FIELDS = [
  "installedPower",
  "distanceKm",
  "priceExVat",
  "dataAnalysisPrice",
  "dataCollectionPrice",
  "transportationPrice",
  "firstInvoiceAmount",
  "secondInvoiceAmount",
  "finalInvoiceAmount",
  "totalPriceExVat",
  "totalPriceIncVat",
  "panelTemperature",
  "irradiance",
  "windSpeed"
];

// Float fields that should accept decimal numbers
const FLOAT_FIELDS = [
  "windSpeed",
  "irradiance"
];

// ICO fields that should trigger company lookup
const ICO_FIELDS = [
  "ico",
  "parentCompanyIco",
  "serviceCompanyIco"
];

/**
 * Validates if a value is a valid number
 */
export function isValidNumber(value: any): boolean {
  if (value === null || value === undefined || value === "") return true;
  return !isNaN(Number(value));
}

/**
 * Validates if a value is a valid ICO (Czech business ID)
 * ICO is an 8-digit number
 */
export function isValidICO(ico: string): boolean {
  if (!ico) return true;
  return /^\d{8}$/.test(ico);
}

/**
 * Checks if a field should only accept numeric input
 */
export function isNumericField(fieldName: string): boolean {
  return NUMERIC_FIELDS.includes(fieldName);
}

/**
 * Checks if a field should accept float values
 */
export function isFloatField(fieldName: string): boolean {
  return FLOAT_FIELDS.includes(fieldName);
}

/**
 * Checks if a field is an ICO field that should trigger company lookup
 */
export function isICOField(fieldName: string): boolean {
  return ICO_FIELDS.includes(fieldName);
}

/**
 * Fetches company information from ARES API based on ICO
 */
export async function lookupCompanyByICO(ico: string): Promise<{ 
  companyName?: string, 
  address?: string 
} | null> {
  if (!isValidICO(ico)) {
    toast.error("Neplatné IČO. IČO musí být 8místné číslo.");
    return null;
  }
  
  try {
    // Using ARES API to fetch company information
    const response = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        toast.error("Společnost s tímto IČO nebyla nalezena.");
      } else {
        toast.error("Nepodařilo se načíst informace o společnosti.");
      }
      return null;
    }
    
    const data = await response.json();
    
    return {
      companyName: data.obchodniJmeno || data.nazev,
      address: formatAddress(data.sidlo)
    };
  } catch (error) {
    console.error("Error fetching company data:", error);
    toast.error("Nepodařilo se načíst informace o společnosti.");
    return null;
  }
}

/**
 * Formats address from ARES API response
 */
function formatAddress(address: any): string {
  if (!address) return "";
  
  const parts = [];
  if (address.ulice) parts.push(address.ulice);
  if (address.cisloPopisne) parts.push(address.cisloPopisne);
  if (address.cisloOrientacni) parts.push(`/${address.cisloOrientacni}`);
  if (address.obec) parts.push(address.obec);
  if (address.psc) parts.push(address.psc);
  
  return parts.join(" ");
}