"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p className="font-semibold">{t("error.loadFailed")}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  if (departments.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold">{t("empty.noDepartments")}</p>
          <p className="text-sm mt-1">{t("empty.noDepartmentsDescription")}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {departments.map((dept) => (
        <Card
          key={dept.id}
          className={cn(
            "cursor-pointer transition-all duration-200",
            "hover:shadow-lg hover:border-primary",
            "active:scale-95"
          )}
          onClick={() => onSelectDepartment(dept)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              {!dept.isActive && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {t("inactive")}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-base mb-1 line-clamp-2">
              {dept.name}
            </h3>
            <p className="text-sm text-muted-foreground">{dept.code}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
