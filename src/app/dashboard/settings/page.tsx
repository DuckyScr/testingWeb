"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Fetch current user data
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await response.json();
        setUser(userData);
        setProfileData({
          name: userData.name || "",
          email: userData.email || "",
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Nepodařilo se načíst uživatelská data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      toast.success("Profil byl úspěšně aktualizován");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error instanceof Error ? error.message : "Nepodařilo se aktualizovat profil");
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Hesla se neshodují");
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error("Heslo musí mít alespoň 8 znaků");
      return;
    }
    
    setUpdating(true);
    
    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update password");
      }
      
      // Reset password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      toast.success("Heslo bylo úspěšně změněno");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(error instanceof Error ? error.message : "Nepodařilo se změnit heslo");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Odhlášení proběhlo úspěšně');
        window.location.href = '/login';
      } else {
        throw new Error('Odhlášení selhalo');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Odhlášení selhalo');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Nastavení účtu</h1>
      
      <Tabs defaultValue="profile" className="w-full max-w-3xl">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="password">Heslo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informace o profilu</CardTitle>
              <CardDescription>
                Zde můžete upravit své osobní údaje.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Jméno</Label>
                  <Input
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                {/* Role section removed */}
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={updating}
                  className="px-6 py-2.5 text-base mt-4" // Added padding
                >
                  {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Uložit změny
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Změna hesla</CardTitle>
              <CardDescription>
                Zde můžete změnit své přihlašovací heslo.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Současné heslo</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nové heslo</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potvrzení nového hesla</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={updating}
                  className="px-6 py-2.5 text-base mt-4" // Added padding
                >
                  {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Změnit heslo
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Add a new section for account actions */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Akce účtu</h3>
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            className="flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Odhlásit se
          </Button>
        </div>
      </Tabs>
    </div>
  );
}