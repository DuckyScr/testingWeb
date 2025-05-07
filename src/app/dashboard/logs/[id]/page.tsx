"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";

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

export default function LogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [log, setLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogDetails = async () => {
      try {
        const response = await fetch(`/api/logs/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 403) {
            toast.error("Nemáte oprávnění k zobrazení logu");
            router.push("/dashboard/logs");
            return;
          }
          throw new Error("Failed to fetch log details");
        }
        
        const data = await response.json();
        setLog(data);
      } catch (error) {
        console.error("Error fetching log details:", error);
        toast.error("Nepodařilo se načíst detail logu");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchLogDetails();
    }
  }, [params.id, router]);

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "destructive";
      case "warning": return "secondary";  // Changed from "warning" to "secondary"
      default: return "default";  // Changed from "secondary" to "default"
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "error": return "Chyba";
      case "warning": return "Varování";
      default: return "Informace";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na seznam
          </Button>
        </div>
        <Card>
          <CardContent className="flex justify-center items-center h-32">
            <p className="text-muted-foreground">Log nebyl nalezen</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět na seznam
        </Button>
        <h1 className="text-2xl font-bold">Detail logu</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle>{log.action}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {formatDate(log.timestamp)}
              </p>
            </div>
            <Badge variant={getSeverityColor(log.severity)}>
              {getSeverityText(log.severity)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Uživatel</h3>
              <p>{log.user}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Entita</h3>
              <p>{log.entity} {log.entityId && <span className="text-sm text-muted-foreground">({log.entityId})</span>}</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Detaily</h3>
            <p className="whitespace-pre-wrap">{log.details}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}