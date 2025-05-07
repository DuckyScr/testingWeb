import { LoginForm } from "@/components/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Přihlášení | DroneTech Klienti",
  description: "Přihlášení do systému správy klientů DroneTech",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}