"use client";

import { useTranslations } from "next-intl";
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
      color: "cyan",
    },
    {
      type: "maintenance" as ViewType,
      label: t("viewType.maintenance"),
      icon: Wrench,
      description: t("viewDescriptions.maintenance"),
      color: "magenta",
    },
    {
      type: "documents" as ViewType,
      label: t("viewType.documents"),
      icon: FileText,
      description: t("viewDescriptions.documents"),
      color: "blue",
    },
  ];

  const colorClasses = {
    cyan: "from-cyan-500 to-cyan-300 border-cyan-500/50 text-cyan-400",
    magenta:
      "from-fuchsia-500 to-pink-300 border-fuchsia-500/50 text-fuchsia-400",
    blue: "from-blue-500 to-cyan-300 border-blue-500/50 text-blue-400",
  };

  return (
    <div className="space-y-8">
      {/* Header with back button and department name */}
      <div className="flex items-center gap-6">
        <button
          onClick={onBack}
          className="cyber-button px-4 py-2 font-cyber text-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("actions.back")}
        </button>
        <div className="cyber-corner cyber-card px-6 py-4">
          <h2 className="text-3xl font-cyber font-bold cyber-neon-cyan mb-1">
            {department.name}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-cyber text-cyan-300/80">ID:</span>
            <span className="text-sm font-cyber text-cyan-200 font-semibold">
              {department.code}
            </span>
          </div>
        </div>
      </div>

      {/* View buttons grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {views.map((view, index) => {
          const Icon = view.icon;
          const colors = colorClasses[view.color as keyof typeof colorClasses];
          return (
            <div
              key={view.type}
              className={cn(
                "cyber-card cyber-hologram cursor-pointer transition-all duration-300 group",
                "hover:scale-105 active:scale-95",
                "cyber-corner relative overflow-hidden"
              )}
              onClick={() => onSelectView(view.type)}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="p-8 relative z-10">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div
                    className={cn(
                      "p-4 rounded-lg bg-gradient-to-br",
                      colors,
                      "border-2 shadow-lg shadow-cyan-500/20"
                    )}
                  >
                    <Icon className="h-10 w-10 text-white cyber-text-glow" />
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "font-cyber font-bold text-xl mb-2",
                        view.color === "cyan" && "cyber-neon-cyan",
                        view.color === "magenta" &&
                          "text-fuchsia-400 cyber-text-glow",
                        view.color === "blue" && "cyber-neon-blue"
                      )}
                    >
                      {view.label}
                    </h3>
                    <p className="text-sm text-cyan-300/90 font-cyber mt-2">
                      {view.description}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    view.color === "cyan" && "from-cyan-500 to-transparent",
                    view.color === "magenta" &&
                      "from-fuchsia-500 to-transparent",
                    view.color === "blue" && "from-blue-500 to-transparent"
                  )}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
