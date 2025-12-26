"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, isLoading, router, locale]);

  // Redirect BOSS users to BOSS dashboard if accessing other routes
  useEffect(() => {
    if (!isLoading && user) {
      const isBoss = user.roles?.includes("boss");
      const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
      const isBossRoute =
        pathWithoutLocale === "/dashboard/boss" ||
        pathWithoutLocale.startsWith("/dashboard/boss/");

      if (isBoss && !isBossRoute) {
        router.push(`/${locale}/dashboard/boss`);
      }
    }
  }, [user, isLoading, router, locale, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if current route is BOSS route
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
  const isBossRoute =
    pathWithoutLocale === "/dashboard/boss" ||
    pathWithoutLocale.startsWith("/dashboard/boss/");

  // BOSS route - let BOSS layout handle everything (no Sidebar/Header)
  if (isBossRoute) {
    return <>{children}</>;
  }

  // Regular dashboard route - show Sidebar and Header
  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
