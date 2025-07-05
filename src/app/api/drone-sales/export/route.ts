import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
    
    // Check if user has permission to export drone sales
    const hasExportPermission = await hasPermission(user.role, "export_drone_sales");
    if (!hasExportPermission) {
      return NextResponse.json(
        { message: "You don't have permission to export drone sales" },
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
    
    // Fetch all drone sales matching the criteria (no pagination for export)
    const droneSales = await prisma.droneSale.findMany({
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
    const excelData = droneSales.map(sale => ({
      'Company Name': sale.companyName,
      'Contact Person': sale.contactPerson || '',
      'Phone': sale.phone || '',
      'Email': sale.email || '',
      'Address': sale.address || '',
      'Status': sale.status.replace('_', ' '),
      'Drone Model': sale.droneModel || '',
      'Drone Type': sale.droneType || '',
      'Offer Sent Date': sale.offerSentDate ? new Date(sale.offerSentDate).toLocaleDateString() : '',
      'Offer Approved Date': sale.offerApprovedDate ? new Date(sale.offerApprovedDate).toLocaleDateString() : '',
      'Contract Signed Date': sale.contractSignedDate ? new Date(sale.contractSignedDate).toLocaleDateString() : '',
      'Invoice Date': sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString() : '',
      'Invoice Due Date': sale.invoiceDueDate ? new Date(sale.invoiceDueDate).toLocaleDateString() : '',
      'Delivery Date': sale.deliveryDate ? new Date(sale.deliveryDate).toLocaleDateString() : '',
      'Training Date': sale.trainingDate ? new Date(sale.trainingDate).toLocaleDateString() : '',
      'Sales Rep': sale.salesRep?.name || '',
      'Notes': sale.notes || '',
      'Created At': new Date(sale.createdAt).toLocaleDateString(),
      'Updated At': new Date(sale.updatedAt).toLocaleDateString()
    }));
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Drone Sales');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Create response with appropriate headers
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="drone-sales-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
    
    return response;
  } catch (error) {
    console.error("Error exporting drone sales:", error);
    return NextResponse.json(
      { message: "Error exporting drone sales", error: String(error) },
      { status: 500 }
    );
  }
}