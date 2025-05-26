import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createLog } from "@/lib/logging";

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
    
    const clients = await prisma.client.findMany({
      include: {
        salesRep: {  // Use the correct relation name based on your schema
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Map the results to include the sales rep name
    const clientsWithSalesRep = clients.map(client => ({
      ...client,
      salesRep: client.salesRep ? {
        name: client.salesRep.name,
        email: client.salesRep.email
      } : {
        name: "Nepřiřazeno",
        email: ""
      }
    }));

    // Log the action
    await createLog(
      "GET_CLIENTS",
      decoded.id,
      `User fetched all clients`,
      "Client",
      "",
      "info"
    );

    return NextResponse.json(clientsWithSalesRep);
  } catch (error) {
    console.error("Error fetching clients:", error);
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
    const hasAddPermission = await hasPermission(user.role, "ADD_CLIENT");
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
    
    // Create the client with both ID and name
    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        fveAddress: data.fveAddress,
        salesRepId: dbUser.id,
        status: "Nový",
      },
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
    console.error("Error creating client:", error);
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
        salesRepId: user.id,
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