"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DroneSalesTable from "@/components/drone-sales-table";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import AddDroneSaleDialog from "@/components/AddDroneSaleDialog";
import { Download, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define drone sale interface based on CSV structure
interface DroneSale {
  id: string;
  companyName: string;
  ico: string;
  fveName: string;
  address: string;
  distanceKm: string;
  contactPerson: string;
  phone: string;
  email: string;
  marginGroup: string;
  status?: string;
  notes: string;
}

// Define the categories for drone sales
const CATEGORIES = [
  "základní_informace",
  "kontakty",
];

// Map for display names
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "základní_informace": "Základní informace",
  "kontakty": "Kontakty"
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

export default function DroneSalesPage() {
  const [droneSales, setDroneSales] = useState<DroneSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const canCreate = usePermission("create_drone_sale");
  const canExport = usePermission("view_drone_sales");
  
  const fetchDroneSales = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", "10");
      
      if (search) {
        queryParams.append("search", search);
      }
      
      if (status) {
        queryParams.append("status", status);
      }
      
      const response = await fetch(`/api/drone-sales?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch drone sales");
      }
      
      const data = await response.json();
      setDroneSales(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching drone sales:", error);
      toast.error("Failed to load drone sales. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDroneSales();
  }, [page, status]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchDroneSales();
  };
  
  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? '' : value);
    setPage(1); // Reset to first page when changing status
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleAddDroneSale = () => {
    setIsAddDialogOpen(true);
  };
  
  const handleAddDroneSaleSuccess = () => {
    setIsAddDialogOpen(false);
    fetchDroneSales();
    toast.success("Drone sale added successfully");
  };
  
  const handleExportXLSX = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (search) {
        queryParams.append("search", search);
      }
      
      if (status) {
        queryParams.append("status", status);
      }
      
      const response = await fetch(`/api/drone-sales/export?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to export drone sales");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drone-sales-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Drone sales exported successfully");
    } catch (error) {
      console.error("Error exporting drone sales:", error);
      toast.error("Failed to export drone sales. Please try again.");
    }
  };
  
  // Helper function to format field values
  const formatValue = (value: any): string => {
    if (value === true) return "Ano";
    if (value === false) return "Ne";
    if (value === null || value === undefined) return "—";
    return String(value);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Prodej Dronů</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Správa a přehled všech prodejů dronů
          </p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" onClick={handleExportXLSX}>
              <Download className="mr-2 h-4 w-4" />
              Export XLSX
            </Button>
          )}
          {canCreate && (
            <Button onClick={handleAddDroneSale}>Přidat prodej</Button>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Hledat podle názvu společnosti, kontaktu, emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny statusy</SelectItem>
              <SelectItem value="new">Nový</SelectItem>
              <SelectItem value="contacted">Kontaktován</SelectItem>
              <SelectItem value="offer_sent">Nabídka odeslána</SelectItem>
              <SelectItem value="offer_approved">Nabídka schválena</SelectItem>
              <SelectItem value="contract_signed">Smlouva podepsána</SelectItem>
              <SelectItem value="delivered">Dodáno</SelectItem>
              <SelectItem value="completed">Dokončeno</SelectItem>
              <SelectItem value="cancelled">Zrušeno</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Hledat</Button>
        </form>
      </div>
      
      {loading ? (
        <div className="text-center py-10">Načítání...</div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Klient</TableHead>
                            {CATEGORY_FIELDS[category].map((field) => (
                              <TableHead key={field.field}>{field.label}</TableHead>
                            ))}
                            <TableHead>Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {droneSales.length > 0 ? (
                            droneSales.map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell className="font-medium">{sale.companyName}</TableCell>
                                {CATEGORY_FIELDS[category].map((field) => (
                                  <TableCell key={field.field}>
                                    {formatValue(sale[field.field as keyof DroneSale])}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <Link href={`/dashboard/drone-sales/${sale.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={CATEGORY_FIELDS[category].length + 2} className="text-center py-4">
                                Žádné prodeje dronů nebyly nalezeny
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
      
      <AddDroneSaleDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleAddDroneSaleSuccess}
      />
    </div>
  );
}