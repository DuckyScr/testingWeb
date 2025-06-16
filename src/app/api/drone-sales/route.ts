import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createLog } from "@/lib/logging";

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
    
    // Check if user has permission to view drone sales
    const hasViewPermission = await hasPermission(user.role, "view_drone_sales");

    if (!hasViewPermission) {
      return NextResponse.json(
        { message: "You don't have permission to view drone sales" },
        { status: 403 }
      );
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || undefined;
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
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
    
    // Fetch drone sales with pagination
    const droneSales = await prisma.droneSale.findMany({
      where,
      skip,
      take: limit,
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
    
    // Get total count for pagination
    const totalCount = await prisma.droneSale.count({ where });
    
    // Log the access
    await createLog(
      "LIST_DRONE_SALES",
      String(user.id),
      `Listed drone sales (page ${page}, limit ${limit})`,
      "DroneSale",
      null,
      "info"
    );
    
    return NextResponse.json({
      data: droneSales,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching drone sales", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check if user has permission to create drone sales
    const hasCreatePermission = await hasPermission(user.role, "create_drone_sale");
    if (!hasCreatePermission) {
      return NextResponse.json(
        { message: "You don't have permission to create drone sales" },
        { status: 403 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Handle salesRepId separately for the relation
    let salesRepId = body.salesRepId || user.id; // Default to current user if not specified
    delete body.salesRepId;
    
    // Remove salesRep if it's in the body (it should be in include, not data)
    if ('salesRep' in body) {
      delete body.salesRep;
    }
    
    // Create drone sale
    const newDroneSale = await prisma.droneSale.create({
      data: {
        ...body,
        salesRep: {
          connect: { id: salesRepId }
        }
      },
      include: {
        salesRep: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    // Log the creation
    await createLog(
      "CREATE_DRONE_SALE",
      String(user.id),
      `Created drone sale: ${newDroneSale.companyName}`,
      "DroneSale",
      String(newDroneSale.id),
      "info"
    );
    
    return NextResponse.json(newDroneSale, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating drone sale", error: String(error) },
      { status: 500 }
    );
  }
}