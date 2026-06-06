import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Élancé | ERP Nouvelle Génération",
  description: "Solution ERP premium spécialisée pour l'industrie du bois et des matériaux de construction. Optimisez vos processus avec Élancé.",
  keywords: ["ERP", "Gestion de stock", "Bois", "Construction", "Élancé", "Software as a Service"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${playfairDisplay.variable} antialiased selection:bg-forest-600/20`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col bg-background text-foreground">
            {children}
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

