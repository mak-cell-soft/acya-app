import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AdminLayout from "@/components/AdminLayout";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "ACYA | Command Center",
  description: "Super Admin Backoffice for ACYA Multi-Tenant Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${spaceGrotesk.variable} antialiased font-sans h-screen flex overflow-hidden bg-background`}>
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
