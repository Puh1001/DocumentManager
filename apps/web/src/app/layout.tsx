import type { Metadata } from "next";
import "./globals.css";
import { routing } from "../../i18n/routing";

export const metadata: Metadata = {
  title: "ISO Document Manager",
  description: "Hệ thống quản lý tài liệu ISO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout provides html/body for root redirect page
  // Locale layout will override this for [locale] routes
  return (
    <html lang={routing.defaultLocale}>
      <body>{children}</body>
    </html>
  );
}
