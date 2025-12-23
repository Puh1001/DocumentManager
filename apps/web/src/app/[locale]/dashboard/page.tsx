"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Folder, Users, Clock, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { useMaintenanceNotices } from "@/hooks/use-maintenance-notices";

interface Stats {
  totalDocuments: number;
  totalFolders: number;
  totalUsers: number;
  recentUploads: number;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { notices } = useMaintenanceNotices();
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalFolders: 0,
    totalUsers: 0,
    recentUploads: 0,
  });
  const upcomingNotices = useMemo(
    () =>
      [...notices]
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 3),
    [notices]
  );

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await api.get<Stats>("/storage/stats");
        setStats(stats);
      } catch (error) {
        console.error("Failed to load stats:", error);
        // Fallback to zeros on error
        setStats({
          totalDocuments: 0,
          totalFolders: 0,
          totalUsers: 0,
          recentUploads: 0,
        });
      }
    };
    loadStats();
  }, []);

  const statCards = [
    {
      title: t("stats.totalDocuments"),
      value: stats.totalDocuments,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: t("stats.folders"),
      value: stats.totalFolders,
      icon: Folder,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: t("stats.users"),
      value: stats.totalUsers,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: t("stats.recentUploads"),
      value: stats.recentUploads,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("sections.recentDocuments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("sections.recentDocumentsDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("sections.activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("sections.activityDescription")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              {t("sections.maintenance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("sections.maintenanceDescription")}
            </p>
            {upcomingNotices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("sections.noMaintenance")}
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="text-sm font-semibold">{notice.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(notice.startDate)} -{" "}
                      {formatDate(notice.endDate)}
                    </p>
                    {notice.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notice.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
