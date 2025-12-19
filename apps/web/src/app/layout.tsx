import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Better loading behavior, prevents blocking
  fallback: ["system-ui", "arial"], // Fallback fonts if Google Fonts fails
});

export const metadata: Metadata = {
  title: "ISO Document Manager",
  description: "Hệ thống quản lý tài liệu ISO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
