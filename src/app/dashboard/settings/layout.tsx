import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nastavení | DroneTech Klienti",
  description: "Nastavení systému DroneTech",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}