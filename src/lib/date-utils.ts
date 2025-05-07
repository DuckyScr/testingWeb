/**
 * Utility functions for handling dates in the application
 */

/**
 * Converts a date string or Date object to a valid Prisma DateTime
 * @param date The date to convert (string or Date object)
 * @returns A valid Date object for Prisma or null if the input is invalid
 */
export function toPrismaDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    // If it's already a Date object
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    
    // If it's a string in YYYY-MM-DD format (without time)
    if (typeof date === 'string' && date.length === 10 && date.includes('-')) {
      return new Date(`${date}T00:00:00.000Z`);
    }
    
    // Otherwise try to parse it as a regular date
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.error('Error converting date:', error);
    return null;
  }
}

/**
 * Processes an object with potential date fields and converts them to Prisma-compatible dates
 * @param data Object containing date fields
 * @param dateFields Array of field names that should be treated as dates
 * @returns A new object with properly formatted dates
 */
export function processDates<T extends Record<string, any>>(
  data: T, 
  dateFields: string[]
): T {
  const result = { ...data };
  
  for (const field of dateFields) {
    if (field in result && result[field] !== undefined) {
      (result as Record<string, any>)[field] = toPrismaDate(result[field]);
    }
  }
  
  return result;
}