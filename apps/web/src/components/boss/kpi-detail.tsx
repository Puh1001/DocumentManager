"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ChartDataset,
  type ChartData,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface KpiMetric {
  id: string;
  name: string;
  type: "TARGET" | "ACTUAL" | "CALCULATED";
  sortOrder: number;
  values: Record<string, number | null>;
}

type DisplayType = "PERCENTAGE" | "COUNT";
type RowMode = "SINGLE" | "DOUBLE";

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

interface KpiDetailProps {
  kpiId: string;
  onBack: () => void;
}

function calculateEfficiency(record: KpiRecord): (number | null)[] {
  const targetMetric = record.metrics.find((m) => m.type === "TARGET");
  const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

  if (!targetMetric || !actualMetric) {
    return Array(13).fill(null);
  }

  const efficiencyValues: (number | null)[] = [];
  let totalTarget = 0;
  let totalActual = 0;
  let validMonths = 0;

  MONTH_KEYS.forEach((key) => {
    const target = targetMetric.values?.[key];
    const actual = actualMetric.values?.[key];

    if (target != null && actual != null && target !== 0) {
      const efficiency = (actual / target) * 100;
      efficiencyValues.push(efficiency);
      totalTarget += target;
      totalActual += actual;
      validMonths++;
    } else {
      efficiencyValues.push(null);
    }
  });

  // Calculate average
  const average = validMonths > 0 ? (totalActual / totalTarget) * 100 : null;
  efficiencyValues.push(average);

  return efficiencyValues;
}

function calculateMetricAverage(metric: KpiMetric): number | null {
  const values = Object.values(metric.values || {});
  const validValues = values.filter((v): v is number => v != null && !isNaN(v));
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((a, b) => a + b, 0);
  return sum / validValues.length;
}

// Helper function to get chart data for COUNT SINGLE table (1 row: ACTUAL only)
function getChartDataForCountSingle(
  record: KpiRecord,
  tTable: (key: string) => string
) {
  const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");
  const actualData = MONTH_KEYS.map(
    (key) => actualMetric?.values?.[key] ?? null
  );
  const actualAvg = calculateMetricAverage(actualMetric);

  const datasets: ChartDataset<"bar", (number | null)[]>[] = [
    {
      type: "bar" as const,
      label: "ACTUAL",
      data: [...actualData, actualAvg],
      backgroundColor: "rgba(77, 208, 225, 0.8)",
      borderColor: "rgba(77, 208, 225, 1)",
      borderWidth: 2,
      borderRadius: 4,
    },
  ];

  const chartLabels = [
    ...MONTH_KEYS.map((key) => tTable(`months.${key}`)),
    tTable("months.average"),
  ];

  return {
    labels: chartLabels,
    datasets,
  } as ChartData<"bar", number[], string>;
}

// Helper function to get chart data for COUNT DOUBLE table (2 rows: TARGET + ACTUAL)
function getChartDataForCount(
  record: KpiRecord,
  tTable: (key: string) => string
) {
  const targetMetric = record.metrics.find((m) => m.type === "TARGET");
  const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

  const actualData = MONTH_KEYS.map(
    (key) => actualMetric?.values?.[key] ?? null
  );
  const targetData = MONTH_KEYS.map(
    (key) => targetMetric?.values?.[key] ?? null
  );

  const actualAvg = calculateMetricAverage(actualMetric);
  const targetAvg = calculateMetricAverage(targetMetric);

  const datasets: ChartDataset<"bar" | "line", (number | null)[]>[] = [
    {
      type: "bar" as const,
      label: "ACTUAL",
      data: [...actualData, actualAvg],
      backgroundColor: "rgba(77, 208, 225, 0.8)",
      borderColor: "rgba(77, 208, 225, 1)",
      borderWidth: 2,
      borderRadius: 4,
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
    },
  ];

  const chartLabels = [
    ...MONTH_KEYS.map((key) => tTable(`months.${key}`)),
    tTable("months.average"),
  ];

  return {
    labels: chartLabels,
    datasets,
  } as ChartData<"bar", number[], string>;
}

