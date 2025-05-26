"use client";

import { useState } from "react";
import { CsvImport } from "@/components/csv-import";
import { toast } from "sonner";

export default function ImportPage() {
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImportSuccess = () => {
    setImportSuccess(true);
    toast.success("Import byl úspěšně dokončen");
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Import klientů</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        Importujte klienty z CSV souboru
      </p>
      
      <div className="p-4 border rounded-md bg-muted/50">
        <h3 className="text-lg font-medium mb-2">Import klientů z CSV</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Vyberte CSV soubor s daty klientů pro import do systému.
        </p>
        <CsvImport onImportSuccess={handleImportSuccess} />
      </div>
      
      {importSuccess && (
        <div className="mt-6 p-4 border rounded-md bg-green-50 dark:bg-green-900/20">
          <p className="text-green-700 dark:text-green-300">
            Import byl úspěšně dokončen. Klienti byli přidáni do databáze.
          </p>
        </div>
      )}
    </div>
  );
}