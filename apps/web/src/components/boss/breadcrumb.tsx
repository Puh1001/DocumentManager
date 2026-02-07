"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Home } from "lucide-react";
import { type BossNavigationState } from "./use-boss-navigation";

interface BreadcrumbProps {
  state: BossNavigationState;
  onNavigate: (step: "home" | "department" | "view") => void;
}

export function Breadcrumb({ state, onNavigate }: BreadcrumbProps) {
  const t = useTranslations("common");
  const tBoss = useTranslations("boss");

  const items = [
    {
      label: t("navigation.dashboard"),
      onClick: () => onNavigate("home"),
      show: true,
    },
    {
      label: state.selectedDepartment?.name || "",
      onClick: () => onNavigate("department"),
      show: !!state.selectedDepartment,
    },
    {
      label:
        state.viewType === "kpi"
          ? tBoss("viewType.kpi")
          : state.viewType === "maintenance"
            ? tBoss("viewType.maintenance")
            : state.viewType === "documents"
              ? tBoss("viewType.documents")
              : "",
      onClick: () => onNavigate("view"),
      show: !!state.viewType,
    },
    {
      label: state.selectedItemId ? tBoss("detail") : "",
      show: !!state.selectedItemId,
    },
  ].filter((item) => item.show);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-3 text-sm font-cyber mb-6">
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="cyber-button px-3 py-1.5 text-xs flex items-center gap-2 text-cyan-300 hover:text-cyan-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]"
      >
        <Home className="h-3.5 w-3.5" />
        <span>{items[0].label}</span>
      </button>
      {items.slice(1).map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <ChevronRight className="h-4 w-4 text-cyan-400/70" />
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="cyber-button px-3 py-1.5 text-xs text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-cyan-200 font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