function getChartData(
  record: KpiRecord,
  efficiencyValues: (number | null)[],
  t: (key: string) => string,
  tTable: (key: string) => string
) {
  // Handle COUNT tables
  if (record.displayType === "COUNT") {
    if (record.rowMode === "SINGLE") {
      return getChartDataForCountSingle(record, tTable);
    } else {
      return getChartDataForCount(record, tTable);
    }
  }

  // PERCENTAGE table (default)
  const monthLabels = MONTH_KEYS.map((key, idx) => {
    const monthKeys = [
      "months.jan",
      "months.feb",
      "months.mar",
      "months.apr",
      "months.may",
      "months.jun",
      "months.jul",
      "months.aug",
      "months.sep",
      "months.oct",
      "months.nov",
      "months.dec",
    ];
    return t(monthKeys[idx]);
  });

  return {
    labels: monthLabels,
    datasets: [
      {
        label: t("chart.efficiency"),
        data: efficiencyValues.slice(0, 12),
        backgroundColor: "rgba(77, 208, 225, 0.4)",
        borderColor: "rgba(77, 208, 225, 1)",
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };
}

// Helper function to get chart options for COUNT SINGLE table
function getChartOptionsForCountSingle(record: KpiRecord) {
  const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");
  const actualData = MONTH_KEYS.map(
    (key) => actualMetric?.values?.[key] ?? null
  );

  const allValues = actualData.filter((v): v is number => v != null);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const niceMax = Math.ceil(maxValue * 1.2);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        backgroundColor: "rgba(20, 20, 40, 0.95)",
        titleColor: "#4dd0e1",
        bodyColor: "#4dd0e1",
        borderColor: "rgba(77, 208, 225, 0.5)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            const value = context.parsed.y;
            return value != null ? `${value}` : "N/A";
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#4dd0e1",
          font: {
            family: "'Orbitron', 'Rajdhani', monospace",
            size: 11,
          },
        },
        grid: {
          color: "rgba(77, 208, 225, 0.1)",
        },
      },
      y: {
        beginAtZero: true,
        max: niceMax,
        ticks: {
          color: "#4dd0e1",
          font: {
            family: "'Orbitron', 'Rajdhani', monospace",
            size: 11,
          },
          callback: (value: string | number) => {
            if (typeof value === "number") {
              return `${value}`;
            }
            return value;
          },
        },
        grid: {
          color: "rgba(77, 208, 225, 0.1)",
        },
      },
    },
  };
}

// Helper function to get chart options for COUNT DOUBLE table
function getChartOptionsForCount(record: KpiRecord) {
  const targetMetric = record.metrics.find((m) => m.type === "TARGET");
  const actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

  const actualData = MONTH_KEYS.map(
    (key) => actualMetric?.values?.[key] ?? null
  );
  const targetData = MONTH_KEYS.map(
    (key) => targetMetric?.values?.[key] ?? null
  );

  const allValues = [...actualData, ...targetData].filter(
    (v): v is number => v != null
  );
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
  const niceMax = Math.ceil(maxValue * 1.2);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        backgroundColor: "rgba(20, 20, 40, 0.95)",
        titleColor: "#4dd0e1",
        bodyColor: "#4dd0e1",
        borderColor: "rgba(77, 208, 225, 0.5)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            const value = context.parsed.y;
            return value != null ? `${value}` : "N/A";
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#4dd0e1",
          font: {
            family: "'Orbitron', 'Rajdhani', monospace",
            size: 11,
          },
        },
        grid: {
          color: "rgba(77, 208, 225, 0.1)",
        },
      },
      y: {
        beginAtZero: true,
        max: niceMax,
        ticks: {
          color: "#4dd0e1",
          font: {
            family: "'Orbitron', 'Rajdhani', monospace",
            size: 11,
          },
          callback: (value: string | number) => {
            if (typeof value === "number") {
              return `${value}`;
            }
            return value;
          },
        },
        grid: {
          color: "rgba(77, 208, 225, 0.1)",
        },
      },
    },
  };
}

