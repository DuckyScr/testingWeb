"use client";

import { useState, useRef } from "react";
import { ClientsTable } from "@/components/clients-table";
import { AddClientDialog } from "@/components/AddClientDialog";
import { Button } from "@/components/ui/button";
// Remove unused imports
import { Plus } from "lucide-react";

export default function ClientsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const clientsTableRef = useRef<{ fetchClients: () => void }>(null);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Klienti</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Správa a přehled všech klientů
          </p>
        </div>
      </div>
      
      <ClientsTable ref={clientsTableRef} />
      <AddClientDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSuccess={() => clientsTableRef.current?.fetchClients()}
      />
    </div>
  );
}