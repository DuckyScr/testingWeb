import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createLog } from "@/lib/logging";
import { getClientVisibilityFilter } from "@/lib/client-visibility";
import { Prisma } from '@prisma/client';

// Get all scalar fields from Prisma Client to use for dynamic selection
const allClientScalarFields = Prisma.dmmf.datamodel.models.find(m => m.name === 'Client')?.fields
  .filter(f => f.kind === 'scalar')
  .map(f => f.name) || [];

// Define fields for "základní_informace" category (copied from [id]/categorized/route.ts)
const ZAKLADNI_INFORMACE_FIELDS = [
  "companyName",
  "ico",
  "parentCompany",
  "parentCompanyIco",
  "dataBox",
  "fveName",
  "installedPower",
  "fveAddress",
  "gpsCoordinates",
  "distanceKm",
  "serviceCompany",
  "serviceCompanyIco"
];

// This would be in an environment variable in a real app
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let decoded;
    try {
      decoded = verify(authToken, JWT_SECRET) as { id: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Check if user has permission to view clients
    const hasViewPermission = await hasPermission(decoded.role, "view_clients");
    if (!hasViewPermission) {
      return NextResponse.json({ error: "You don't have permission to view clients" }, { status: 403 });
    }
    
    // Get current user's role and ID
    const currentUser = { id: decoded.id, role: decoded.role };
    const isAdmin = currentUser.role === "ADMIN";

    // Construct the select object dynamically
    const selectOptions: Prisma.ClientSelect = {
      id: true,
      companyName: true,
      salesRepId: true, // Always select salesRepId for access control
      salesRep: { // Always select salesRep for display
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    // Add all other scalar fields to the select options
    allClientScalarFields.forEach(field => {
      // Ensure we don't overwrite the explicit select for relations or core fields if they share names
      if (!(field in selectOptions)) {
        selectOptions[field as keyof typeof selectOptions] = true;
      }
    });

    // Get client visibility filter based on user permissions
    const visibilityFilter = await getClientVisibilityFilter(currentUser.role, currentUser.id);

    const clients = await prisma.client.findMany({
      where: visibilityFilter,
      select: selectOptions,
    });

    const processedClients = clients.map(client => {
      const isAssignedSalesRep = currentUser.id === client.salesRepId;

      if (client.salesRepId && !isAssignedSalesRep && !isAdmin) {
        // If client has a salesRepId and current user is not the assigned sales rep and not admin,
        // return only basic information fields.
        const filteredClient: Record<string, any> = {};
        ZAKLADNI_INFORMACE_FIELDS.forEach(field => {
          if (client[field as keyof typeof client] !== undefined) {
            filteredClient[field] = client[field as keyof typeof client];
          }
        });
        // Ensure id, companyName, salesRepId, salesRep, and salesRepEmail are always included even if filtered
        filteredClient.id = client.id;
        filteredClient.companyName = client.companyName;
        filteredClient.salesRepId = client.salesRepId;
        filteredClient.salesRep = client.salesRep;
        filteredClient.salesRepEmail = client.salesRepEmail;
        filteredClient.salesRepName = client.salesRep?.name || "Nepřiřazeno"; // Ensure salesRepName is always set

        return filteredClient;
      } else {
        // Otherwise, return all fields for the client, with salesRepName and salesRepEmail
        return {
          ...client,
          salesRepName: client.salesRep?.name || "Nepřiřazeno",
          salesRepEmail: client.salesRep?.email || ""
        };
      }
    });

    // Log the action
    await createLog(
      "GET_CLIENTS",
      decoded.id,
      `User fetched all clients`,
      "Client",
      "",
      "info"
    );

    return NextResponse.json(processedClients);
  } catch (error) {
    // console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get the auth token from cookies
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify the token
    let user;
    try {
      user = verify(authToken, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Check if user has permission to add clients
    const hasAddPermission = await hasPermission(user.role, "create_clients");
    if (!hasAddPermission) {
      return NextResponse.json({ error: "You don't have permission to add clients" }, { status: 403 });
    }
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.companyName || !data.ico) {
      return NextResponse.json(
        { error: "Název společnosti a IČO jsou povinné" },
        { status: 400 }
      );
    }
    
    // Get the current user to set as salesRep
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "Uživatel nenalezen" },
        { status: 404 }
      );
    }
    
    // Create the client with proper sales rep
    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        ico: data.ico,
        contactPerson: data.contactPerson || "",
        phone: data.phone || "",
        email: data.email || "",
        fveAddress: data.fveAddress || "",
        salesRep: data.salesRepId ? {
          connect: { id: data.salesRepId }
        } : undefined,
        salesRepEmail: data.salesRepEmail || "",
        status: "Nový"
      }
    });
    
    // Log the client creation
    await createLog(
      "CREATE_CLIENT",
      user.id,
      `User created new client: ${client.companyName}`,
      "Client",
      client.id.toString(),
      "info"
    );
    
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    // console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit klienta" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let user;
    try {
      user = verify(authToken, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Check if user has permission to delete clients
    const hasDeletePermission = await hasPermission(user.role, "delete_clients");
    if (!hasDeletePermission) {
      return NextResponse.json({ error: "You don't have permission to delete clients" }, { status: 403 });
    }
    
    const { id } = await req.json();
    
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id },
    });

    // Log the client deletion
    await createLog(
      "DELETE_CLIENT",
      user.id,
      `User deleted client: ${client.companyName}`,
      "Client",
      client.id.toString(),
      "info"
    );

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authToken = (await cookies()).get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let user;
    try {
      user = verify(authToken, JWT_SECRET) as { id: string; email: string; name: string; role: string };
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Check if user has permission to edit clients
    const hasEditPermission = await hasPermission(user.role, "edit_clients");
    if (!hasEditPermission) {
      return NextResponse.json({ error: "You don't have permission to edit clients" }, { status: 403 });
    }
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.id || !data.companyName || !data.ico) {
      return NextResponse.json(
        { error: "ID, company name, and ICO are required" },
        { status: 400 }
      );
    }
    
    const client = await prisma.client.update({
      where: { id: data.id },
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        fveAddress: data.fveAddress,
        salesRep: null,
        status: "Nový",
      },
    });
    
    // Log the client update
    await createLog(
      "UPDATE_CLIENT",
      user.id,
      `User updated client: ${client.companyName}`,
      "Client",
      client.id.toString(),
      "info"
    );
    
    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}