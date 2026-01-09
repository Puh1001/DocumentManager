"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { getErrorMessage } from "@/lib/error-handler";

interface KpiRecord {
  id: string;
  departmentId: string;
  year: number;
  title: string;
  target: string;
  targetValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface KpiListProps {
  departmentId: string;
  onSelectKpi: (kpiId: string) => void;
  onBack: () => void;
}

export function KpiList({ departmentId, onSelectKpi, onBack }: KpiListProps) {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<KpiRecord[]>(
        `/kpi/records?departmentId=${departmentId}&year=${selectedYear}`
      );
      setRecords(data);
    } catch (err) {
      console.error("Failed to load KPI records:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [departmentId, selectedYear, tCommon]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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
            <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
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
      </div>

      {records.length === 0 ? (
        <div className="cyber-card p-6 cyber-corner">
          <div className="text-center py-12">
            <BarChart2 className="h-16 w-16 mx-auto mb-4 text-cyan-500/50 cyber-text-glow" />
            <p className="text-xl font-cyber font-semibold cyber-neon-cyan">
              {t("empty.noKpi")}
            </p>
            <p className="text-sm mt-2 text-cyan-400/60 font-cyber">
              {t("empty.noKpiDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record, index) => (
            <div
              key={record.id}
              className="w-full cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 p-4 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/5"
              onClick={() => onSelectKpi(record.id)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex-shrink-0">
                <BarChart2 className="h-6 w-6 text-cyan-300 cyber-text-glow" />
              </div>
              <h3 className="font-cyber font-bold text-base cyber-neon-cyan flex-1 break-words whitespace-normal">
                {record.title || t("kpi.untitled")}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
