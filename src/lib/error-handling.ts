/**
 * Zpracuje chyby z API a vrátí vhodnou chybovou zprávu
 * @param response HTTP odpověď
 * @param defaultMessage Výchozí chybová zpráva
 * @returns Promise s chybovou zprávou
 */
export async function handleApiError(response: Response, defaultMessage: string): Promise<string> {
  // Pokud je status 403, vrátíme specifickou zprávu o oprávnění
  if (response.status === 403) {
    return "Nemáte oprávnění k této akci";
  }
  
  // Jinak se pokusíme získat chybovou zprávu z odpovědi
  try {
    const errorData = await response.json();
    return errorData.error || errorData.message || `Error ${response.status}: ${defaultMessage}`;
  } catch (e) {
    // Pokud nelze zpracovat JSON, vrátíme výchozí zprávu
    return `Error ${response.status}: ${defaultMessage}`;
  }
}