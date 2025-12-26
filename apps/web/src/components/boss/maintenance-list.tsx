"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { maintenanceApi, type MaintenanceNotice } from "@/lib/api";
import { ArrowLeft, Wrench, Calendar } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface MaintenanceListProps {
  departmentId: string;
  onSelectMaintenance: (maintenanceId: string) => void;
  onBack: () => void;
}

// formatDate will be defined inside component to use locale

export function MaintenanceList({
  departmentId,
  onSelectMaintenance,
  onBack,
}: MaintenanceListProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const [notices, setNotices] = useState<MaintenanceNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceApi.getAll();
      setNotices(data);
    } catch (err) {
      console.error("Failed to load maintenance notices:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // Filter by department
  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => notice.departmentId === departmentId);
  }, [notices, departmentId]);

  // Sort by start date
  const sortedNotices = useMemo(() => {
    return [...filteredNotices].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );
  }, [filteredNotices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">{t("error.loadMaintenanceFailed")}</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("actions.back")}
      </Button>

      {sortedNotices.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">{t("empty.noMaintenance")}</p>
            <p className="text-sm mt-1">
              {t("empty.noMaintenanceDescription")}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedNotices.map((notice) => (
            <Card
              key={notice.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary active:scale-[0.98]"
              onClick={() => onSelectMaintenance(notice.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                      <Wrench className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-base">
                        {notice.title}
                      </h3>
                      {notice.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notice.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(notice.startDate)} -{" "}
                            {formatDate(notice.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
