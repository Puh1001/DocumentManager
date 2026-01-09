"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api, type Department, getDepartmentName } from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface KpiRecord {
  id: string;
  departmentId: string;
  year: number;
  title: string;
  metrics?: KpiMetric[];
}

interface KpiMetric {
  id: string;
  type: "TARGET" | "ACTUAL" | "CALCULATED";
  values: Record<string, number | null>;
}

interface DepartmentKpiStatus {
  department: Department;
  totalKpis: number;
  completedKpis: number;
  completionRate: number;
  status: "completed" | "partial" | "incomplete";
}

interface DepartmentKpiStatusProps {
  departments: Department[];
  onSelectDepartment: (department: Department) => void;
}

const MONTH_KEYS = [
  "m1",
  "m2",
  "m3",
  "m4",
  "m5",
  "m6",
  "m7",
  "m8",
  "m9",
  "m10",
  "m11",
  "m12",
] as const;

// Check if a KPI record is completed
function isKpiCompleted(record: KpiRecord): boolean {
  if (!record.metrics || record.metrics.length === 0) {
    return false;
  }

  // KPI được coi là hoàn thành nếu BẤT KỲ metric nào (TARGET / ACTUAL / CALCULATED)
  // có ít nhất một tháng đã nhập dữ liệu (null mới là chưa nhập).
  return record.metrics.some((metric) =>
    MONTH_KEYS.some((key) => {
      const value = metric.values?.[key];
      // 0 cũng là dữ liệu hợp lệ (ví dụ 0% / 0 lần sai)
      return value != null;
    })
  );
}

// Calculate department KPI status
function calculateDepartmentStatus(
  department: Department,
  kpiRecords: KpiRecord[]
): DepartmentKpiStatus {
  const totalKpis = kpiRecords.length;
  const completedKpis = kpiRecords.filter(isKpiCompleted).length;
  const completionRate = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0;

  let status: "completed" | "partial" | "incomplete";
  if (totalKpis === 0) {
    status = "incomplete";
  } else if (completionRate === 100) {
    status = "completed";
  } else if (completionRate >= 50) {
    status = "partial";
  } else {
    status = "incomplete";
  }

  return {
    department,
    totalKpis,
    completedKpis,
    completionRate,
    status,
  };
}

