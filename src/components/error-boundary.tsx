"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 max-w-md mx-auto my-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
            Něco se pokazilo
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {this.state.error?.message || "Došlo k neočekávané chybě v aplikaci."}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Obnovit stránku
            </Button>
            <Button 
              onClick={() => window.location.href = "/dashboard"}
            >
              Zpět na dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}