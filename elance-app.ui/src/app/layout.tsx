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
        className={`${dmSans.variable} font-sans antialiased selection:bg-corp-blue-600/20`}
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

