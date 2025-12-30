"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
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

  if (error || !notice) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center text-fuchsia-400 cyber-text-glow">
            <p className="font-cyber font-semibold text-lg">
              {t("error.loadMaintenanceFailed")}
            </p>
            <p className="text-sm mt-2 text-cyan-300/90">
              {error || t("notFound.maintenance")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("actions.back")}
      </button>

      <div className="cyber-card cyber-corner">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6 pb-4 border-b border-cyan-500/20">
            <div className="p-3 cyber-border rounded-lg bg-fuchsia-500/10">
              <Wrench className="h-6 w-6 text-fuchsia-400 cyber-text-glow" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-cyber font-bold cyber-neon-magenta">
                {notice.title}
              </h1>
            </div>
          </div>
          <div className="space-y-6">
            {notice.description && (
              <div>
                <h3 className="text-sm font-cyber font-semibold mb-3 text-cyan-300/80">
                  {t("maintenance.description")}
                </h3>
                <p className="text-sm font-cyber text-cyan-200/90 whitespace-pre-wrap leading-relaxed">
                  {notice.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">
                    {t("maintenance.startDate")}
                  </span>
                </div>
                <p className="text-base font-cyber text-cyan-200">
                  {formatDate(notice.startDate)}
                </p>
              </div>

              <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">
                    {t("maintenance.endDate")}
                  </span>
                </div>
                <p className="text-base font-cyber text-cyan-200">
                  {formatDate(notice.endDate)}
                </p>
              </div>

              {notice.department && (
                <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                  <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                    <Building2 className="h-4 w-4" />
                    <span className="font-semibold">
                      {t("maintenance.department")}
                    </span>
                  </div>
                  <p className="text-base font-cyber text-cyan-200">
                    {notice.department.name}
                  </p>
                  <p className="text-sm font-cyber text-cyan-300/70">
                    {notice.department.code}
                  </p>
                </div>
              )}

              {notice.creator && (
                <div className="space-y-2 cyber-corner p-4 bg-cyan-500/5">
                  <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">
                      {t("maintenance.createdBy")}
                    </span>
                  </div>
                  <p className="text-base font-cyber text-cyan-200">
                    {notice.creator.fullName}
                  </p>
                  <p className="text-sm font-cyber text-cyan-300/70">
                    {notice.creator.username}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">
                  {t("maintenance.createdAt")}
                </span>
              </div>
              <p className="text-sm font-cyber text-cyan-200">
                {formatDateTime(notice.createdAt)}
              </p>
              {notice.updatedAt !== notice.createdAt && (
                <>
                  <div className="flex items-center gap-2 text-sm font-cyber text-cyan-300/80 mt-4">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">
                      {t("maintenance.updatedAt")}
                    </span>
                  </div>
                  <p className="text-sm font-cyber text-cyan-200">
                    {formatDateTime(notice.updatedAt)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
