"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  api,
  kpiAttachmentApi,
  type Department,
  getDepartmentName,
} from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

// Departments not in KPI scope (must be exact match on code)
// NOTE: These depts are active for user/doc assignment, but should be hidden from KPI views.
const KPI_EXCLUDED_DEPARTMENT_CODES = new Set([
  "AC",
  "IT",
  "DCC",
  "LTB(E)",
  "CN_HUNG_YEN_DET_DAI",
  "CN_HUNG_YEN_DET_NGANG",
  "CN_NGHE_AN_2_DET_NGANG",
  "DET_NGANG_S",
  "PD",
  "QC",
]);

function isDepartmentInKpiScope(dept: Department): boolean {
  return !KPI_EXCLUDED_DEPARTMENT_CODES.has(dept.code);
}

interface KpiRecord {
  id: string;
  departmentId: string;
  year: number;
  title: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
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
  kpiRecords?: KpiRecord[]; // Store actual KPI records for hover details
  completedRecordIds?: Set<string>; // Store which records are completed
}

interface DepartmentKpiStatusProps {
  departments: Department[];
  onSelectDepartment: (department: Department) => void;
}

// const MONTH_KEYS = [
//   "m1",
//   "m2",
//   "m3",
//   "m4",
//   "m5",
//   "m6",
//   "m7",
//   "m8",
//   "m9",
//   "m10",
//   "m11",
//   "m12",
// ] as const;

// Check if a KPI record is completed
// Điều kiện mới: chỉ cần upload files là tính hoàn thành (status === COMPLETED)
function isKpiCompleted(record: KpiRecord): boolean {
  // KPI được coi là hoàn thành nếu status === COMPLETED
  // Status được tự động set thành COMPLETED khi upload file (backend)
  return record.status === "COMPLETED";
}

