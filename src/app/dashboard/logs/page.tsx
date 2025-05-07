"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, Clock, Filter } from "lucide-react";

// Define interfaces for log data
interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  entity: string;
  entityId: string;
  severity: "info" | "warning" | "error";
}

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  
  // Add a cache timestamp
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 60000; // 1 minute
  
  // Fetch logs from API with caching
  const fetchLogs = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Return cached data if it's still fresh and not forcing refresh
    if (!forceRefresh && logs.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/logs");
      
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Nemáte oprávnění k zobrazení logů");
          router.push("/dashboard");
          return;
        }
        if (response.status === 429) {
          toast.warning("Příliš mnoho požadavků, zkuste to později");
          return;
        }
        throw new Error("Failed to fetch logs");
      }
      
      const data = await response.json();
      setLogs(data);
      setLastFetchTime(now);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Nepodařilo se načíst logy");
    } finally {
      setLoading(false);
    }
  }, [logs.length, router]);

  // Use useEffect with empty dependency array to fetch logs only once on mount
  useEffect(() => {
    fetchLogs();
  }, []); // Empty dependency array - only runs once on component mount

  // Filter logs based on search term and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entity === entityFilter;
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    
    return matchesSearch && matchesAction && matchesEntity && matchesSeverity;
  });

  // Get unique values for filters
  const actions = Array.from(new Set(logs.map(log => log.action)));
  const entities = Array.from(new Set(logs.map(log => log.entity)));
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // Get badge color based on severity
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "destructive";
      case "warning": return "warning";
      default: return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Systémové logy</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Přehled všech změn a událostí v systému
          </p>
        </div>
        <Button onClick={() => fetchLogs(true)} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Obnovit
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>Filtrujte logy podle různých kritérií</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat v logech..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ akce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny akce</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Entita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny entity</SelectItem>
                  {entities.map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Závažnost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="info">Informace</SelectItem>
                  <SelectItem value="warning">Varování</SelectItem>
                  <SelectItem value="error">Chyba</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Čas</TableHead>
                  <TableHead>Akce</TableHead>
                  <TableHead>Uživatel</TableHead>
                  <TableHead>Entita</TableHead>
                  <TableHead className="w-[300px]">Detaily</TableHead>
                  <TableHead>Závažnost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/logs/${log.id}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                          {formatDate(log.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {log.entity}
                          {log.entityId && <span className="text-xs text-muted-foreground">({log.entityId})</span>}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={log.details}>
                        {log.details}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(log.severity) as "default" | "destructive" | "outline" | "secondary"}>
                          {log.severity === "info" && "Informace"}
                          {log.severity === "warning" && "Varování"}
                          {log.severity === "error" && "Chyba"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || actionFilter !== "all" || entityFilter !== "all" || severityFilter !== "all" 
                        ? "Žádné logy neodpovídají zadaným filtrům" 
                        : "Žádné logy k zobrazení"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}