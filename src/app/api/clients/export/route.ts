import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientVisibilityFilter } from "@/lib/client-visibility";
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user has permission to export clients
    const hasExportPermission = await hasPermission(user.role, "export_clients");
    if (!hasExportPermission) {
      return NextResponse.json(
        { message: "You don't have permission to export clients" },
        { status: 403 }
      );
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || undefined;
    
    // Build filter conditions
    const where: any = {};
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    // Apply client visibility filter
    const visibilityFilter = await getClientVisibilityFilter(user.role, user.id);
    Object.assign(where, visibilityFilter);
    
    // Fetch all clients matching the criteria (no pagination for export)
    const clients = await prisma.client.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        salesRep: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    // Transform data for Excel export
    const excelData = clients.map(client => ({
      'Název společnosti': client.companyName,
      'Kontaktní osoba': client.contactPerson || '',
      'Telefon': client.phone || '',
      'Email': client.email || '',
      'Adresa FVE': client.fveAddress || '',
      'Status': client.status.replace('_', ' '),
      'Nabídka odeslána': client.offerSentDate ? new Date(client.offerSentDate).toLocaleDateString() : '',
      'Nabídka schválena': client.offerApprovedDate ? new Date(client.offerApprovedDate).toLocaleDateString() : '',
      'Termín inspekce': client.inspectionDeadline ? new Date(client.inspectionDeadline).toLocaleDateString() : '',
      'Smlouva podepsána': client.contractSignedDate ? new Date(client.contractSignedDate).toLocaleDateString() : '',
      'První faktura': client.firstInvoiceDate ? new Date(client.firstInvoiceDate).toLocaleDateString() : '',
      'Splatnost první faktury': client.firstInvoiceDueDate ? new Date(client.firstInvoiceDueDate).toLocaleDateString() : '',
      'Druhá faktura': client.secondInvoiceDate ? new Date(client.secondInvoiceDate).toLocaleDateString() : '',
      'Splatnost druhé faktury': client.secondInvoiceDueDate ? new Date(client.secondInvoiceDueDate).toLocaleDateString() : '',
      'Finální faktura': client.finalInvoiceDate ? new Date(client.finalInvoiceDate).toLocaleDateString() : '',
      'Splatnost finální faktury': client.finalInvoiceDueDate ? new Date(client.finalInvoiceDueDate).toLocaleDateString() : '',
      'Obchodní zástupce': client.salesRep?.name || '',
      'Poznámky': client.notes || '',
      'Vytvořeno': new Date(client.createdAt).toLocaleDateString(),
      'Aktualizováno': new Date(client.updatedAt).toLocaleDateString()
    }));
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Klienti');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Create response with appropriate headers
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
    
    return response;
  } catch (error) {
    console.error("Error exporting clients:", error);
    return NextResponse.json(
      { message: "Error exporting clients", error: String(error) },
      { status: 500 }
    );
  }
}