// Calculate department KPI status. If completedRecordIds is set, use it (e.g. "completed for month"); else use record.status.
function calculateDepartmentStatus(
  department: Department,
  kpiRecords: KpiRecord[],
  completedRecordIds?: Set<string>
): DepartmentKpiStatus {
  const totalKpis = kpiRecords.length;
  const completedKpis = completedRecordIds
    ? kpiRecords.filter((r) => completedRecordIds.has(r.id)).length
    : kpiRecords.filter(isKpiCompleted).length;
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
    kpiRecords, // Store KPI records for hover details
    completedRecordIds, // Store which records are completed
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

  // Hover state for department tooltip
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  // Default to previous month (e.g. Feb 2026 → show Jan 2026; Jan 2026 → show Dec 2025)
  const defaultPrevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const defaultPrevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const [selectedYear, setSelectedYear] = useState(defaultPrevYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultPrevMonth);

  // Load KPI records for all departments; when month is selected, "completed" = has ≥1 attachment for that month
  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const kpiScopeDepartments = departments.filter(isDepartmentInKpiScope);

      const statusPromises = kpiScopeDepartments.map(async (dept) => {
        try {
          const records = await api.get<KpiRecord[]>(
            `/kpi/records?departmentId=${dept.id}&year=${selectedYear}`
          );

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

          // For selected month: completed = record has ≥1 attachment for that month
          const completedIds = new Set<string>();
          await Promise.all(
            recordsWithParsedMetrics.map(async (record) => {
              try {
                const attachments = await kpiAttachmentApi.getAttachments(
                  record.id,
                  selectedMonth
                );
                if (attachments.length >= 1) {
                  completedIds.add(record.id);
                }
              } catch {
                // skip; record not completed for this month
              }
            })
          );

          return calculateDepartmentStatus(
            dept,
            recordsWithParsedMetrics,
            completedIds
          );
        } catch (err) {
          console.error(`Failed to load KPIs for department ${dept.id}:`, err);
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
  }, [departments, selectedYear, selectedMonth, tCommon]);

  useEffect(() => {
    if (departments.length > 0) {
      loadStatuses();
    } else {
      setLoading(false);
    }
  }, [departments.length, loadStatuses]);

  // Filter statuses based on selected filter
  // Only show departments:
  // - in KPI scope (exclude AC/IT/DCC/...)
  // - with KPI records (totalKpis > 0)
  const filteredStatuses = useMemo(() => {
    const deptsWithKpi = statuses.filter(
      (s) => isDepartmentInKpiScope(s.department) && s.totalKpis > 0
    );

    if (filter === "all") {
      return deptsWithKpi;
    }
    return deptsWithKpi.filter((s) => s.status === filter);
  }, [statuses, filter]);

  // Calculate summary statistics (only for departments with KPI records)
  const summary = useMemo(() => {
    // Only count KPI-scope departments with KPI records
    const deptsWithKpi = statuses.filter(
      (s) => isDepartmentInKpiScope(s.department) && s.totalKpis > 0
    );

    const total = deptsWithKpi.length;
    const completed = deptsWithKpi.filter(
      (s) => s.status === "completed"
    ).length;
    const partial = deptsWithKpi.filter((s) => s.status === "partial").length;
    const incomplete = deptsWithKpi.filter(
      (s) => s.status === "incomplete"
    ).length;

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
      {/* Header with filters, year and month selector */}
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
          <select
            className="cyber-button px-4 py-2 font-cyber text-sm bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {(
              [
                "jan",
                "feb",
                "mar",
                "apr",
                "may",
                "jun",
                "jul",
                "aug",
                "sep",
                "oct",
                "nov",
                "dec",
              ] as const
            ).map((key, i) => (
              <option
                key={key}
                value={i + 1}
                className="bg-gray-900 text-cyan-300"
              >
                {t(`months.${key}`)}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            {(["all", "completed", "partial", "incomplete"] as const).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`
                  px-3 py-1.5 text-xs font-cyber rounded transition-colors duration-200 cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]
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
                role="button"
                tabIndex={0}
                onClick={() => onSelectDepartment(status.department)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDepartment(status.department);
                  }
                }}
                onMouseEnter={(e) => {
                  setHoveredDepartmentId(status.department.id);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoveredDepartmentId(null)}
                onFocus={() => setHoveredDepartmentId(status.department.id)}
                onBlur={() => setHoveredDepartmentId(null)}
                className="cyber-card cyber-corner p-6 cursor-pointer transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_24px_rgba(77,208,225,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]"
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

      {/* Tooltip for incomplete KPIs */}
      {hoveredDepartmentId && (
        <DepartmentKpiTooltip
          departmentId={hoveredDepartmentId}
          statuses={statuses}
          selectedMonth={selectedMonth}
          mousePos={tooltipPos}
        />
      )}
    </div>
  );
}

// Tooltip component for showing incomplete KPI details
interface DepartmentKpiTooltipProps {
  departmentId: string;
  statuses: DepartmentKpiStatus[];
  selectedMonth: number;
  mousePos: { x: number; y: number };
}

function DepartmentKpiTooltip({
  departmentId,
  statuses,
  selectedMonth,
  mousePos,
}: DepartmentKpiTooltipProps) {
  const t = useTranslations("boss");
  const status = statuses.find((s) => s.department.id === departmentId);
  if (!status || !status.kpiRecords || !status.completedRecordIds) {
    return null;
  }

  const incompleteKpis = status.kpiRecords.filter(
    (record) => !status.completedRecordIds?.has(record.id)
  );

  if (incompleteKpis.length === 0) {
    return null;
  }

  // Get month label
  const monthLabels = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ] as const;
  const monthKey = monthLabels[selectedMonth - 1];

  return (
    <div
      className="fixed z-50 max-w-sm p-4 rounded-lg border border-cyan-500/50 bg-gray-900/95 backdrop-blur-sm shadow-[0_0_24px_rgba(77,208,225,0.3)] pointer-events-none"
      style={{
        left: mousePos.x + 16,
        top: mousePos.y + 16,
        // Clamp to viewport so it doesn't overflow on the right/bottom
        maxWidth: "min(24rem, calc(100vw - 2rem))",
        transform:
          mousePos.x + 400 > window.innerWidth ? "translateX(calc(-100% - 32px))" : undefined,
      }}
    >
      <div className="space-y-2">
        <h4 className="font-cyber font-bold text-sm cyber-neon-cyan">
          {status.department.name} - {t("kpiStatus.incompleteKpis")}
        </h4>
        <p className="text-xs text-cyan-400/80">
          {t("month")}: {t(`months.${monthKey}`)}
        </p>
        <div className="border-t border-cyan-500/30 pt-2">
          <p className="text-xs text-cyan-400/80 mb-2">
            {t("kpiStatus.incompleteCount")}: {incompleteKpis.length}/{status.totalKpis}
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {incompleteKpis.map((kpi) => (
              <li
                key={kpi.id}
                className="text-xs text-red-300 font-cyber border-l-2 border-red-500/50 pl-2 py-1 hover:text-red-200 hover:border-red-400/70 transition-colors"
              >
                {kpi.title || "Unnamed KPI"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
