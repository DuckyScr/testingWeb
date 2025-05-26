"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Settings, FileSpreadsheet, Shield, ClipboardList, ShieldHalf, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Klienti",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    name: "Prodej Dronů",
    href: "/dashboard/drone-sales",
    icon: ShieldHalf,
  },
  {
    name: "Import dat",
    href: "/dashboard/import",
    icon: FileSpreadsheet,
  },
  {
    name: "Nastavení",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const adminNavItems = [
  {
    name: "Admin Panel",
    href: "/dashboard/admin",
    icon: Shield,
  },
  {
    name: "System Logs",
    href: "/dashboard/logs",
    icon: ClipboardList,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/check-role');
        const data = await response.json();
        setUserRole(data.role);
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUserRole();
  }, []);
  
  const isAdmin = userRole === 'ADMIN';
  
  return (
    <div className="flex flex-col h-screen border-r bg-background w-64">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-xl font-semibold">DroneTech</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}

          {isAdmin && (
            <>
              <li className="pt-6">
                <div className="px-3 text-xs font-semibold text-muted-foreground">
                  Admin
                </div>
              </li>
              {adminNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}