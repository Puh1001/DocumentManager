"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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

interface KpiRecord {
  id: string;
  departmentId: string;
  year: number;
  title: string;
  target: string;
  targetValue?: number | null;
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

function getChartData(
  record: KpiRecord,
  efficiencyValues: (number | null)[],
  t: (key: string) => string
) {
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
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };
}

function getChartOptions(
  efficiencyValues: (number | null)[],
  _targetValue: number | null | undefined
) {
  const validValues = efficiencyValues
    .slice(0, 12)
    .filter((v): v is number => v != null);
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 100;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            const value = context.parsed.y;
            return value != null ? `${value.toFixed(0)}%` : "N/A";
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.ceil(maxValue / 10) * 10,
        ticks: {
          callback: (value: string | number) => {
            if (typeof value === "number") {
              return `${value}%`;
            }
            return value;
          },
        },
      },
    },
  };
}

export function KpiDetail({ kpiId, onBack }: KpiDetailProps) {
  const t = useTranslations("boss");
  const tKpi = useTranslations("kpi");
  const tTable = useTranslations("kpi.table");
  const tCommon = useTranslations("common");
  const locale = useLocale();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">{t("error.loadKpiFailed")}</p>
            <p className="text-sm mt-1">{error || t("notFound.kpi")}</p>
          </div>
        </Card>
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
  const hasData = efficiencyValues.some((v) => v != null);
  const targetAverage = calculateMetricAverage(targetMetric);
  const actualAverage = calculateMetricAverage(actualMetric);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("actions.back")}
      </Button>

      <div className="space-y-6">
        {/* Table Card */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium">
                {t("kpi.kpiTitle")}
              </label>
              <div className="text-base font-semibold">
                {record.title || "-"}
              </div>
            </div>
            <div className="w-56 space-y-2">
              <label className="block text-sm font-medium">
                {t("kpi.target")}
              </label>
              <div className="text-base">{record.target || "-"}</div>
            </div>
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
                {/* TARGET Row */}
                <tr>
                  <td className="border border-gray-200 px-2 py-1 align-top">
                    <div className="text-xs leading-tight whitespace-pre-wrap">
                      {targetMetric.name || "-"}
                    </div>
                  </td>
                  {MONTH_KEYS.map((key) => (
                    <td
                      key={key}
                      className="border border-gray-200 px-1 py-1 text-center"
                    >
                      {targetMetric.values?.[key] == null
                        ? "-"
                        : targetMetric.values[key]}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-1 py-1 text-center text-xs font-medium">
                    {targetAverage != null ? targetAverage.toFixed(2) : "-"}
                  </td>
                </tr>

                {/* ACTUAL Row */}
                <tr>
                  <td className="border border-gray-200 px-2 py-1 align-top">
                    <div className="text-xs leading-tight whitespace-pre-wrap">
                      {actualMetric.name || "-"}
                    </div>
                  </td>
                  {MONTH_KEYS.map((key) => (
                    <td
                      key={key}
                      className="border border-gray-200 px-1 py-1 text-center"
                    >
                      {actualMetric.values?.[key] == null
                        ? "-"
                        : actualMetric.values[key]}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-1 py-1 text-center text-xs font-medium">
                    {actualAverage != null ? actualAverage.toFixed(2) : "-"}
                  </td>
                </tr>

                {/* Efficiency Row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="border border-gray-200 px-2 py-1 text-left text-xs">
                    {t("kpi.efficiency")}
                  </td>
                  {efficiencyValues.slice(0, 12).map((v, idx) => (
                    <td
                      key={MONTH_KEYS[idx]}
                      className="border border-gray-200 px-1 py-1 text-center text-xs"
                    >
                      {v == null ? "-" : `${v.toFixed(0)}%`}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-1 py-1 text-center text-xs font-semibold">
                    {efficiencyValues[12] == null
                      ? "-"
                      : `${efficiencyValues[12]!.toFixed(0)}%`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Chart Card - Only show if has data */}
        {hasData && (
          <Card className="p-4 flex flex-col">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              {t("kpi.chartTitle")}
            </h2>
            <div className="flex-1 min-h-[260px]">
              <Bar
                options={getChartOptions(efficiencyValues, record.targetValue)}
                data={getChartData(record, efficiencyValues, t)}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
