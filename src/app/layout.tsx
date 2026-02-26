import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { SessionGuard } from "@/components/auth/session-guard";

export const metadata: Metadata = {
  title: "Vaca-Sync | 팀 휴가 현황",
  description: "GitHub Issues 기반 팀 휴가 현황 대시보드",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
<AuthProvider>
<QueryProvider>
<SessionGuard>
<Header />
<main>{children}</main>
<Toaster richColors position="top-right" />
</SessionGuard>
</QueryProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
