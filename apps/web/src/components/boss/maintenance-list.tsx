"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { maintenanceApi, type MaintenanceNotice } from "@/lib/api";
import { ArrowLeft, Wrench } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface MaintenanceListProps {
  departmentId: string;
  onSelectMaintenance: (maintenanceId: string) => void;
  onBack: () => void;
}

export function MaintenanceList({
  departmentId,
  onSelectMaintenance,
  onBack,
}: MaintenanceListProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
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

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center text-fuchsia-400 cyber-text-glow">
            <p className="font-cyber font-semibold text-lg">{t("error.loadMaintenanceFailed")}</p>
            <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t("actions.back")}
      </button>

      {sortedNotices.length === 0 ? (
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center py-12">
            <Wrench className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
            <p className="text-xl font-cyber font-semibold cyber-neon-cyan">{t("empty.noMaintenance")}</p>
            <p className="text-sm mt-2 text-cyan-400/60 font-cyber">
              {t("empty.noMaintenanceDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotices.map((notice, index) => (
            <div
              key={notice.id}
              className="w-full cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 p-4 border border-fuchsia-500/20 rounded-lg hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5"
              onClick={() => onSelectMaintenance(notice.id)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex-shrink-0">
                <Wrench className="h-6 w-6 text-fuchsia-400 cyber-text-glow" />
              </div>
              <h3 className="font-cyber font-bold text-base cyber-neon-magenta flex-1 break-words whitespace-normal">
                {notice.title}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
