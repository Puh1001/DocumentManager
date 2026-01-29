"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  LineController,
  PointElement,
  Tooltip,
  Legend,
  Title,
  type ChartDataset,
  type ChartData,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { PageMetadata } from "@/lib/types/page-metadata";
import { registerPage } from "@/lib/page-registry";
import { PageGuard } from "@/components/page-guard";
import { useAuth } from "@/lib/auth-context";
import {
  getAccessibleDepartments,
  canCreateKpi,
  getUserDepartment,
  hasKpiReadAllAccess,
} from "@/lib/kpi-access-helpers";
import { useToast } from "@/hooks/use-toast";
import type { Department } from "@/lib/types/department.types";
import { handleKpiApiError } from "@/lib/utils/kpi-error-handler";
import { toApiError } from "@/lib/types/api-error.types";
import { KpiAttachmentUpload } from "@/components/boss/kpi-attachment-upload";
import { KpiAttachmentList } from "@/components/boss/kpi-attachment-list";
import { KpiAttachmentViewer } from "@/components/boss/kpi-attachment-viewer";
import { kpiAttachmentApi, KpiAttachment } from "@/lib/api";
import { useCanAccess } from "@/hooks/use-can-access";

export const pageMetadata: PageMetadata = {
  path: "/dashboard/kpi",
  name: "KPI Tracking",
  module: "Kpi",
  action: "view",
  icon: "TrendingUp",
  order: 7,
  requiresAuth: true,
};

// Register page metadata
registerPage(pageMetadata);

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
);

// Department type imported from shared types

type MetricType = "TARGET" | "ACTUAL" | "CALCULATED";

interface KpiMetric {
  id: string;
  name: string;
  type: MetricType;
  sortOrder: number;
  values: Record<string, number | null>;
  createdAt?: string;
  updatedAt?: string;
}

type DisplayType = "PERCENTAGE" | "COUNT";
type RowMode = "SINGLE" | "DOUBLE";

// Departments not in KPI scope (must be exact match on code)
// Keep consistent with Boss KPI Status + backend guard.
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

