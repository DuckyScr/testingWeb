import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DroneTech Klienti",
  description: "Systém správy klientů DroneTech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={`${inter.className} min-h-screen p-4`}>
        <div className="max-w-screen-2xl mx-auto">
          {children}
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
