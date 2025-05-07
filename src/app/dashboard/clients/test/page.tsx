"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TestPage() {
  const router = useRouter();
  
  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
        <h1 className="text-3xl font-bold">Test Page</h1>
      </div>
      
      <div className="p-4 border rounded-md">
        <p>This is a simple test page to verify routing is working correctly.</p>
      </div>
    </div>
  );
}