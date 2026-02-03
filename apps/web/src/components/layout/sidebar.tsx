"use client";

// Force import all pages to ensure they're registered before sidebar renders
import "@/lib/page-registry-init";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "../../../i18n/routing";
import { cn } from "@/lib/utils";
import { usePages } from "@/hooks/use-pages";
import { useAbility } from "@/hooks/use-ability";
import { getIcon } from "@/lib/utils/icon-mapper";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Actions, Subjects } from "@/lib/types/ability.types";
import { isValidSubject } from "@/lib/utils/subject-validation";
import { LayoutDashboard, FileText, Settings } from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  show: boolean;
}

/**
 * Sidebar component - Auto-discovering navigation from page registry
 *
 * Automatically loads pages from the page registry and filters them based on
 * user permissions. Special pages (dashboard, documents, settings) are always
 * visible. Dynamic pages are filtered by CASL abilities.
 *
 * @remarks
 * - Uses usePages hook to load registered pages
 * - Uses useAbility hook for permission checking
 * - Pages are already sorted by order from registry
 * - Invalid module names are skipped with warning
 * - Shows loading spinner while pages load
 * - Handles ability loading errors gracefully
 *
 * @example
 * ```tsx
 * <Sidebar />
 * ```
 */
export function Sidebar() {
  const t = useTranslations("common");
  const pathname = usePathname() ?? "";
  const locale = useLocale();
  const { pages, loading } = usePages();

  // Special pages (always visible, not in registry)
  const specialPages: NavigationItem[] = useMemo(
    () => [
      {
        name: t("navigation.dashboard"),
        href: "/dashboard",
        icon: LayoutDashboard,
        show: true,
      },
      {
        name: t("navigation.documents"),
        href: "/dashboard/documents",
        icon: FileText,
        show: true,
      },
      {
        name: t("navigation.settings"),
        href: "/dashboard/settings",
        icon: Settings,
        show: true,
      },
    ],
    [t]
  );

  // Get ability for permission checking
  const {
    ability,
    loading: abilityLoading,
    error: abilityError,
  } = useAbility();

  // Show warning if ability loading failed
  if (abilityError) {
    console.warn(
      "Sidebar: Failed to load abilities, showing limited navigation"
    );
  }

  // Memoize path without locale for performance
  const pathWithoutLocale = useMemo(
    () => pathname.replace(`/${locale}`, "") || "/",
    [pathname, locale]
  );

  // Filter and map registered pages based on permissions
  const dynamicPages: NavigationItem[] = useMemo(() => {
    if (!ability) {
      // If ability is null but not loading, it might be an error or user not authenticated
      if (!abilityLoading && !abilityError) {
        // User not authenticated
        return [];
      }
      return [];
    }

    return pages
      .map((page) => {
        // Validate and cast action to Actions type
        const action = (page.action || "view") as Actions;

        // Validate module is a valid Subject before using
        if (!isValidSubject(page.module)) {
          console.warn(
            `Sidebar: Invalid module name: ${page.module}. Skipping page.`
          );
          return null;
        }

        const module = page.module as Subjects;
        // Check permission: allow if user can perform action on module,
        // or if user has manage:all (admin), or manage:module
        const canAccess =
          ability.can(action, module) ||
          ability.can("manage", "all") ||
          ability.can("manage", module);

        return {
          name: page.name,
          href: page.path,
          icon: getIcon(page.icon),
          show: canAccess,
        };
      })
      .filter((item): item is NavigationItem => item !== null && item.show);
  }, [pages, ability, abilityLoading, abilityError]);

  // Combine special pages and dynamic pages
  // Special pages come first, then dynamic pages (already sorted by order)
  const navigation = useMemo(
    () => [...specialPages, ...dynamicPages],
    [specialPages, dynamicPages]
  );

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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" minHeight="auto" />
            </div>
          ) : (
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => {
                // Fix: Dashboard should only match exactly, others match with startsWith
                // This prevents both Dashboard and child routes from being active simultaneously
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
          )}
        </nav>
      </div>
    </aside>
  );
}
