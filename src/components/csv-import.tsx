"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export function CsvImport({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Vyberte CSV soubor pro import");
      return;
    }

    if (!file.name.endsWith(".csv")) {
      toast.error("Soubor musí být ve formátu CSV");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/clients", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Kontrola na chybu 403 a zobrazení specifické hlášky
        if (response.status === 403) {
          throw new Error("Nemáte oprávnění k této akci");
        } else {
          throw new Error(errorData.message || `Error ${response.status}: Import selhal`);
        }
      }

      const result = await response.json();
      toast.success(`Import úspěšný: ${result.imported} klientů importováno`);
      onImportSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error 
        ? `${error.message}` 
        : "Import selhal z neznámého důvodu");
    } finally {
      setIsUploading(false);
      setFile(null);
      
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <Button 
        onClick={handleUpload} 
        disabled={isUploading}  // Only disable when uploading
        className="whitespace-nowrap"
      >
        {isUploading ? "Importuji..." : "Importovat CSV"}
        {!isUploading && <Upload className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}