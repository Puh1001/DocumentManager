"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ArrowLeft, BarChart2, Calendar } from "lucide-react";
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
  const locale = useLocale();
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = new Date().getFullYear();

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<KpiRecord[]>(
        `/kpi/records?departmentId=${departmentId}&year=${year}`
      );
      setRecords(data);
    } catch (err) {
      console.error("Failed to load KPI records:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [departmentId, year, tCommon]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">{t("error.loadKpiFailed")}</p>
            <p className="text-sm mt-1">{error}</p>
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

      {records.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">{t("empty.noKpi")}</p>
            <p className="text-sm mt-1">{t("empty.noKpiDescription")}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary active:scale-95"
              onClick={() => onSelectKpi(record.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <BarChart2 className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {record.year}
                  </span>
                </div>
                <h3 className="font-semibold text-base mb-2 line-clamp-2">
                  {record.title || t("kpi.untitled")}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">{t("kpi.target")}:</span>{" "}
                    {record.target || "-"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(record.updatedAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
