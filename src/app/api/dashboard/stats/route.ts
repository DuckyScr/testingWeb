import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    // Get total clients count
    const totalClients = await prisma.client.count();
    
    // Get new clients this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newClientsThisMonth = await prisma.client.count({
      where: {
        createdAt: {  // Changed from createdAt to created_at
          gte: startOfMonth
        }
      }
    });
    
    // Get pending offers count
    const pendingOffers = await prisma.client.count({
      where: {
        status: "Nabídka odeslána"
      }
    });
    
    // Get completed projects count
    const completedProjects = await prisma.client.count({
      where: {
        status: "Dokončeno"
      }
    });
    
    // Get status distribution
    const statusGroups = await prisma.client.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    const statusDistribution = statusGroups.map(group => ({
      name: group.status || "Neuvedeno",
      value: group._count.status
    }));
    
    // Get monthly acquisitions for the last 6 months
    const monthlyAcquisitions = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const count = await prisma.client.count({
        where: {
          createdAt: {  // Changed from createdAt to created_at
            gte: month,
            lt: nextMonth
          }
        }
      });
      
      const monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
      
      monthlyAcquisitions.push({
        name: monthNames[month.getMonth()],
        clients: count
      });
    }
    
    return NextResponse.json({
      totalClients,
      newClientsThisMonth,
      pendingOffers,
      completedProjects,
      statusDistribution,
      monthlyAcquisitions
    });
  } catch (error) {
    console.error("Error generating dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard statistics" },
      { status: 500 }
    );
  }
}