interface KpiRecord {
  id: string;
  departmentId: string;
  year: number;
  title: string;
  target: string;
  targetValue?: number | null;
  displayType?: DisplayType;
  rowMode?: RowMode;
  metrics: KpiMetric[];
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

// Month labels will be generated using translations in the component

function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Local storage key for KPI backup
function getKpiBackupKey(departmentId: string, year: number) {
  return `kpi_backup_${departmentId}_${year}`;
}

// Custom debounce hook
function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export default function KpiPage() {
  const t = useTranslations("kpi");
  const tTable = useTranslations("kpi.table");
  const { user } = useAuth();
  const { toast } = useToast();
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | "">(
    "",
  );
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [hasAttemptedAutoCreate, setHasAttemptedAutoCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const initialRecordsRef = useRef<string>(""); // Store serialized initial state
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [selectedDisplayType, setSelectedDisplayType] =
    useState<DisplayType>("PERCENTAGE");
  const [selectedRowMode, setSelectedRowMode] = useState<RowMode>("DOUBLE");
  const [attachmentsMap, setAttachmentsMap] = useState<
    Map<string, KpiAttachment[]>
  >(new Map());
  const [viewerState, setViewerState] = useState<{
    attachmentId: string;
    fileName: string;
  } | null>(null);

  const canViewAttachments = useCanAccess("view", "Kpi");
  const canDeleteAttachments = useCanAccess("delete", "Kpi");
  const canCreateAttachments = useCanAccess("create", "Kpi");

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Filter departments based on user access
  const departments = useMemo(() => {
    return getAccessibleDepartments(user, allDepartments);
  }, [user, allDepartments]);

  const selectedDepartment = useMemo(() => {
    if (!selectedDepartmentId) return null;
    return allDepartments.find((d) => d.id === selectedDepartmentId) || null;
  }, [allDepartments, selectedDepartmentId]);

  const isSelectedDepartmentInKpiScope = useMemo(() => {
    if (!selectedDepartment) return false;
    return !KPI_EXCLUDED_DEPARTMENT_CODES.has(selectedDepartment.code);
  }, [selectedDepartment]);

  // Check if user can create KPIs
  const canCreate = canCreateKpi(user);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await api.get<Department[]>("/departments");
        setAllDepartments(data);
        // Filter will happen in useMemo
      } catch (err: unknown) {
        handleKpiApiError(err, "tải danh sách bộ môn", {
          onOther: () => setError("Không tải được danh sách bộ môn"),
        });
        setLoading(false);
      }
    };
    loadDepartments();
  }, [toast]);

  // Update selected department when filtered departments change
  useEffect(() => {
    if (departments.length > 0 && !selectedDepartmentId) {
      // Set first department as default when departments are loaded and no department is selected
      setSelectedDepartmentId(departments[0].id);
    } else if (departments.length === 0) {
      // No accessible departments - clear selection
      setSelectedDepartmentId("");
      setLoading(false);
    } else if (
      selectedDepartmentId &&
      !departments.find((d) => d.id === selectedDepartmentId)
    ) {
      // Current selected department is no longer accessible - reset to first available
      setSelectedDepartmentId(departments[0].id);
    }
    // Reset auto-create flag when department or year changes
    setHasAttemptedAutoCreate(false);
  }, [departments, selectedDepartmentId, selectedYear]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditMode) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, isEditMode]);

  useEffect(() => {
    const loadRecords = async () => {
      if (!selectedDepartmentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await api.get<KpiRecord[]>(
          `/kpi/records?departmentId=${selectedDepartmentId}&year=${selectedYear}`,
        );

        // Ensure all records have metrics with proper values format
        const recordsWithMetrics = await Promise.all(
          list.map(async (record) => {
            // Parse values correctly - handle both object and string
            const metrics = record.metrics.map((m) => {
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

            // Ensure each record has exactly 2 metrics (TARGET and ACTUAL)
            const targetMetric = metrics.find((m) => m.type === "TARGET");
            const actualMetric = metrics.find((m) => m.type === "ACTUAL");

            // Only create missing metrics, don't recreate existing ones
            if (!targetMetric) {
              const baseValues: Record<string, number | null> = {};
              MONTH_KEYS.forEach((key) => {
                baseValues[key] = null;
              });

              const newTarget = await api.post<KpiMetric>("/kpi/metrics", {
                kpiRecordId: record.id,
                name: "",
                type: "TARGET",
                sortOrder: 1,
                values: JSON.stringify(baseValues),
              });
              metrics.push({
                ...newTarget,
                values: baseValues,
              });
            }

            if (!actualMetric) {
              const baseValues: Record<string, number | null> = {};
              MONTH_KEYS.forEach((key) => {
                baseValues[key] = null;
              });

              const newActual = await api.post<KpiMetric>("/kpi/metrics", {
                kpiRecordId: record.id,
                name: "",
                type: "ACTUAL",
                sortOrder: 2,
                values: JSON.stringify(baseValues),
              });
              metrics.push({
                ...newActual,
                values: baseValues,
              });
            }

            // Sort metrics by sortOrder
            // Include TARGET, ACTUAL, and CALCULATED metrics
            const target = metrics.find((m) => m.type === "TARGET");
            const actual = metrics.find((m) => m.type === "ACTUAL");
            const calculated = metrics.find((m) => m.type === "CALCULATED");
            const sortedMetrics = [target, actual, calculated].filter(
              (m): m is KpiMetric => m != null,
            );

            return {
              ...record,
              metrics: sortedMetrics,
            };
          }),
        );

        // If no records, create first one (only if user can create and haven't attempted yet)
        if (
          recordsWithMetrics.length === 0 &&
          canCreate &&
          isSelectedDepartmentInKpiScope &&
          !hasAttemptedAutoCreate
        ) {
          setHasAttemptedAutoCreate(true);
          try {
            const newRecord = await api.post<KpiRecord>("/kpi/records", {
              departmentId: selectedDepartmentId,
              year: selectedYear,
              title: "",
              target: "",
              targetValue: null,
            });

            const baseValues: Record<string, number | null> = {};
            MONTH_KEYS.forEach((key) => {
              baseValues[key] = null;
            });

            const targetMetric = await api.post<KpiMetric>("/kpi/metrics", {
              kpiRecordId: newRecord.id,
              name: "",
              type: "TARGET",
              sortOrder: 1,
              values: JSON.stringify(baseValues),
            });

            const actualMetric = await api.post<KpiMetric>("/kpi/metrics", {
              kpiRecordId: newRecord.id,
              name: "",
              type: "ACTUAL",
              sortOrder: 2,
              values: JSON.stringify(baseValues),
            });

            recordsWithMetrics.push({
              ...newRecord,
              metrics: [
                { ...targetMetric, values: baseValues },
                { ...actualMetric, values: baseValues },
              ],
            });
          } catch (err: unknown) {
            // If auto-create fails due to 403, just show empty list
            const apiError = toApiError(err);
            if (apiError.statusCode !== 403) {
              throw err;
            }
            // Silent failure for 403 - user doesn't have permission
          }
        }

        setRecords(recordsWithMetrics);
        // Store initial state for comparison
        initialRecordsRef.current = JSON.stringify(recordsWithMetrics);
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());

        // Load attachments for each KPI if user has view permission
        if (canViewAttachments) {
          const attachmentsPromises = recordsWithMetrics.map(async (record) => {
            try {
              const attachments = await kpiAttachmentApi.getAttachments(
                record.id,
              );
              return { kpiId: record.id, attachments };
            } catch (err) {
              console.warn(
                `Failed to load attachments for KPI ${record.id}:`,
                err,
              );
              return { kpiId: record.id, attachments: [] };
            }
          });

          const attachmentsResults = await Promise.all(attachmentsPromises);
          const newMap = new Map<string, KpiAttachment[]>();
          attachmentsResults.forEach(({ kpiId, attachments }) => {
            newMap.set(kpiId, attachments);
          });
          setAttachmentsMap(newMap);
        }

        // Clear backup after successful load
        if (typeof window !== "undefined") {
          const backupKey = getKpiBackupKey(selectedDepartmentId, selectedYear);
          localStorage.removeItem(backupKey);
        }
      } catch (err: unknown) {
        // Try to restore from backup if API fails
        if (typeof window !== "undefined") {
          const backupKey = getKpiBackupKey(selectedDepartmentId, selectedYear);
          const backup = localStorage.getItem(backupKey);
          if (backup) {
            try {
              const backupData = JSON.parse(backup) as KpiRecord[];
              setRecords(backupData);
              initialRecordsRef.current = backup;
              setHasUnsavedChanges(true);
              toast({
                title: "Khôi phục dữ liệu",
                description: "Đã khôi phục dữ liệu chưa lưu từ phiên trước",
                variant: "default",
              });
              setLoading(false);
              return;
            } catch {
              // Backup corrupted, continue with error handling
            }
          }
        }

        handleKpiApiError(err, "tải dữ liệu KPI", {
          on403: () => setRecords([]),
          onOther: () => setError("Không tải được dữ liệu KPI"),
        });
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [
    selectedDepartmentId,
    selectedYear,
    toast,
    canCreate,
    hasAttemptedAutoCreate,
    canViewAttachments,
    isSelectedDepartmentInKpiScope,
  ]);

  // Helper function to calculate average for a metric
  const calculateMetricAverage = (metric: KpiMetric | null | undefined) => {
    if (!metric || !metric.values) return null;
    const values = MONTH_KEYS.map((key) => metric.values?.[key] ?? null);
    const valid = values.filter((v): v is number => v != null && v !== 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / valid.length) * 100) / 100;
  };

  // Helper function to calculate efficiency for a record
  const calculateEfficiency = (record: KpiRecord) => {
    const targetMetric = record.metrics.find((m) => m.type === "TARGET");
    const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

    if (!targetMetric || !actualMetric) {
      return MONTH_KEYS.map(() => null).concat([null]);
    }

    const values: (number | null)[] = [];
    for (const key of MONTH_KEYS) {
      const target = targetMetric.values?.[key] ?? null;
      const actual = actualMetric.values?.[key] ?? null;
      if (!target || target === 0 || actual == null) {
        values.push(null);
      } else {
        values.push((actual / target) * 100);
      }
    }

    const valid = values.filter((v): v is number => v != null);
    const avg =
      valid.length > 0
        ? valid.reduce((acc, v) => acc + v, 0) / valid.length
        : null;

    return [...values, avg];
  };

  // Helper function to get calculated metric
  const getCalculatedMetric = (record: KpiRecord) => {
    return record.metrics.find((m) => m.type === "CALCULATED");
  };

  // Helper function to calculate calculated values (100% - efficiency)
  const calculateCalculatedValues = (record: KpiRecord) => {
    const efficiencyValues = calculateEfficiency(record);
    return efficiencyValues.map((v) => (v == null ? null : 100 - v));
  };

  // Helper function to get chart data for COUNT SINGLE table (1 row)
  const getChartDataForCountSingle = (record: KpiRecord) => {
    const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

    const actualData = MONTH_KEYS.map(
      (key) => actualMetric?.values?.[key] ?? null,
    );
    const actualAvg = calculateMetricAverage(actualMetric);

    const datasets: ChartDataset<"bar", (number | null)[]>[] = [
      {
        type: "bar" as const,
        label: "ACTUAL",
        data: [...actualData, actualAvg],
        backgroundColor: "rgba(54, 162, 235, 0.8)",
      },
    ];

    const chartLabels = [
      ...MONTH_KEYS.map((key) => tTable(`months.${key}`)),
      tTable("months.average"),
    ];

    return {
      labels: chartLabels,
      datasets,
    } as ChartData<"bar", (number | null)[], string>;
  };

  // Helper function to get chart data for COUNT DOUBLE table (2 rows)
  const getChartDataForCount = (record: KpiRecord) => {
    const targetMetric = record.metrics.find((m) => m.type === "TARGET");
    const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

    const actualData = MONTH_KEYS.map(
      (key) => actualMetric?.values?.[key] ?? null,
    );
    const targetData = MONTH_KEYS.map(
      (key) => targetMetric?.values?.[key] ?? null,
    );

    const actualAvg = calculateMetricAverage(actualMetric);
    const targetAvg = calculateMetricAverage(targetMetric);

    const datasets: ChartDataset<"bar" | "line", (number | null)[]>[] = [
      {
        type: "bar" as const,
        label: "ACTUAL",
        data: [...actualData, actualAvg],
        backgroundColor: "rgba(54, 162, 235, 0.8)",
      },
      {
        type: "line" as const,
        label: "TARGET",
        data: [...targetData, targetAvg],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 4,
        fill: false,
        tension: 0,
      },
    ];

    const chartLabels = [
      ...MONTH_KEYS.map((key) => tTable(`months.${key}`)),
      tTable("months.average"),
    ];

    return {
      labels: chartLabels,
      datasets,
    } as ChartData<"bar", (number | null)[], string>;
  };

  // Helper function to get chart data for a record (PERCENTAGE table)
  const getChartData = (
    record: KpiRecord,
    efficiencyValues: (number | null)[],
  ) => {
    const datasets: ChartDataset<"bar" | "line", number[]>[] = [
      {
        type: "bar" as const,
        label: t("performance"),
        data: efficiencyValues.map((v) => (v == null ? 0 : v)),
        backgroundColor: efficiencyValues.map((v) => {
          if (v == null) return "rgba(200,200,200,0.5)";
          if (record.targetValue && v >= record.targetValue) {
            return "rgba(255, 205, 86, 0.8)";
          }
          if (v >= 100) return "rgba(54, 162, 235, 0.8)";
          return "rgba(146, 208, 80, 0.8)";
        }),
      },
    ];

    // Add target line if targetValue exists
    if (record.targetValue != null) {
      datasets.push({
        type: "line" as const,
        label: t("targetLabel"),
        data: Array(MONTH_KEYS.length + 1).fill(record.targetValue), // 12 months + 1 average
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0,
      });
    }

    // Generate labels from translations
    const chartLabels = [
      ...MONTH_KEYS.map((key) => tTable(`months.${key}`)),
      tTable("months.average"),
    ];

    return {
      labels: chartLabels,
      datasets,
    } as ChartData<"bar", number[], string>;
  };

  // Helper function to get chart options for COUNT SINGLE table
  const getChartOptionsForCountSingle = (record: KpiRecord) => {
    const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");
    const actualData = MONTH_KEYS.map(
      (key) => actualMetric?.values?.[key] ?? null,
    );

    const allValues = actualData.filter((v): v is number => v != null);
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const niceMax = Math.ceil(maxValue * 1.2);

    return {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
        },
        title: {
          display: true,
          text: t("chartTitle"),
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: niceMax,
          ticks: {
            callback: (value: number | string) => `${value}`,
          },
        },
      },
    };
  };

  // Helper function to get chart options for COUNT DOUBLE table
  const getChartOptionsForCount = (record: KpiRecord) => {
    const targetMetric = record.metrics.find((m) => m.type === "TARGET");
    const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

    const actualData = MONTH_KEYS.map(
      (key) => actualMetric?.values?.[key] ?? null,
    );
    const targetData = MONTH_KEYS.map(
      (key) => targetMetric?.values?.[key] ?? null,
    );

    const allValues = [...actualData, ...targetData].filter(
      (v): v is number => v != null,
    );
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const niceMax = Math.ceil(maxValue * 1.2);

    return {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
        },
        title: {
          display: true,
          text: t("chartTitle"),
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: niceMax,
          ticks: {
            callback: (value: number | string) => `${value}`,
          },
        },
      },
    };
  };

  // Helper function to get chart options with dynamic max (for PERCENTAGE table)
  const getChartOptions = (
    efficiencyValues: (number | null)[],
    targetValue?: number | null,
  ) => {
    const validValues = efficiencyValues
      .slice(0, 12)
      .filter((v): v is number => v != null);

    if (validValues.length === 0) {
      // Default options when no data
      return {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
          },
          title: {
            display: true,
            text: "KPI / Hiệu suất (%)",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value: number | string) => `${value}%`,
            },
          },
        },
      };
    }

    const maxValue = Math.max(...validValues);
    const minValue = Math.min(...validValues);
    const dataRange = maxValue - minValue;

    // Calculate max with target consideration
    const maxWithTarget = targetValue
      ? Math.max(maxValue, targetValue)
      : maxValue;

    // Smart padding based on value range
    // For very small values (< 1%), use much larger padding to make bars visible
    // For low values (1-10%), use larger padding
    // For normal values (>= 10%), use standard padding
    let paddingPercent = 0.2; // Default 20% padding

    if (maxWithTarget < 1) {
      // For very small values (< 1%), use much larger padding (200%) to ensure bars are visible
      paddingPercent = 2.0;
    } else if (maxWithTarget < 10) {
      // For low values (1-10%), use larger padding (50%)
      paddingPercent = 0.5;
    } else if (maxWithTarget < 50) {
      // For medium-low values (10-50%), use medium padding (30%)
      paddingPercent = 0.3;
    }

    // Calculate dynamic max with smart padding
    let dynamicMax = maxWithTarget * (1 + paddingPercent);

    // Ensure minimum visible range for small values, but don't force too large scale for very small values
    // This prevents bars from being invisible when values are very small
    if (maxWithTarget < 1) {
      // For very small values (< 1%), use calculated padding without forcing minimum
      // This ensures bars are at least 33% of chart height (value / (value * 3) = 1/3)
      // No additional minimum forcing needed
    } else if (maxWithTarget < 5 && dataRange < 2) {
      // For small ranges (1-5% with range < 2%), ensure at least 5% scale
      dynamicMax = Math.max(dynamicMax, 5);
    } else if (maxWithTarget < 10) {
      // For small values (5-10%), ensure at least 10% scale
      dynamicMax = Math.max(dynamicMax, 10);
    } else if (maxWithTarget < 100) {
      // For medium values (10-100%), ensure at least 20% above max
      dynamicMax = Math.max(dynamicMax, maxWithTarget * 1.2);
    } else {
      // For normal values (>= 100%), use standard 20% padding
      dynamicMax = maxWithTarget * 1.2;
    }

    // Round up to nearest nice number
    // For very small values (< 1%), round to 2 decimal places
    // For small values (1-10%), round to 1 decimal place or nearest 0.5
    // For larger values, round to nearest integer
    let niceMax: number;
    if (dynamicMax < 0.1) {
      // For very small values (< 0.1%), round to nearest 0.01
      niceMax = Math.ceil(dynamicMax * 100) / 100;
    } else if (dynamicMax < 1) {
      // For small values (0.1-1%), round to nearest 0.05
      niceMax = Math.ceil(dynamicMax * 20) / 20;
    } else if (dynamicMax < 10) {
      // For medium values (1-10%), round to nearest 0.5
      niceMax = Math.ceil(dynamicMax * 2) / 2;
    } else if (dynamicMax < 50) {
      // For larger values (10-50%), round to nearest 5
      niceMax = Math.ceil(dynamicMax / 5) * 5;
    } else {
      // For large values (>= 50%), round to nearest 10
      niceMax = Math.ceil(dynamicMax / 10) * 10;
    }

    return {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
        },
        title: {
          display: true,
          text: "KPI / Hiệu suất (%)",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: niceMax,
          ticks: {
            callback: (value: number | string) => `${value}%`,
          },
        },
      },
    };
  };

  const handleChangeMetricValue = (
    recordId: string,
    metricId: string,
    key: (typeof MONTH_KEYS)[number],
    value: string,
  ) => {
    const num = value === "" ? null : Number(value);
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              metrics: r.metrics.map((metric) =>
                metric.id === metricId
                  ? {
                      ...metric,
                      values: {
                        ...(metric.values || {}),
                        [key]: Number.isNaN(num) ? null : num,
                      },
                    }
                  : metric,
              ),
            }
          : r,
      ),
    );
  };

  // Handle creating metrics if they don't exist when user starts typing
  const ensureMetricExists = async (
    recordId: string,
    type: "TARGET" | "ACTUAL" | "CALCULATED",
  ) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return null;

    const existingMetric = record.metrics.find((m) => m.type === type);
    if (existingMetric && !existingMetric.id.startsWith("temp-")) {
      return existingMetric;
    }

    try {
      // Create the metric in database
      const baseValues: Record<string, number | null> = {};
      MONTH_KEYS.forEach((key) => {
        baseValues[key] = null;
      });

      const newMetric = await api.post<KpiMetric>("/kpi/metrics", {
        kpiRecordId: recordId,
        name: "",
        type: type,
        sortOrder: type === "TARGET" ? 1 : type === "ACTUAL" ? 2 : 3,
        values: JSON.stringify(baseValues),
      });

      // Update records state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                metrics: [
                  ...r.metrics.filter((m) => !m.id.startsWith(`temp-${type}`)),
                  { ...newMetric, values: baseValues },
                ],
              }
            : r,
        ),
      );

      return { ...newMetric, values: baseValues };
    } catch (err: unknown) {
      handleKpiApiError(err, "tạo metric");
      return null;
    }
  };

  const handleAddCalculatedMetric = async (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record || !isEditMode) return;

    // Check if calculated metric already exists
    const existingCalculated = record.metrics.find(
      (m) => m.type === "CALCULATED",
    );
    if (existingCalculated) return;

    try {
      const baseValues: Record<string, number | null> = {};
      MONTH_KEYS.forEach((key) => {
        baseValues[key] = null;
      });

      const newCalculated = await api.post<KpiMetric>("/kpi/metrics", {
        kpiRecordId: recordId,
        name: "",
        type: "CALCULATED",
        sortOrder: 3,
        values: JSON.stringify(baseValues),
      });

      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                metrics: [
                  ...r.metrics,
                  { ...newCalculated, values: baseValues },
                ],
              }
            : r,
        ),
      );
    } catch (err: unknown) {
      handleKpiApiError(err, "thêm dòng tính toán");
    }
  };

  const handleRemoveCalculatedMetric = async (
    recordId: string,
    metricId: string,
  ) => {
    if (!isEditMode) return;

    try {
      await api.delete(`/kpi/metrics/${metricId}`);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                metrics: r.metrics.filter((m) => m.id !== metricId),
              }
            : r,
        ),
      );
    } catch (err: unknown) {
      handleKpiApiError(err, "xóa dòng tính toán");
    }
  };

  const recordRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleAddNewTable = async (
    displayType: DisplayType,
    rowMode?: RowMode,
  ) => {
    if (
      !selectedDepartmentId ||
      !canCreate ||
      !isSelectedDepartmentInKpiScope ||
      isCreating
    )
      return;

    setIsCreating(true);
    try {
      const newRecord = await api.post<KpiRecord>("/kpi/records", {
        departmentId: selectedDepartmentId,
        year: selectedYear,
        title: "",
        target: "",
        targetValue: null,
        displayType,
        rowMode: displayType === "COUNT" ? rowMode : undefined,
      });

      const baseValues: Record<string, number | null> = {};
      MONTH_KEYS.forEach((key) => {
        baseValues[key] = null;
      });

      const targetMetric = await api.post<KpiMetric>("/kpi/metrics", {
        kpiRecordId: newRecord.id,
        name: "",
        type: "TARGET",
        sortOrder: 1,
        values: JSON.stringify(baseValues),
      });

      const actualMetric = await api.post<KpiMetric>("/kpi/metrics", {
        kpiRecordId: newRecord.id,
        name: "",
        type: "ACTUAL",
        sortOrder: 2,
        values: JSON.stringify(baseValues),
      });

      setRecords((prev) => [
        ...prev,
        {
          ...newRecord,
          metrics: [
            { ...targetMetric, values: baseValues },
            { ...actualMetric, values: baseValues },
          ],
        },
      ]);

      // Scroll to the new table after state update
      setTimeout(() => {
        const newRecordElement = recordRefs.current[newRecord.id];
        if (newRecordElement) {
          newRecordElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    } catch (err: unknown) {
      handleKpiApiError(err, "tạo KPI mới");
    } finally {
      setIsCreating(false);
      setShowAddTableDialog(false);
    }
  };

  const openAddTableDialog = () => {
    setSelectedDisplayType("PERCENTAGE");
    setSelectedRowMode("DOUBLE");
    setShowAddTableDialog(true);
  };

  const confirmAddTable = () => {
    handleAddNewTable(selectedDisplayType, selectedRowMode);
  };

  const handleDeleteTable = async (recordId: string) => {
    if (isDeleting === recordId) return;

    setIsDeleting(recordId);
    try {
      await api.delete(`/kpi/records/${recordId}`);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    } catch (err: unknown) {
      handleKpiApiError(err, "xóa KPI");
    } finally {
      setIsDeleting(null);
    }
  };

  // Save function (used by both manual save and auto-save)
  const performSave = useCallback(
    async (isAutoSave = false) => {
      if (!selectedDepartmentId) return;

      const savingState = isAutoSave ? setIsAutoSaving : setIsSaving;
      savingState(true);

      try {
        for (const record of records) {
          try {
            await api.patch(`/kpi/records/${record.id}`, {
              title: record.title,
              target: record.target,
              targetValue: record.targetValue,
            });
          } catch (err: unknown) {
            const apiError = toApiError(err);
            if (apiError.statusCode === 403) {
              handleKpiApiError(err, `cập nhật KPI "${record.title}"`);
              continue;
            }
            throw err;
          }

          for (const metric of record.metrics) {
            try {
              await api.patch(`/kpi/metrics/${metric.id}`, {
                name: metric.name,
                type: metric.type,
                sortOrder: metric.sortOrder,
                values: JSON.stringify(metric.values || {}),
              });
            } catch (err: unknown) {
              const apiError = toApiError(err);
              if (apiError.statusCode === 403) {
                handleKpiApiError(err, "cập nhật metric");
                continue;
              }
              throw err;
            }
          }
        }

        // Update initial state reference
        initialRecordsRef.current = JSON.stringify(records);
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());

        // Clear backup after successful save
        if (typeof window !== "undefined") {
          const backupKey = getKpiBackupKey(selectedDepartmentId, selectedYear);
          localStorage.removeItem(backupKey);
        }

        if (!isAutoSave) {
          toast({
            title: "Thành công",
            description: "Đã lưu thay đổi",
            variant: "success",
          });
        }
      } catch (err: unknown) {
        console.error(err);
        const apiError = err as { statusCode?: number; message?: string };
        if (apiError.statusCode !== 403) {
          toast({
            title: "Lỗi",
            description: apiError.message || "Không thể lưu thay đổi",
            variant: "destructive",
          });
        }
      } finally {
        savingState(false);
      }
    },
    [records, selectedDepartmentId, selectedYear, toast],
  );

  // Debounced auto-save
  const debouncedAutoSave = useDebounce(() => {
    if (hasUnsavedChanges && isEditMode && !isSaving) {
      performSave(true);
    }
  }, 2000); // 2 seconds delay

  // Auto-save when data changes
  useEffect(() => {
    if (!isEditMode || !hasUnsavedChanges) return;

    // Backup to localStorage
    if (typeof window !== "undefined" && selectedDepartmentId) {
      const backupKey = getKpiBackupKey(selectedDepartmentId, selectedYear);
      try {
        localStorage.setItem(backupKey, JSON.stringify(records));
      } catch (err) {
        console.error("Failed to backup to localStorage:", err);
      }
    }

    // Trigger debounced auto-save
    debouncedAutoSave();
  }, [
    records,
    isEditMode,
    hasUnsavedChanges,
    debouncedAutoSave,
    selectedDepartmentId,
    selectedYear,
    isSaving,
  ]);

  // Track changes
  useEffect(() => {
    if (!isEditMode) {
      setHasUnsavedChanges(false);
      return;
    }

    const currentState = JSON.stringify(records);
    const hasChanges = currentState !== initialRecordsRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [records, isEditMode]);

  const handleSave = async () => {
    await performSave(false);
    setIsEditMode(false);
  };

  const handleExport = async (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;
    const headers = getAuthHeader();
    const res = await fetch(`/api/kpi/records/${record.id}/export`, {
      headers: headers as HeadersInit,
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi_${record.year}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">KPI</h1>
        <p className="text-muted-foreground">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <PageGuard metadata={pageMetadata}>
      {!departments.length ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">KPI</h1>
          {!user ? (
            <p className="text-muted-foreground">
              Đang tải thông tin người dùng...
            </p>
          ) : !getUserDepartment(user) ? (
            <p className="text-muted-foreground">
              Bạn chưa được gán vào bộ môn nào. Vui lòng liên hệ quản trị viên
              để được gán vào bộ môn.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Không có bộ môn nào. Vui lòng tạo bộ môn trước.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              {departments.length > 1 || hasKpiReadAllAccess(user) ? (
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={selectedDepartmentId}
                  onChange={(e) => {
                    if (hasUnsavedChanges && isEditMode) {
                      if (
                        !confirm(
                          "Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển bộ môn không?",
                        )
                      ) {
                        return;
                      }
                    }
                    setSelectedDepartmentId(e.target.value);
                  }}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : departments.length === 1 ? (
                <span className="text-sm font-medium">
                  {departments[0].name}
                </span>
              ) : null}
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={selectedYear}
                onChange={(e) => {
                  if (hasUnsavedChanges && isEditMode) {
                    if (
                      !confirm(
                        "Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển năm không?",
                      )
                    ) {
                      return;
                    }
                  }
                  setSelectedYear(Number(e.target.value));
                }}
              >
                {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {t("year")} {y}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Save status indicator */}
          {isEditMode && (
            <div className="flex items-center gap-2 text-sm">
              {isAutoSaving ? (
                <span className="text-blue-600">Đang tự động lưu...</span>
              ) : hasUnsavedChanges ? (
                <span className="text-orange-600">Có thay đổi chưa lưu</span>
              ) : lastSavedAt ? (
                <span className="text-green-600">
                  Đã lưu lúc {lastSavedAt.toLocaleTimeString("vi-VN")}
                </span>
              ) : null}
            </div>
          )}

          <div className="space-y-6">
            {records.map((record) => {
              // Helper to get best metric (prioritize non-empty names, then most recently updated)
              const getBestMetric = (
                type: "TARGET" | "ACTUAL" | "CALCULATED",
              ): KpiMetric | undefined => {
                const metricsOfType = record.metrics.filter(
                  (m) => m.type === type,
                );
                if (metricsOfType.length === 0) return undefined;

                const metricsWithName = metricsOfType.filter(
                  (m) => m.name && m.name.trim() !== "",
                );

                if (metricsWithName.length > 0) {
                  // If multiple metrics with names, prefer the most recently updated one
                  return metricsWithName.sort((a, b) => {
                    const dateA =
                      a.updatedAt || a.createdAt
                        ? new Date(a.updatedAt || a.createdAt!).getTime()
                        : 0;
                    const dateB =
                      b.updatedAt || b.createdAt
                        ? new Date(b.updatedAt || b.createdAt!).getTime()
                        : 0;
                    return dateB - dateA; // Most recent first
                  })[0];
                }

                return metricsOfType[0];
              };

              // Ensure we always have TARGET and ACTUAL metrics (create empty if missing)
              let targetMetric = getBestMetric("TARGET");
              let actualMetric = getBestMetric("ACTUAL");

              // Create empty metrics if they don't exist (for rendering)
              if (!targetMetric) {
                const emptyValues: Record<string, number | null> = {};
                MONTH_KEYS.forEach((key) => {
                  emptyValues[key] = null;
                });
                targetMetric = {
                  id: `temp-target-${record.id}`,
                  name: "",
                  type: "TARGET",
                  sortOrder: 1,
                  values: emptyValues,
                };
              }

              if (!actualMetric) {
                const emptyValues: Record<string, number | null> = {};
                MONTH_KEYS.forEach((key) => {
                  emptyValues[key] = null;
                });
                actualMetric = {
                  id: `temp-actual-${record.id}`,
                  name: "",
                  type: "ACTUAL",
                  sortOrder: 2,
                  values: emptyValues,
                };
              }

              const efficiencyValues = calculateEfficiency(record);
              const calculatedMetric = getCalculatedMetric(record);
              const calculatedValues = calculatedMetric
                ? calculateCalculatedValues(record)
                : null;
              // Use calculated values for chart if available, otherwise use efficiency
              const chartValues = calculatedValues || efficiencyValues;
              const hasData = chartValues.some((v) => v != null);
              const targetAverage = calculateMetricAverage(targetMetric);
              const actualAverage = calculateMetricAverage(actualMetric);
              const calculatedAverage =
                calculatedValues && calculatedValues[12] != null
                  ? calculatedValues[12]
                  : null;

              return (
                <div
                  key={record.id}
                  ref={(el) => {
                    recordRefs.current[record.id] = el;
                  }}
                  className="space-y-6"
                >
                  {/* Table Card */}
                  <Card className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="block text-sm font-medium">
                          {t("kpiTitle")}
                        </label>
                        <Input
                          value={record.title}
                          onChange={(e) => {
                            setRecords((prev) =>
                              prev.map((r) =>
                                r.id === record.id
                                  ? { ...r, title: e.target.value }
                                  : r,
                              ),
                            );
                          }}
                          disabled={!isEditMode}
                          placeholder={t("kpiTitle")}
                        />
                        {canViewAttachments && (
                          <KpiAttachmentList
                            attachments={attachmentsMap.get(record.id) || []}
                            onAttachmentClick={(attachmentId) => {
                              const attachments =
                                attachmentsMap.get(record.id) || [];
                              const attachment = attachments.find(
                                (a) => a.id === attachmentId,
                              );
                              if (attachment) {
                                setViewerState({
                                  attachmentId,
                                  fileName: attachment.fileName,
                                });
                              }
                            }}
                            onAttachmentDelete={async (attachmentId) => {
                              try {
                                await kpiAttachmentApi.deleteAttachment(
                                  attachmentId,
                                );
                                const currentAttachments =
                                  attachmentsMap.get(record.id) || [];
                                setAttachmentsMap(
                                  new Map(
                                    attachmentsMap.set(
                                      record.id,
                                      currentAttachments.filter(
                                        (a) => a.id !== attachmentId,
                                      ),
                                    ),
                                  ),
                                );
                                toast({
                                  title: "Thành công",
                                  description: "Đã xóa file thành công",
                                  variant: "default",
                                });
                              } catch (error: unknown) {
                                console.error(
                                  "Failed to delete attachment:",
                                  error,
                                );
                                const errorMessage =
                                  error instanceof Error
                                    ? error.message
                                    : "Không thể xóa file";
                                toast({
                                  title: "Lỗi",
                                  description: errorMessage,
                                  variant: "destructive",
                                });
                              }
                            }}
                            onAttachmentRenamed={async (_attachmentId) => {
                              try {
                                // Refresh attachments for this KPI record
                                const attachments =
                                  await kpiAttachmentApi.getAttachments(
                                    record.id,
                                  );
                                setAttachmentsMap(
                                  new Map(
                                    attachmentsMap.set(record.id, attachments),
                                  ),
                                );
                              } catch (error: unknown) {
                                console.error(
                                  "Failed to refresh attachments after rename:",
                                  error,
                                );
                              }
                            }}
                            canView={canViewAttachments}
                            canDelete={canDeleteAttachments}
                            canEdit={canViewAttachments}
                          />
                        )}
                      </div>
                      <div className="w-56 space-y-2">
                        <label className="block text-sm font-medium">
                          {t("target")}
                        </label>
                        <Input
                          value={record.target}
                          onChange={(e) => {
                            setRecords((prev) =>
                              prev.map((r) =>
                                r.id === record.id
                                  ? { ...r, target: e.target.value }
                                  : r,
                              ),
                            );
                          }}
                          disabled={!isEditMode}
                        />
                      </div>
                      {isEditMode && records.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTable(record.id)}
                          disabled={isDeleting === record.id}
                          className="text-red-500"
                        >
                          {isDeleting === record.id
                            ? "Đang xóa..."
                            : "Xóa bảng"}
                        </Button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 text-xs">
                        <thead>
                          <tr className="bg-blue-50 text-[11px]">
                            <th className="border border-gray-200 px-2 py-1 text-left min-w-[180px]">
                              {tTable("itemColumn")}
                            </th>
                            {MONTH_KEYS.map((monthKey) => (
                              <th
                                key={monthKey}
                                className="border border-gray-200 px-2 py-1 text-center min-w-[80px]"
                              >
                                {tTable(`months.${monthKey}`)}
                              </th>
                            ))}
                            <th className="border border-gray-200 px-2 py-1 text-center min-w-[80px]">
                              {tTable("months.average")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* TARGET Row - Hide for COUNT + SINGLE */}
                          {!(
                            record.displayType === "COUNT" &&
                            record.rowMode === "SINGLE"
                          ) && (
                            <tr>
                              <td className="border border-gray-200 px-2 py-1 align-top">
                                <textarea
                                  className="w-full resize-none bg-transparent text-xs leading-tight"
                                  value={targetMetric.name}
                                  disabled={!isEditMode}
                                  onChange={async (e) => {
                                    // Create metric if it doesn't exist
                                    let metricToUse = targetMetric;
                                    if (targetMetric.id.startsWith("temp-")) {
                                      const created = await ensureMetricExists(
                                        record.id,
                                        "TARGET",
                                      );
                                      if (created) metricToUse = created;
                                    }

                                    setRecords((prev) =>
                                      prev.map((r) =>
                                        r.id === record.id
                                          ? {
                                              ...r,
                                              metrics: r.metrics.map((m) =>
                                                m.id === metricToUse.id
                                                  ? {
                                                      ...m,
                                                      name: e.target.value,
                                                    }
                                                  : m,
                                              ),
                                            }
                                          : r,
                                      ),
                                    );
                                  }}
                                  placeholder="Dòng 1: TARGET / Mục tiêu (ví dụ: Số lượng kế hoạch)"
                                  rows={2}
                                />
                              </td>
                              {MONTH_KEYS.map((key) => (
                                <td
                                  key={key}
                                  className="border border-gray-200 px-1 py-1 text-center"
                                >
                                  <Input
                                    type="number"
                                    value={
                                      targetMetric.values?.[key] == null
                                        ? ""
                                        : targetMetric.values[key]!
                                    }
                                    disabled={!isEditMode}
                                    onChange={async (e) => {
                                      // Create metric if it doesn't exist
                                      let metricToUse = targetMetric;
                                      if (targetMetric.id.startsWith("temp-")) {
                                        const created =
                                          await ensureMetricExists(
                                            record.id,
                                            "TARGET",
                                          );
                                        if (created) metricToUse = created;
                                      }

                                      handleChangeMetricValue(
                                        record.id,
                                        metricToUse.id,
                                        key,
                                        e.target.value,
                                      );
                                    }}
                                    className="h-7 w-20 mx-auto text-xs text-center"
                                  />
                                </td>
                              ))}
                              <td className="border border-gray-200 px-1 py-1 text-center text-xs font-medium">
                                {targetAverage != null
                                  ? targetAverage.toFixed(2)
                                  : ""}
                              </td>
                            </tr>
                          )}

                          {/* ACTUAL Row - Always render */}
                          <tr>
                            <td className="border border-gray-200 px-2 py-1 align-top">
                              <textarea
                                className="w-full resize-none bg-transparent text-xs leading-tight"
                                value={actualMetric.name}
                                disabled={!isEditMode}
                                onChange={async (e) => {
                                  // Create metric if it doesn't exist
                                  let metricToUse = actualMetric;
                                  if (actualMetric.id.startsWith("temp-")) {
                                    const created = await ensureMetricExists(
                                      record.id,
                                      "ACTUAL",
                                    );
                                    if (created) metricToUse = created;
                                  }

                                  setRecords((prev) =>
                                    prev.map((r) =>
                                      r.id === record.id
                                        ? {
                                            ...r,
                                            metrics: r.metrics.map((m) =>
                                              m.id === metricToUse.id
                                                ? { ...m, name: e.target.value }
                                                : m,
                                            ),
                                          }
                                        : r,
                                    ),
                                  );
                                }}
                                placeholder="Dòng 2: ACTUAL / Thực tế (ví dụ: Số lượng thực hiện)"
                                rows={2}
                              />
                            </td>
                            {MONTH_KEYS.map((key) => (
                              <td
                                key={key}
                                className="border border-gray-200 px-1 py-1 text-center"
                              >
                                <Input
                                  type="number"
                                  value={
                                    actualMetric.values?.[key] == null
                                      ? ""
                                      : actualMetric.values[key]!
                                  }
                                  disabled={!isEditMode}
                                  onChange={async (e) => {
                                    // Create metric if it doesn't exist
                                    let metricToUse = actualMetric;
                                    if (actualMetric.id.startsWith("temp-")) {
                                      const created = await ensureMetricExists(
                                        record.id,
                                        "ACTUAL",
                                      );
                                      if (created) metricToUse = created;
                                    }

                                    handleChangeMetricValue(
                                      record.id,
                                      metricToUse.id,
                                      key,
                                      e.target.value,
                                    );
                                  }}
                                  className="h-7 w-20 mx-auto text-xs text-center"
                                />
                              </td>
                            ))}
                            <td className="border border-gray-200 px-1 py-1 text-center text-xs font-medium">
                              {actualAverage != null
                                ? actualAverage.toFixed(2)
                                : ""}
                            </td>
                          </tr>

                          {/* Efficiency Row - Only for PERCENTAGE tables */}
                          {record.displayType !== "COUNT" && (
                            <tr className="bg-gray-50 font-medium">
                              <td className="border border-gray-200 px-2 py-1 text-left text-xs">
                                {t("efficiency")}
                              </td>
                              {efficiencyValues.slice(0, 12).map((v, idx) => (
                                <td
                                  key={MONTH_KEYS[idx]}
                                  className="border border-gray-200 px-1 py-1 text-center text-xs"
                                >
                                  {v == null ? "" : `${v.toFixed(2)}%`}
                                </td>
                              ))}
                              <td className="border border-gray-200 px-1 py-1 text-center text-xs font-semibold">
                                {efficiencyValues[12] == null
                                  ? ""
                                  : `${efficiencyValues[12]!.toFixed(2)}%`}
                              </td>
                            </tr>
                          )}

                          {/* Calculated Row (100% - Efficiency) - Optional, only for PERCENTAGE tables */}
                          {record.displayType !== "COUNT" &&
                            calculatedMetric &&
                            calculatedValues && (
                              <tr className="bg-blue-50 font-medium">
                                <td className="border border-gray-200 px-2 py-1 text-left text-xs">
                                  <div className="flex items-center gap-2">
                                    <textarea
                                      className="flex-1 resize-none bg-transparent text-xs leading-tight"
                                      value={calculatedMetric.name}
                                      disabled={!isEditMode}
                                      onChange={async (e) => {
                                        // Create metric if it doesn't exist
                                        let metricToUse = calculatedMetric;
                                        if (
                                          calculatedMetric.id.startsWith(
                                            "temp-",
                                          )
                                        ) {
                                          const created =
                                            await ensureMetricExists(
                                              record.id,
                                              "CALCULATED",
                                            );
                                          if (created) metricToUse = created;
                                        }

                                        setRecords((prev) =>
                                          prev.map((r) =>
                                            r.id === record.id
                                              ? {
                                                  ...r,
                                                  metrics: r.metrics.map((m) =>
                                                    m.id === metricToUse.id
                                                      ? {
                                                          ...m,
                                                          name: e.target.value,
                                                        }
                                                      : m,
                                                  ),
                                                }
                                              : r,
                                          ),
                                        );
                                      }}
                                      placeholder="Nhập tên dòng tính toán (ví dụ: Tỷ lệ lỗi)"
                                      rows={2}
                                    />
                                    {isEditMode && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveCalculatedMetric(
                                            record.id,
                                            calculatedMetric.id,
                                          )
                                        }
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        title="Xóa dòng tính toán"
                                      >
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                </td>
                                {calculatedValues.slice(0, 12).map((v, idx) => (
                                  <td
                                    key={MONTH_KEYS[idx]}
                                    className="border border-gray-200 px-1 py-1 text-center text-xs"
                                  >
                                    {v == null ? "" : `${v.toFixed(2)}%`}
                                  </td>
                                ))}
                                <td className="border border-gray-200 px-1 py-1 text-center text-xs font-semibold">
                                  {calculatedAverage != null
                                    ? `${calculatedAverage.toFixed(2)}%`
                                    : ""}
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openAddTableDialog}
                          disabled={
                            !isEditMode ||
                            !canCreate ||
                            !isSelectedDepartmentInKpiScope ||
                            isCreating
                          }
                          title={
                            !canCreate
                              ? "Bạn không có quyền tạo KPI mới"
                              : !isSelectedDepartmentInKpiScope
                                ? "Bộ môn này không nằm trong phạm vi KPI"
                                : undefined
                          }
                        >
                          {isCreating ? "Đang tạo..." : t("addNewTable")}
                        </Button>
                        {isEditMode && !calculatedMetric && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddCalculatedMetric(record.id)}
                            title="Thêm dòng tính toán (100% - Efficiency)"
                          >
                            + Thêm dòng tính toán
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Show upload button if user has permission, even if folderId is not loaded yet */}
                        {canCreateAttachments && (
                          <KpiAttachmentUpload
                            kpiRecordId={record.id}
                            folderId={undefined} // Backend enforces canonical {dept}/KPI/current
                            onUploadSuccess={(attachment) => {
                              const currentAttachments =
                                attachmentsMap.get(record.id) || [];
                              setAttachmentsMap(
                                new Map(
                                  attachmentsMap.set(record.id, [
                                    attachment,
                                    ...currentAttachments,
                                  ]),
                                ),
                              );
                            }}
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(record.id)}
                          disabled={!record}
                        >
                          {t("exportExcel")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditMode((v) => !v)}
                        >
                          {isEditMode ? t("cancel") : t("edit")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={!isEditMode || isSaving}
                        >
                          {isSaving ? t("saving") : t("save")}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Chart Card - Only show if has data */}
                  {hasData &&
                  record.displayType === "COUNT" &&
                  record.rowMode === "SINGLE" ? (
                    <Card className="p-4 flex flex-col">
                      <h2 className="text-sm font-semibold mb-4">
                        {record.title || t("chartTitle")}
                      </h2>
                      <div className="flex-1 min-h-[260px]">
                        <Bar
                          options={getChartOptionsForCountSingle(record)}
                          data={getChartDataForCountSingle(record)}
                        />
                      </div>
                    </Card>
                  ) : hasData && record.displayType === "COUNT" ? (
                    <Card className="p-4 flex flex-col">
                      <h2 className="text-sm font-semibold mb-4">
                        {record.title || t("chartTitle")}
                      </h2>
                      <div className="flex-1 min-h-[260px]">
                        <Bar
                          options={getChartOptionsForCount(record)}
                          data={getChartDataForCount(record)}
                        />
                      </div>
                    </Card>
                  ) : hasData ? (
                    <Card className="p-4 flex flex-col">
                      <h2 className="text-sm font-semibold mb-4">
                        {calculatedMetric
                          ? calculatedMetric.name || t("chartTitle")
                          : t("chartTitle")}
                      </h2>
                      <div className="flex-1 min-h-[260px]">
                        <Bar
                          options={getChartOptions(
                            chartValues,
                            record.targetValue,
                          )}
                          data={getChartData(record, chartValues)}
                        />
                      </div>
                    </Card>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Table Dialog */}
      <Dialog open={showAddTableDialog} onOpenChange={setShowAddTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addNewTable")}</DialogTitle>
            <DialogDescription>{t("displayTypeDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="percentage"
                  name="displayType"
                  value="PERCENTAGE"
                  checked={selectedDisplayType === "PERCENTAGE"}
                  onChange={(e) =>
                    setSelectedDisplayType(e.target.value as DisplayType)
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="percentage" className="cursor-pointer">
                  {t("displayTypePercentage")}
                </Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="count"
                    name="displayType"
                    value="COUNT"
                    checked={selectedDisplayType === "COUNT"}
                    onChange={(e) =>
                      setSelectedDisplayType(e.target.value as DisplayType)
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="count" className="cursor-pointer">
                    {t("displayTypeCount")}
                  </Label>
                </div>

                {/* Nested row mode selection for COUNT */}
                {selectedDisplayType === "COUNT" && (
                  <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="single"
                        name="rowMode"
                        value="SINGLE"
                        checked={selectedRowMode === "SINGLE"}
                        onChange={(e) =>
                          setSelectedRowMode(e.target.value as RowMode)
                        }
                        className="w-4 h-4"
                      />
                      <Label
                        htmlFor="single"
                        className="cursor-pointer text-sm"
                      >
                        {t("rowModeSingle")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="double"
                        name="rowMode"
                        value="DOUBLE"
                        checked={selectedRowMode === "DOUBLE"}
                        onChange={(e) =>
                          setSelectedRowMode(e.target.value as RowMode)
                        }
                        className="w-4 h-4"
                      />
                      <Label
                        htmlFor="double"
                        className="cursor-pointer text-sm"
                      >
                        {t("rowModeDouble")}
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddTableDialog(false)}
              disabled={isCreating}
            >
              {t("cancel")}
            </Button>
            <Button onClick={confirmAddTable} disabled={isCreating}>
              {isCreating ? "Đang tạo..." : t("addNewTable")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Viewer Modal */}
      {viewerState && (
        <KpiAttachmentViewer
          attachmentId={viewerState.attachmentId}
          fileName={viewerState.fileName}
          onClose={() => setViewerState(null)}
        />
      )}
    </PageGuard>
  );
}
