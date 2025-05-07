"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Settings, FileSpreadsheet, Shield, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const baseNavItems = [
  {
    name: "Přehled",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Klienti",
    href: "/dashboard/clients",
    icon: Users,
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
    name: "Admin",
    href: "/dashboard/admin",
    icon: Shield,
  },
  {
    name: "Logy",
    href: "/dashboard/logs",
    icon: ClipboardList,
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [navItems, setNavItems] = useState(baseNavItems);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-role', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.role === 'ADMIN') {
          setNavItems([...baseNavItems, ...adminNavItems]);
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
      }
    };

    checkAdminStatus();
  }, []);

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
        </ul>
      </nav>
    </div>
  );
}