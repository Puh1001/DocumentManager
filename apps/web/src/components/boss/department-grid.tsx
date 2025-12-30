"use client";

import { useTranslations } from "next-intl";
import { type Department } from "@/lib/api";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {departments.map((dept, index) => (
        <div
          key={dept.id}
          className={cn(
            "cyber-card cyber-hologram cursor-pointer transition-all duration-300",
            "hover:scale-105 active:scale-95",
            "cyber-corner"
          )}
          onClick={() => onSelectDepartment(dept)}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 cyber-border rounded-lg bg-cyan-500/15">
                <Building2 className="h-6 w-6 text-cyan-300 cyber-text-glow" />
              </div>
              {!dept.isActive && (
                <span className="text-xs font-cyber text-fuchsia-400 bg-fuchsia-500/20 px-3 py-1 rounded border border-fuchsia-500/30 cyber-text-glow">
                  {t("inactive")}
                </span>
              )}
            </div>
            <h3 className="font-cyber font-bold text-lg mb-2 line-clamp-2 cyber-neon-cyan">
              {dept.name}
            </h3>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cyan-500/30">
              <span className="text-xs font-cyber text-cyan-300/80">ID:</span>
              <span className="text-sm font-cyber text-cyan-200 font-semibold">
                {dept.code}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-magenta-500 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
