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
  "irradiance",
  "distanceKm"
];

// ICO fields that should trigger company lookup
const ICO_FIELDS = [
  "ico",
  "parentCompanyIco",
  "serviceCompanyIco"
];

export type ValidationResult = {
  isValid: boolean;
  formattedValue: string | number | null;
  error?: string;
  rawValue: string | number | null;
};

export type CompanyLookupResult = {
  isValid: boolean;
  data?: {
    companyName: string;
    address: string;
    dataBox: string;
  };
  error?: string;
};

/**
 * Validates if a value is a valid number
 */
export function isValidNumber(value: any): ValidationResult {
  if (value === '' || value === null || value === undefined) {
    return {
      isValid: true,
      formattedValue: null,
      rawValue: null
    };
  }

  const stringValue = String(value).replace(/\s/g, '').replace(',', '.');

  // Regex to check if the string represents a valid number (integer or float)
  // Allows optional leading/trailing spaces and one decimal point
  if (!/^\d*\.?\d*$/.test(stringValue) || stringValue === '.') {
    return {
      isValid: false,
      formattedValue: null,
      error: 'Neplatné číslo',
      rawValue: value
    };
  }

  const num = parseFloat(stringValue);
  if (isNaN(num)) {
    // This case should ideally not be hit with the regex above, but as a fallback
    return {
      isValid: false,
      formattedValue: null,
      error: 'Neplatné číslo',
      rawValue: value
    };
  }

  return {
    isValid: true,
    formattedValue: num,
    rawValue: num
  };
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
export const lookupCompanyByICO = async (ico: string): Promise<CompanyLookupResult> => {
  try {
    const response = await fetch(`/api/company-lookup?ico=${ico}`);
    if (!response.ok) {
      return {
        isValid: false,
        error: 'Nepodařilo se načíst data o společnosti'
      };
    }
    const data = await response.json();
    return {
      isValid: true,
      data: {
        companyName: data.companyName || '',
        address: data.address || '',
        dataBox: data.dataBox || ''
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Chyba při načítání dat o společnosti'
    };
  }
};

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