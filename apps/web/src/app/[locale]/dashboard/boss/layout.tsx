"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { LogOut, User, Sun, Moon } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useBossTheme } from "@/components/boss/use-boss-theme";

export default function BossLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth.logout");
  const tCommon = useTranslations("common");
  const tBoss = useTranslations("boss");
  const [bossTheme, setBossTheme] = useBossTheme();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, isLoading, router, locale]);

  if (isLoading) {
    return (
      <div className="min-h-screen cyber-bg cyber-grid flex items-center justify-center boss-layout" data-boss-theme={bossTheme}>
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500" />
          <div
            className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-transparent border-r-fuchsia-500/30 border-t-fuchsia-500"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen cyber-bg boss-layout" data-boss-theme={bossTheme}>
      {/* Minimal header: floating bar with soft transition */}
      <header className="boss-header sticky top-4 z-40 mx-4 flex h-14 items-center justify-between rounded-xl border border-cyan-500/20 bg-[#0a0a15]/90 backdrop-blur-xl px-5 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 cyber-border rounded-lg flex items-center justify-center bg-cyan-500/10 transition-colors duration-200">
            <User className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <span className="font-cyber font-bold text-base cyber-neon-cyan">
              {tCommon("app.name")}
            </span>
            <span className="block text-xs text-cyan-400/70 font-cyber">
              {tCommon("app.description")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setBossTheme(bossTheme === "dark" ? "light" : "dark")}
            title={bossTheme === "dark" ? tBoss("theme.switchToLight") : tBoss("theme.switchToDark")}
            aria-label={bossTheme === "dark" ? tBoss("theme.switchToLight") : tBoss("theme.switchToDark")}
            className="cyber-button p-2 rounded-lg cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]"
          >
            {bossTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <div className="[&_button]:cyber-button [&_button]:p-2 [&_button]:rounded-lg">
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-cyber font-medium text-cyan-300">
                {user?.fullName}
              </p>
              <p className="text-xs text-cyan-400/70 font-cyber">
                {user?.department || tCommon("admin")}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title={t("title")}
            className="cyber-button p-2 rounded-lg cursor-pointer transition-colors duration-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content: padding so content is not under floating header */}
      <main className="pt-6 pb-8 px-4 min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  );
}
