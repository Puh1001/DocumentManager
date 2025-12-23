"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "../../../i18n/routing";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
  FolderOpen,
  BarChart2,
} from "lucide-react";

export function Sidebar() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const locale = useLocale();

  const navigation = [
    {
      name: t("navigation.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: t("navigation.documents"),
      href: "/dashboard/documents",
      icon: FileText,
    },
    { name: t("navigation.kpi"), href: "/dashboard/kpi", icon: BarChart2 },
    {
      name: t("navigation.departments"),
      href: "/dashboard/departments",
      icon: FolderOpen,
    },
    { name: t("navigation.users"), href: "/dashboard/users", icon: Users },
    {
      name: t("navigation.permissions"),
      href: "/dashboard/permissions",
      icon: Shield,
    },
    {
      name: t("navigation.settings"),
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-lg">{t("app.name")}</span>
            <span className="block text-xs text-muted-foreground">
              {t("app.description")}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map((item) => {
              // Fix: Dashboard should only match exactly, others match with startsWith
              // This prevents both Dashboard and child routes from being active simultaneously
              // Remove locale prefix for comparison
              const pathWithoutLocale =
                pathname.replace(`/${locale}`, "") || "/";
              const isActive =
                item.href === "/dashboard"
                  ? pathWithoutLocale === "/dashboard"
                  : pathWithoutLocale === item.href ||
                    pathWithoutLocale.startsWith(item.href + "/");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200",
                        isActive && "scale-105"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
