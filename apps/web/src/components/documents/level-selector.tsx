"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useDocumentLevels } from "@/hooks/use-document-levels";
import { getDocumentLevelDisplayName } from "@/lib/types/document.types";

interface LevelSelectorProps {
  value: string;
  onChange: (levelId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function LevelSelector({
  value,
  onChange,
  required = true,
  disabled = false,
  className,
}: LevelSelectorProps) {
  const locale = useLocale();
  const t = useTranslations("documents.upload");
  const { levels, loading, error } = useDocumentLevels();

  if (loading) {
    return (
      <div className={className}>
        <label className="text-sm font-medium text-muted-foreground block mb-1.5">
          {t("level")}
        </label>
        <div className="h-9 rounded-md border border-input bg-muted/50 flex items-center px-3 text-sm text-muted-foreground">
          {t("loadingLevels")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <label className="text-sm font-medium text-muted-foreground block mb-1.5">
          {t("level")}
        </label>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label
        htmlFor="upload-level"
        className="text-sm font-medium text-muted-foreground block mb-1.5"
      >
        {t("level")}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <select
        id="upload-level"
        aria-required={required}
        aria-label={t("level")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
      >
        <option value="">{t("selectLevel")}</option>
        {levels.map((level) => (
          <option key={level.id} value={level.id}>
            {getDocumentLevelDisplayName(level, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
