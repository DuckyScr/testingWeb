"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Update the ROLES constant
const ROLES = {
    EXTERNAL: "EXTERNAL",
    INTERNAL: "INTERNAL",
    ADMIN: "ADMIN",
    ADMINISTRATION: "ADMINISTRATION"
  } as const;

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = typeof ROLES[keyof typeof ROLES];

// Form schema for new user registration
const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(Object.values(ROLES) as [Role, ...Role[]]),
});

type FormData = z.infer<typeof userSchema>;

// Add interface for User
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// Add interface for RolePermissions
interface RolePermissions {
  [permission: string]: {
    [role: string]: boolean;
  };
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({});
  const [loading, setLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "EXTERNAL" as Role, // Changed from "USER" to "EXTERNAL"
    },
  });

  // Fetch users and role permissions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersResponse, permissionsResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/permissions"),
        ]);

        if (!usersResponse.ok || !permissionsResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const [usersData, permissionsData] = await Promise.all([
          usersResponse.json(),
          permissionsResponse.json(),
        ]);

        setUsers(usersData);
        setRolePermissions(permissionsData);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      toast.success("User created successfully");
      setShowNewUserDialog(false);
      // Refresh users list
      const updatedUsers = await fetch("/api/admin/users").then(res => res.json());
      setUsers(updatedUsers);
    } catch (error) {
      toast.error("Failed to create user");
    }
  };

  const updateUserRole = async (userId: any, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user role");
      }

      toast.success("User role updated successfully");
      // Refresh users list
      const updatedUsers = await fetch("/api/admin/users").then(res => res.json());
      setUsers(updatedUsers);
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const updatePermission = async (role: string, permission: string, value: boolean) => {
    try {
      const response = await fetch(`/api/admin/permissions/${role}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [permission]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update permission");
      }

      toast.success("Permission updated successfully");
      // Refresh permissions
      const updatedPermissions = await fetch("/api/admin/permissions").then(res => res.json());
      setRolePermissions(updatedPermissions);
    } catch (error) {
      toast.error("Failed to update permission");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast.success("User deleted successfully");
      // Refresh users list
      const updatedUsers = await fetch("/api/admin/users").then(res => res.json());
      setUsers(updatedUsers);
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => setShowNewUserDialog(true)}>Add New User</Button>
      </div>

      {/* Users Table */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(value) => updateUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ROLES).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteUser(user.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Role Permissions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Role Permissions</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission</TableHead>
              {Object.values(ROLES).map((role) => (
                <TableHead key={role}>{role}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              "view_clients",
              "create_clients",
              "edit_clients",
              "delete_clients",
              "import_clients",
              "edit_client_name",
              "edit_client_contact",
              "edit_client_address",
              "edit_client_status",
              "edit_client_documents",
              "edit_client_invoices"
            ].map((permission) => (
              <TableRow key={permission}>
                <TableCell>{permission}</TableCell>
                {Object.values(ROLES).map((role) => (
                  <TableCell key={`${role}-${permission}`}>
                    <Switch
                      checked={rolePermissions[permission]?.[role] || false}
                      onCheckedChange={(checked) =>
                        updatePermission(role, permission, checked)
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full border rounded p-2"
                      >
                        {Object.values(ROLES).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}