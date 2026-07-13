"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { maintenanceApi, type MaintenanceNotice, type Department, getDepartmentName, api } from "@/lib/api";
import { Wrench } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface BossMaintenanceTabProps {
  departments: Department[];
  locale: string;
  onSelectMaintenance: (maintenanceId: string) => void;
}

export function BossMaintenanceTab({
  departments,
  locale,
  onSelectMaintenance,
}: BossMaintenanceTabProps) {
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

  const getDepartmentNameForNotice = (notice: MaintenanceNotice) => {
    if (notice.department) return notice.department.name;
    if (notice.departmentId) {
      const dept = departments.find((d) => d.id === notice.departmentId);
      return dept ? getDepartmentName(dept, locale) : "";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cyber-card p-6 cyber-corner">
        <div className="text-center text-fuchsia-400 cyber-text-glow">
          <p className="font-cyber font-semibold text-lg">{t("error.loadMaintenanceFailed")}</p>
          <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
        </div>
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <div className="cyber-card p-6 cyber-corner">
        <div className="text-center py-12">
          <Wrench className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
          <p className="text-xl font-cyber font-semibold cyber-neon-cyan">{t("empty.noMaintenance")}</p>
          <p className="text-sm mt-2 text-cyan-400/60 font-cyber">{t("empty.noMaintenanceDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-card cyber-corner p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30">
          <Wrench className="h-8 w-8 text-fuchsia-400" />
        </div>
        <div>
          <p className="text-2xl font-cyber font-bold cyber-text-glow text-fuchsia-400">{notices.length}</p>
          <p className="text-sm text-cyan-400/80 font-cyber">{t("viewType.maintenance")}</p>
        </div>
      </div>

      <div className="space-y-3">
        {notices.map((notice, index) => (
          <button
            key={notice.id}
            type="button"
            onClick={() => onSelectMaintenance(notice.id)}
            className="flex items-center gap-4 p-4 border border-fuchsia-500/20 rounded-lg hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-colors duration-200 cursor-pointer group cyber-corner w-full text-left"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex-shrink-0 p-2 rounded bg-fuchsia-500/10 text-fuchsia-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-cyber font-semibold text-cyan-100 truncate">{notice.title}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-cyan-400/80 font-cyber">
                {getDepartmentNameForNotice(notice) && <span>{getDepartmentNameForNotice(notice)}</span>}
                <span>{new Date(notice.startDate).toLocaleDateString(locale)} - {new Date(notice.endDate).toLocaleDateString(locale)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
