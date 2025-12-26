"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate("home")}
        className="h-auto p-0 font-normal"
      >
        <Home className="h-4 w-4 mr-1" />
        {items[0].label}
      </Button>
      {items.slice(1).map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4" />
          {item.onClick ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={item.onClick}
              className="h-auto p-0 font-normal"
            >
              {item.label}
            </Button>
          ) : (
            <span>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