function getChartOptions(
  record: KpiRecord,
  efficiencyValues: (number | null)[],
  targetValue?: number | null
) {
  // Handle COUNT tables
  if (record.displayType === "COUNT") {
    if (record.rowMode === "SINGLE") {
      return getChartOptionsForCountSingle(record);
    } else {
      return getChartOptionsForCount(record);
    }
  }

  // PERCENTAGE table (default)
  const validValues = efficiencyValues
    .slice(0, 12)
    .filter((v): v is number => v != null);
  
  if (validValues.length === 0) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(20, 20, 40, 0.95)",
          titleColor: "#4dd0e1",
          bodyColor: "#4dd0e1",
          borderColor: "rgba(77, 208, 225, 0.5)",
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
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
  let paddingPercent = 0.2; // Default 20% padding

  if (maxWithTarget < 10) {
    // For very low values (< 10%), use larger padding (50%)
    paddingPercent = 0.5;
  } else if (maxWithTarget < 50) {
    // For low values (10-50%), use medium padding (30%)
    paddingPercent = 0.3;
  }

  // Calculate dynamic max with smart padding
  let dynamicMax = maxWithTarget * (1 + paddingPercent);

  // Ensure minimum visible range for very small values
  if (maxWithTarget < 5 && dataRange < 2) {
    dynamicMax = Math.max(dynamicMax, 5);
  } else if (maxWithTarget < 10) {
    dynamicMax = Math.max(dynamicMax, 10);
  } else if (maxWithTarget < 100) {
    dynamicMax = Math.max(dynamicMax, maxWithTarget * 1.2);
  } else {
    dynamicMax = maxWithTarget * 1.2;
  }

  // Round up to nearest nice number
  let niceMax: number;
  if (dynamicMax < 10) {
    niceMax = Math.ceil(dynamicMax / 1) * 1; // Round to nearest 1
  } else if (dynamicMax < 50) {
    niceMax = Math.ceil(dynamicMax / 5) * 5; // Round to nearest 5
  } else {
    niceMax = Math.ceil(dynamicMax / 10) * 10; // Round to nearest 10
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(20, 20, 40, 0.95)",
        titleColor: "#4dd0e1",
        bodyColor: "#4dd0e1",
        borderColor: "rgba(77, 208, 225, 0.5)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            const value = context.parsed.y;
            return value != null ? `${value.toFixed(0)}%` : "N/A";
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#4dd0e1",
          font: {
            family: "'Orbitron', 'Rajdhani', monospace",
            size: 11,
          },
        },
        grid: {
          color: "rgba(77, 208, 225, 0.1)",
        },
      },
      y: {
        beginAtZero: true,
        max: niceMax,
        ticks: {
          color: "#4dd0e1",
          font: {
            family: "'Orbitron', 'Rajdhani', monospace",
            size: 11,
          },
          callback: (value: string | number) => {
            if (typeof value === "number") {
              return `${value}%`;
            }
            return value;
          },
        },
        grid: {
          color: "rgba(77, 208, 225, 0.1)",
        },
      },
    },
  };
}

