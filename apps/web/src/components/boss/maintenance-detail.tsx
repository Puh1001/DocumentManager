"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { maintenanceApi, type MaintenanceNotice } from "@/lib/api";
import { ArrowLeft, Wrench, Calendar, Building2, User } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface MaintenanceDetailProps {
  maintenanceId: string;
  onBack: () => void;
}

// formatDate and formatDateTime will be defined inside component to use locale

export function MaintenanceDetail({
  maintenanceId,
  onBack,
}: MaintenanceDetailProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const [notice, setNotice] = useState<MaintenanceNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceApi.getById(maintenanceId);
      setNotice(data);
    } catch (err) {
      console.error("Failed to load maintenance notice:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [maintenanceId, tCommon]);

  useEffect(() => {
    loadNotice();
  }, [loadNotice]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">{t("error.loadMaintenanceFailed")}</p>
            <p className="text-sm mt-1">
              {error || t("notFound.maintenance")}
            </p>
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

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{notice.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {notice.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {t("maintenance.description")}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {notice.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {t("maintenance.startDate")}
                </span>
              </div>
              <p className="text-base">{formatDate(notice.startDate)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{t("maintenance.endDate")}</span>
              </div>
              <p className="text-base">{formatDate(notice.endDate)}</p>
            </div>

            {notice.department && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">
                    {t("maintenance.department")}
                  </span>
                </div>
                <p className="text-base">{notice.department.name}</p>
                <p className="text-sm text-muted-foreground">
                  {notice.department.code}
                </p>
              </div>
            )}

            {notice.creator && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {t("maintenance.createdBy")}
                  </span>
                </div>
                <p className="text-base">{notice.creator.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {notice.creator.username}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{t("maintenance.createdAt")}</span>
            </div>
            <p className="text-sm">{formatDateTime(notice.createdAt)}</p>
            {notice.updatedAt !== notice.createdAt && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {t("maintenance.updatedAt")}
                  </span>
                </div>
                <p className="text-sm">{formatDateTime(notice.updatedAt)}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
