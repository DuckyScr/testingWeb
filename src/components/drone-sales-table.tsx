import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { withPermission } from "@/components/withPermission";

interface DroneSale {
  id: number;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  droneModel: string | null;
  offerSentDate: string | null;
  contractSignedDate: string | null;
  deliveryDate: string | null;
  salesRep: {
    name: string | null;
    email: string | null;
  } | null;
}

interface DroneSalesTableProps {
  droneSales: DroneSale[];
  onRefresh: () => void;
}

function DroneSalesTable({ droneSales, onRefresh }: DroneSalesTableProps) {
  const router = useRouter();
  
  // Status badge color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'offer_sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'offer_approved':
        return 'bg-green-100 text-green-800';
      case 'contract_signed':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-teal-100 text-teal-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleRowClick = (id: number) => {
    router.push(`/dashboard/drone-sales/${id}`);
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Drone Model</TableHead>
            <TableHead>Offer Sent</TableHead>
            <TableHead>Contract Signed</TableHead>
            <TableHead>Delivery Date</TableHead>
            <TableHead>Sales Rep</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {droneSales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4">
                No drone sales found
              </TableCell>
            </TableRow>
          ) : (
            droneSales.map((sale) => (
              <TableRow 
                key={sale.id} 
                onClick={() => handleRowClick(sale.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell className="font-medium">{sale.companyName}</TableCell>
                <TableCell>
                  {sale.contactPerson && (
                    <div>{sale.contactPerson}</div>
                  )}
                  {sale.email && (
                    <div className="text-sm text-gray-500">{sale.email}</div>
                  )}
                  {sale.phone && (
                    <div className="text-sm text-gray-500">{sale.phone}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(sale.status)}>
                    {sale.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{sale.droneModel || '-'}</TableCell>
                <TableCell>{formatDate(sale.offerSentDate) || '-'}</TableCell>
                <TableCell>{formatDate(sale.contractSignedDate) || '-'}</TableCell>
                <TableCell>{formatDate(sale.deliveryDate) || '-'}</TableCell>
                <TableCell>{sale.salesRep?.name || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Export with permission check
export default withPermission(React.forwardRef(DroneSalesTable), "view_drone_sales");