export function KpiDetail({ kpiId, onBack }: KpiDetailProps) {
  const t = useTranslations("boss");
  const tTable = useTranslations("kpi.table");
  const tCommon = useTranslations("common");
  const [record, setRecord] = useState<KpiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<KpiRecord>(`/kpi/records/${kpiId}`);
      setRecord(data);
    } catch (err) {
      console.error("Failed to load KPI record:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [kpiId, tCommon]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

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

  if (error || !record) {
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
              {t("error.loadKpiFailed")}
            </p>
            <p className="text-sm mt-2 text-cyan-300/90">
              {error || t("notFound.kpi")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ensure we have TARGET and ACTUAL metrics
  let targetMetric = record.metrics.find((m) => m.type === "TARGET");
  let actualMetric = record.metrics.find((m) => m.type === "ACTUAL");

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
  const calculatedMetric = record.metrics.find((m) => m.type === "CALCULATED");
  
  // Calculate calculated values (100% - Efficiency) if calculated metric exists
  const calculateCalculatedValues = (record: KpiRecord): (number | null)[] => {
    const efficiencyValues = calculateEfficiency(record);
    return efficiencyValues.map((v) => (v == null ? null : 100 - v));
  };
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
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("actions.back")}
      </button>

      <div className="space-y-6">
        {/* Table Card */}
        <div className="cyber-card cyber-corner p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-cyber text-cyan-300/80">
                {t("kpi.kpiTitle")}
              </label>
              <div className="text-lg font-cyber font-bold cyber-neon-cyan">
                {record.title || "-"}
              </div>
            </div>
            <div className="w-56 space-y-2">
              <label className="block text-sm font-cyber text-cyan-300/80">
                {t("kpi.target")}
              </label>
              <div className="text-base font-cyber text-cyan-300">
                {record.target || "-"}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-cyan-500/30 text-xs font-cyber">
              <thead>
                <tr className="bg-cyan-500/10 text-[11px]">
                  <th className="border border-cyan-500/30 px-3 py-2 text-left min-w-[180px] text-cyan-300 font-semibold">
                    {tTable("itemColumn")}
                  </th>
                  {MONTH_KEYS.map((monthKey) => (
                    <th
                      key={monthKey}
                      className="border border-cyan-500/30 px-2 py-2 text-center min-w-[80px] text-cyan-300 font-semibold"
                    >
                      {tTable(`months.${monthKey}`)}
                    </th>
                  ))}
                  <th className="border border-cyan-500/30 px-2 py-2 text-center min-w-[80px] text-cyan-300 font-semibold">
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
                  <tr className="hover:bg-cyan-500/5 transition-colors">
                    <td className="border border-cyan-500/20 px-3 py-2 align-top text-cyan-200">
                      <div className="text-xs leading-tight whitespace-pre-wrap">
                        {targetMetric.name || "-"}
                      </div>
                    </td>
                    {MONTH_KEYS.map((key) => (
                      <td
                        key={key}
                        className="border border-cyan-500/20 px-2 py-2 text-center text-cyan-300"
                      >
                        {targetMetric.values?.[key] == null
                          ? "-"
                          : targetMetric.values[key]}
                      </td>
                    ))}
                    <td className="border border-cyan-500/20 px-2 py-2 text-center text-xs font-semibold text-cyan-200">
                      {targetAverage != null ? targetAverage.toFixed(2) : "-"}
                    </td>
                  </tr>
                )}

                {/* ACTUAL Row */}
                <tr className="hover:bg-cyan-500/5 transition-colors">
                  <td className="border border-cyan-500/20 px-3 py-2 align-top text-cyan-200">
                    <div className="text-xs leading-tight whitespace-pre-wrap">
                      {actualMetric.name || "-"}
                    </div>
                  </td>
                  {MONTH_KEYS.map((key) => (
                    <td
                      key={key}
                      className="border border-cyan-500/20 px-2 py-2 text-center text-cyan-300"
                    >
                      {actualMetric.values?.[key] == null
                        ? "-"
                        : actualMetric.values[key]}
                    </td>
                  ))}
                  <td className="border border-cyan-500/20 px-2 py-2 text-center text-xs font-semibold text-cyan-200">
                    {actualAverage != null ? actualAverage.toFixed(2) : "-"}
                  </td>
                </tr>

                {/* Efficiency Row - Only show for PERCENTAGE tables */}
                {record.displayType !== "COUNT" && (
                  <tr className="bg-cyan-500/10 font-medium hover:bg-cyan-500/15 transition-colors">
                    <td className="border border-cyan-500/30 px-3 py-2 text-left text-xs text-cyan-300 font-bold">
                      {t("kpi.efficiency")}
                    </td>
                    {efficiencyValues.slice(0, 12).map((v, idx) => (
                      <td
                        key={MONTH_KEYS[idx]}
                        className="border border-cyan-500/30 px-2 py-2 text-center text-xs text-cyan-200 font-semibold"
                      >
                        {v == null ? "-" : `${v.toFixed(0)}%`}
                      </td>
                    ))}
                    <td className="border border-cyan-500/30 px-2 py-2 text-center text-xs font-bold text-cyan-300 cyber-text-glow">
                      {efficiencyValues[12] == null
                        ? "-"
                        : `${efficiencyValues[12]!.toFixed(0)}%`}
                    </td>
                  </tr>
                )}

                {/* Calculated Row (100% - Efficiency) - Only show for PERCENTAGE tables with calculated metric */}
                {record.displayType !== "COUNT" &&
                  calculatedMetric &&
                  calculatedValues && (
                    <tr className="bg-cyan-500/15 font-medium hover:bg-cyan-500/20 transition-colors">
                      <td className="border border-cyan-500/30 px-3 py-2 text-left text-xs text-cyan-300 font-bold">
                        <div className="text-xs leading-tight whitespace-pre-wrap">
                          {calculatedMetric.name || "-"}
                        </div>
                      </td>
                      {calculatedValues.slice(0, 12).map((v, idx) => (
                        <td
                          key={MONTH_KEYS[idx]}
                          className="border border-cyan-500/30 px-2 py-2 text-center text-xs text-cyan-200 font-semibold"
                        >
                          {v == null ? "-" : `${v.toFixed(2)}%`}
                        </td>
                      ))}
                      <td className="border border-cyan-500/30 px-2 py-2 text-center text-xs font-bold text-cyan-300 cyber-text-glow">
                        {calculatedAverage == null
                          ? "-"
                          : `${calculatedAverage.toFixed(2)}%`}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Card - Only show if has data */}
        {hasData &&
        record.displayType === "COUNT" &&
        record.rowMode === "SINGLE" ? (
          <div className="cyber-card cyber-corner p-6 flex flex-col">
            <h2 className="text-base font-cyber font-bold mb-4 flex items-center gap-2 cyber-neon-cyan">
              <BarChart2 className="h-5 w-5" />
              {t("kpi.chartTitle")}
            </h2>
            <div className="flex-1 min-h-[260px]">
              <Bar
                options={getChartOptionsForCountSingle(record)}
                data={getChartDataForCountSingle(record, tTable)}
              />
            </div>
          </div>
        ) : hasData && record.displayType === "COUNT" ? (
          <div className="cyber-card cyber-corner p-6 flex flex-col">
            <h2 className="text-base font-cyber font-bold mb-4 flex items-center gap-2 cyber-neon-cyan">
              <BarChart2 className="h-5 w-5" />
              {t("kpi.chartTitle")}
            </h2>
            <div className="flex-1 min-h-[260px]">
              <Bar
                options={getChartOptionsForCount(record)}
                data={getChartDataForCount(record, tTable)}
              />
            </div>
          </div>
        ) : hasData ? (
          <div className="cyber-card cyber-corner p-6 flex flex-col">
            <h2 className="text-base font-cyber font-bold mb-4 flex items-center gap-2 cyber-neon-cyan">
              <BarChart2 className="h-5 w-5" />
              {t("kpi.chartTitle")}
            </h2>
            <div className="flex-1 min-h-[260px]">
              <Bar
                options={getChartOptions(record, chartValues, record.targetValue)}
                data={getChartData(record, chartValues, t, tTable)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
