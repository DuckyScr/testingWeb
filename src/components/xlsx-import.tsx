import { useState } from "react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface XLSXImportProps {
  onImportSuccess: () => void;
}

export function XLSXImport({ onImportSuccess }: XLSXImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      const data = await readXLSXFile(selectedFile);
      setFile(selectedFile);
      setError(null);
    } catch (err) {
      setError('Chyba při čtení souboru. Zkontrolujte, zda je to platný XLSX soubor.');
      setFile(null);
    }
  };

  const readXLSXFile = async (file: File): Promise<any[]> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (data) {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } else {
            reject(new Error('Nepodařilo se načíst data ze souboru'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Chyba při čtení souboru'));
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Nahrávejte soubor nejdřív');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      toast.success(`Úspěšně importováno ${result.imported} klientů`);
      onImportSuccess();
    } catch (err) {
      setError('Chyba při importu: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        className="hidden"
        id="xlsx-upload"
      />
      <label
        htmlFor="xlsx-upload"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
      >
        <Upload className="h-4 w-4 mr-2" />
        {file ? file.name : 'Vybrat soubor'}
      </label>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleImport}
        disabled={!file || loading}
        className="h-9"
      >
        {loading ? 'Importuje se...' : 'Importovat'}
      </Button>
      
      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  );
}
