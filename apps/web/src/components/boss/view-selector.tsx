"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Department } from "@/lib/api";
import { type ViewType } from "./use-boss-navigation";
import { ArrowLeft, BarChart2, Wrench, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewSelectorProps {
  department: Department;
  onSelectView: (viewType: ViewType) => void;
  onBack: () => void;
}

export function ViewSelector({
  department,
  onSelectView,
  onBack,
}: ViewSelectorProps) {
  const t = useTranslations("boss");

  const views = [
    {
      type: "kpi" as ViewType,
      label: t("viewType.kpi"),
      icon: BarChart2,
      description: t("viewDescriptions.kpi"),
    },
    {
      type: "maintenance" as ViewType,
      label: t("viewType.maintenance"),
      icon: Wrench,
      description: t("viewDescriptions.maintenance"),
    },
    {
      type: "documents" as ViewType,
      label: t("viewType.documents"),
      icon: FileText,
      description: t("viewDescriptions.documents"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with back button and department name */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{department.name}</h2>
          <p className="text-sm text-muted-foreground">{department.code}</p>
        </div>
      </div>

      {/* View buttons grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <Card
              key={view.type}
              className={cn(
                "cursor-pointer transition-all duration-200",
                "hover:shadow-lg hover:border-primary",
                "active:scale-95"
              )}
              onClick={() => onSelectView(view.type)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{view.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {view.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
