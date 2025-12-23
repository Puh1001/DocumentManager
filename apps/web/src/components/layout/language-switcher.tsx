"use client";

import { useLocale } from "next-intl";
import { usePathname } from "../../../i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const languages = [
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    if (typeof window === "undefined") return;

    // next-intl's usePathname returns pathname without locale prefix
    // So we just need to prepend the new locale
    const pathWithoutLocale = pathname || "/";
    const newPath =
      pathWithoutLocale === "/"
        ? `/${newLocale}`
        : `/${newLocale}${pathWithoutLocale}`;

    // Set cookie before navigation to ensure middleware picks it up
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Use window.location for full page reload to ensure server components
    // re-render and messages are reloaded for the new locale
    window.location.href = newPath;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Change language">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLocaleChange(lang.code)}
            className={locale === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
