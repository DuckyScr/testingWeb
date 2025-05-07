"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Define the schema with explicit types
const loginSchema = z.object({
  email: z.string().email({ message: "Zadejte platný email." }),
  password: z.string().min(1, { message: "Heslo je povinné." }),
  rememberMe: z.boolean().default(false),
});

// Use this type definition for the form values
type FormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema) as any, // Use type assertion here to bypass the type error
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        }),
        credentials: 'include', // Add this to ensure cookies are sent/received
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 
          response.status === 401 ? "Nesprávné přihlašovací údaje" : 
          `Error ${response.status}: Přihlášení selhalo`);
      }
  
      const result = await response.json();
      toast.success("Přihlášení úspěšné");
      
      // Use window.location for a full page navigation instead of router.push
      // This ensures the page fully reloads and recognizes the auth cookie
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Přihlášení selhalo");
      
      // Clear password field on error
      form.setValue("password", "");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">DroneTech</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Přihlaste se do systému správy klientů
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="vas@email.cz" {...field} />
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
                <FormLabel>Heslo</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true);
                    }}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                  Zapamatovat přihlášení
                </FormLabel>
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Přihlašování..." : "Přihlásit se"}
          </Button>
        </form>
      </Form>
    </div>
  );
}