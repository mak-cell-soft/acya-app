import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Premium Next.js Boilerplate",
  description: "High-performance Next.js starter with TanStack Query, Zustand, and Shadcn UI",
  keywords: ["Next.js", "React", "Tailwind CSS", "TypeScript", "Boilerplate", "Starter"],
  authors: [{ name: "Antigravity AI" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/20`}
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
