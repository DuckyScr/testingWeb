"use client";

import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
// Remove unused import: useRouter

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen mt-[-20px] mb-[-20px]">
      <div className="flex flex-col">
        <Sidebar />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}