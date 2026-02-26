"use client";

import { useTranslations, useLocale } from "next-intl";
import { type Department, getDepartmentName } from "@/lib/api";
import { Building2 } from "lucide-react";

interface DepartmentGridProps {
  departments: Department[];
  onSelectDepartment: (department: Department) => void;
  loading?: boolean;
  error?: string | null;
}

export function DepartmentGrid({
  departments,
  onSelectDepartment,
  loading = false,
  error = null,
}: DepartmentGridProps) {
  const t = useTranslations("boss");
  const locale = useLocale();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500" />
          <div
            className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-transparent border-r-magenta-500/30 border-t-magenta-500"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cyber-card p-6 cyber-corner">
        <div className="text-center text-fuchsia-400 cyber-text-glow">
          <p className="font-cyber font-semibold text-lg">
            {t("error.loadFailed")}
          </p>
          <p className="text-sm mt-2 text-cyan-300/90">{error}</p>
        </div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="cyber-card p-6 cyber-corner">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-cyan-400 cyber-text-glow" />
          <p className="text-xl font-cyber font-semibold cyber-neon-cyan">
            {t("empty.noDepartments")}
          </p>
          <p className="text-sm mt-2 text-cyan-300/90 font-cyber">
            {t("empty.noDepartmentsDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {departments.map((dept, index) => (
        <button
          key={dept.id}
          type="button"
          className="cyber-card cyber-corner group flex items-center gap-3 p-4 text-left rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 transition-[border-color,box-shadow] duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a] opacity-0 animate-slide-up"
          style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
          onClick={() => onSelectDepartment(dept)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300 transition-colors duration-200 group-hover:bg-cyan-500/25">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-cyber font-semibold text-base leading-tight text-cyan-50 line-clamp-2 group-hover:text-cyan-100 transition-colors duration-200">
              {getDepartmentName(dept, locale)}
            </span>
            {!dept.isActive && (
              <span className="text-xs font-cyber text-fuchsia-300 mt-0.5">
                {t("inactive")}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