export function DepartmentKpiStatus({
  departments,
  onSelectDepartment,
}: DepartmentKpiStatusProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [statuses, setStatuses] = useState<DepartmentKpiStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "completed" | "partial" | "incomplete"
  >("all");

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);

  // Load KPI records for all departments
  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch KPI records for all departments in parallel
      const statusPromises = departments.map(async (dept) => {
        try {
          const records = await api.get<KpiRecord[]>(
            `/kpi/records?departmentId=${dept.id}&year=${selectedYear}`
          );

          // Parse metrics values correctly - handle both object and string
          const recordsWithParsedMetrics = records.map((record) => {
            if (!record.metrics || record.metrics.length === 0) {
              return record;
            }

            const parsedMetrics = record.metrics.map((m) => {
              let parsedValues: Record<string, number | null> = {};
              if (m.values) {
                if (typeof m.values === "string") {
                  try {
                    parsedValues = JSON.parse(m.values);
                  } catch {
                    parsedValues = {};
                  }
                } else if (typeof m.values === "object") {
                  parsedValues = m.values as Record<string, number | null>;
                }
              }
              return {
                ...m,
                values: parsedValues,
              };
            });

            return {
              ...record,
              metrics: parsedMetrics,
            };
          });

          return calculateDepartmentStatus(dept, recordsWithParsedMetrics);
        } catch (err) {
          console.error(`Failed to load KPIs for department ${dept.id}:`, err);
          // Return incomplete status on error
          return calculateDepartmentStatus(dept, []);
        }
      });

      const results = await Promise.all(statusPromises);
      setStatuses(results);
    } catch (err) {
      console.error("Failed to load department KPI statuses:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [departments, selectedYear, tCommon]);

  useEffect(() => {
    if (departments.length > 0) {
      loadStatuses();
    } else {
      setLoading(false);
    }
  }, [departments.length, loadStatuses]);

  // Filter statuses based on selected filter
  const filteredStatuses = useMemo(() => {
    if (filter === "all") {
      return statuses;
    }
    return statuses.filter((s) => s.status === filter);
  }, [statuses, filter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = statuses.length;
    const completed = statuses.filter((s) => s.status === "completed").length;
    const partial = statuses.filter((s) => s.status === "partial").length;
    const incomplete = statuses.filter((s) => s.status === "incomplete").length;

    return { total, completed, partial, incomplete };
  }, [statuses]);

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
      <div className="cyber-card p-6 cyber-corner">
        <div className="text-center text-fuchsia-400 cyber-text-glow">
          <p className="font-cyber font-semibold text-lg">
            {t("error.loadKpiStatusFailed")}
          </p>
          <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and year selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select
            className="cyber-button px-4 py-2 font-cyber text-sm bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(
              (y) => (
                <option key={y} value={y} className="bg-gray-900 text-cyan-300">
                  {t("year")} {y}
                </option>
              )
            )}
          </select>

          <div className="flex gap-2">
            {(["all", "completed", "partial", "incomplete"] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`
                  px-3 py-1.5 text-xs font-cyber rounded transition-colors
                  ${
                    filter === f
                      ? "bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 cyber-text-glow"
                      : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400/70 hover:bg-cyan-500/20"
                  }
                `}
                >
                  {t(`kpiStatus.filter.${f}`)}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 cyber-corner">
          <div className="text-sm font-cyber text-cyan-400/80 mb-1">
            {t("kpiStatus.summary.total")}
          </div>
          <div className="text-2xl font-cyber font-bold cyber-neon-cyan">
            {summary.total}
          </div>
        </div>
        <div className="cyber-card p-4 cyber-corner">
          <div className="text-sm font-cyber text-green-400/80 mb-1">
            {t("kpiStatus.summary.completed")}
          </div>
          <div className="text-2xl font-cyber font-bold text-green-400">
            {summary.completed}
          </div>
        </div>
        <div className="cyber-card p-4 cyber-corner">
          <div className="text-sm font-cyber text-yellow-400/80 mb-1">
            {t("kpiStatus.summary.partial")}
          </div>
          <div className="text-2xl font-cyber font-bold text-yellow-400">
            {summary.partial}
          </div>
        </div>
        <div className="cyber-card p-4 cyber-corner">
          <div className="text-sm font-cyber text-red-400/80 mb-1">
            {t("kpiStatus.summary.incomplete")}
          </div>
          <div className="text-2xl font-cyber font-bold text-red-400">
            {summary.incomplete}
          </div>
        </div>
      </div>

      {/* Department List */}
      {filteredStatuses.length === 0 ? (
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
            <p className="text-xl font-cyber font-semibold cyber-neon-cyan">
              {t("kpiStatus.empty.noDepartments")}
            </p>
            <p className="text-sm mt-2 text-cyan-400/60 font-cyber">
              {t("kpiStatus.empty.noDepartmentsDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStatuses.map((status, index) => {
            const StatusIcon =
              status.status === "completed"
                ? CheckCircle2
                : status.status === "partial"
                  ? AlertCircle
                  : XCircle;

            const statusColor =
              status.status === "completed"
                ? "text-green-400 border-green-500/30 bg-green-500/10"
                : status.status === "partial"
                  ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                  : "text-red-400 border-red-500/30 bg-red-500/10";

            return (
              <div
                key={status.department.id}
                className="cyber-card cyber-corner p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:border-cyan-500/40"
                onClick={() => onSelectDepartment(status.department)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="space-y-4">
                  {/* Department Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Building2 className="h-8 w-8 text-cyan-300 cyber-text-glow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-cyber font-bold text-lg cyber-neon-cyan truncate">
                          {getDepartmentName(status.department, locale)}
                        </h3>
                        <p className="text-xs font-cyber text-cyan-400/60 mt-1">
                          {status.department.code}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 p-2 rounded border ${statusColor}`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-cyber rounded border ${statusColor}`}
                    >
                      {t(`kpiStatus.status.${status.status}`)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-cyber">
                      <span className="text-cyan-400/80">
                        {t("kpiStatus.completion")}
                      </span>
                      <span className="cyber-neon-cyan font-semibold">
                        {status.completionRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-cyan-500/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          status.status === "completed"
                            ? "bg-gradient-to-r from-green-500 to-green-400"
                            : status.status === "partial"
                              ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                              : "bg-gradient-to-r from-red-500 to-red-400"
                        }`}
                        style={{ width: `${status.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* KPI Count */}
                  <div className="flex items-center gap-4 pt-2 border-t border-cyan-500/20">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-cyan-400/60" />
                      <span className="text-xs font-cyber text-cyan-400/80">
                        {t("kpiStatus.totalKpis")}:{" "}
                        <span className="cyber-neon-cyan font-semibold">
                          {status.totalKpis}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400/60" />
                      <span className="text-xs font-cyber text-green-400/80">
                        {t("kpiStatus.completedKpis")}:{" "}
                        <span className="text-green-400 font-semibold">
                          {status.completedKpis}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
