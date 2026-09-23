import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Élancé | ERP Nouvelle Génération — Produits, Services, Chantiers & Production",
  description: "Solution ERP SaaS tout-en-un pour le négoce bois, la gestion des produits et services, la production d'atelier et les chantiers en Tunisie. Connectez achats, stocks, prestations, ventes et comptabilité avec Élancé.",
  keywords: [
    "ERP",
    "Gestion des articles",
    "Produits et services",
    "Articles de service",
    "Facturation des services",
    "Facturation produits et services",
    "Facture mixte",
    "Gestion des ventes",
    "Gestion de stock",
    "Gestion de production",
    "Logiciel de gestion de production",
    "Production industrielle",
    "Suivi de production",
    "Gestion des matières premières",
    "Ordre de fabrication",
    "ERP production Tunisie",
    "Logiciel ERP Tunisie",
    "Bois",
    "Construction",
    "Chantiers BTP",
    "Élancé",
    "ACYA",
    "Software as a Service"
  ],
  authors: [{ name: "ACYA Consulting" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} font-sans antialiased selection:bg-corp-blue-600/20`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col bg-background text-foreground">
            {children}
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

