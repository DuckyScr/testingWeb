"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Remove this import: import { cookies } from "next/headers";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ArrowUpRight, Users, FileText, Calendar, TrendingUp } from "lucide-react";

// Define interfaces for your data types
interface StatusItem {
  name: string;
  value: number;
}

interface MonthlyAcquisition {
  name: string;
  clients: number;
}

interface DashboardStats {
  totalClients: number;
  newClientsThisMonth: number;
  pendingOffers: number;
  completedProjects: number;
  statusDistribution: StatusItem[];
  monthlyAcquisitions: MonthlyAcquisition[];
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("uživateli");
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    newClientsThisMonth: 0,
    pendingOffers: 0,
    completedProjects: 0,
    statusDistribution: [],
    monthlyAcquisitions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user info from cookie
    const getCookieData = async () => {
      try {
        const authToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1];
        
        if (authToken) {
          // Decode JWT token to get user info (client-side)
          const base64Url = authToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const { name } = JSON.parse(jsonPayload);
          if (name) {
            setUserName(name);
          }
        }
      } catch (error) {
        console.error("Error getting user data:", error);
      }
    };

    // Fetch statistics
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch real client data from your API
        const response = await fetch("/api/dashboard/stats");
        
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics");
        }
        
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        
        // Fallback to minimal data if API fails
        setStats({
          totalClients: 0,
          newClientsThisMonth: 0,
          pendingOffers: 0,
          completedProjects: 0,
          statusDistribution: [],
          monthlyAcquisitions: []
        });
      } finally {
        setLoading(false);
      }
    };

    getCookieData();
    fetchStats();
  }, []);

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ahoj, {userName}!</h1>
        <p className="text-muted-foreground">Vítejte zpět v systému DroneTech. Zde je přehled vašich klientů a projektů.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Celkem klientů</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.newClientsThisMonth} tento měsíc
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Čekající nabídky</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingOffers}</div>
                <p className="text-xs text-muted-foreground">
                  Potřebují vaši pozornost
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dokončené projekty</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Úspěšně realizováno
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Konverzní poměr</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((stats.completedProjects / stats.totalClients) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Nabídky → Realizace
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Přehled</TabsTrigger>
              <TabsTrigger value="analytics">Analýza</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Noví klienti v průběhu času</CardTitle>
                    <CardDescription>
                      Počet nově získaných klientů v posledních 6 měsících
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={stats.monthlyAcquisitions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clients" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Rozdělení podle stavu</CardTitle>
                    <CardDescription>
                      Aktuální stav klientů v systému
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={false} // Remove inline labels for cleaner look
                        >
                          {stats.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} klientů`, '']} />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          wrapperStyle={{ 
                            paddingLeft: "20px",
                            fontSize: "12px"
                          }}
                          formatter={(value, entry, index) => {
                            const { payload } = entry;
                            const percentage = ((payload?.value || 0) / stats.totalClients * 100).toFixed(1);
                            return `${value} (${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Podrobná analýza</CardTitle>
                  <CardDescription>
                    Detailní statistiky a metriky vašich klientů
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Tato sekce je ve vývoji. Brzy zde najdete podrobné analytické nástroje.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}