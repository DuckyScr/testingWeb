import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Systémové logy | DroneTech Klienti",
  description: "Přehled všech změn a událostí v systému",
};

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}