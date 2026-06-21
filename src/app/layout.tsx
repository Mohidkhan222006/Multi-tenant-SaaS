import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import QueryProvider from "@/providers/QueryProvider";
import ErrorBoundary from "@/components/organisms/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aether - Multi-Tenant Project Management",
  description: "A secure, premium multi-tenant project management SaaS with database RLS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-slate-950 text-slate-100`}
      >
        <AuthProvider>
          <QueryProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
