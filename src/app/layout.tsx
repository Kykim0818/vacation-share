import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Vaca-Sync | 팀 휴가 현황",
  description: "GitHub Issues 기반 팀 휴가 현황 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <QueryProvider>
            <Header />
            <main>{children}</main>
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
