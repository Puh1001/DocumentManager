"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useBossNavigation } from "@/components/boss/use-boss-navigation";
import { Breadcrumb } from "@/components/boss/breadcrumb";
import { DepartmentGrid } from "@/components/boss/department-grid";
import { ViewSelector } from "@/components/boss/view-selector";
import { KpiList } from "@/components/boss/kpi-list";
import { MaintenanceList } from "@/components/boss/maintenance-list";
import { DocumentsList } from "@/components/boss/documents-list";
import { KpiDetail } from "@/components/boss/kpi-detail";
import { MaintenanceDetail } from "@/components/boss/maintenance-detail";
import { DocumentDetail } from "@/components/boss/document-detail";
import { departmentApi, type Department } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-handler";

export default function BossPage() {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const navigation = useBossNavigation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has boss role
  useEffect(() => {
    if (!isLoading && user) {
      const isBoss = user.roles?.includes("boss");
      if (!isBoss) {
        router.push(`/${locale}/dashboard`);
      }
    }
  }, [user, isLoading, router, locale]);

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentApi.getAll();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    if (user?.roles?.includes("boss")) {
      loadDepartments();
    }
  }, [user, loadDepartments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isBoss = user.roles?.includes("boss");
  if (!isBoss) {
    return null;
  }

  const handleNavigate = (step: "home" | "department" | "view") => {
    if (step === "home") {
      navigation.reset();
    } else if (step === "department") {
      navigation.selectView(null);
      navigation.selectItem(null);
    } else if (step === "view") {
      navigation.selectItem(null);
    }
  };

  const handleSelectDepartment = (department: Department) => {
    navigation.selectDepartment(department);
  };

  const handleSelectView = (
    viewType: "kpi" | "maintenance" | "documents" | null
  ) => {
    navigation.selectView(viewType);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Show department grid if no department selected
  if (!navigation.state.selectedDepartment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        <DepartmentGrid
          departments={departments}
          onSelectDepartment={handleSelectDepartment}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  // Show view selector if department selected but no view type
  if (!navigation.state.viewType) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />

        <ViewSelector
          department={navigation.state.selectedDepartment}
          onSelectView={handleSelectView}
          onBack={handleBack}
        />
      </div>
    );
  }

  // Show detail views if item is selected
  if (navigation.state.selectedItemId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>

        <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />

        {navigation.state.viewType === "kpi" && (
          <KpiDetail
            kpiId={navigation.state.selectedItemId}
            onBack={handleBack}
          />
        )}

        {navigation.state.viewType === "maintenance" && (
          <MaintenanceDetail
            maintenanceId={navigation.state.selectedItemId}
            onBack={handleBack}
          />
        )}

        {navigation.state.viewType === "documents" && (
          <DocumentDetail
            documentId={navigation.state.selectedItemId}
            onBack={handleBack}
          />
        )}
      </div>
    );
  }

  // Show list views based on viewType
  const department = navigation.state.selectedDepartment;
  if (!department) return null;

  const handleSelectItem = (itemId: string) => {
    navigation.selectItem(itemId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />

      {navigation.state.viewType === "kpi" && (
        <KpiList
          departmentId={department.id}
          onSelectKpi={handleSelectItem}
          onBack={handleBack}
        />
      )}

      {navigation.state.viewType === "maintenance" && (
        <MaintenanceList
          departmentId={department.id}
          onSelectMaintenance={handleSelectItem}
          onBack={handleBack}
        />
      )}

      {navigation.state.viewType === "documents" && (
        <DocumentsList
          departmentId={department.id}
          departmentName={department.name}
          onSelectDocument={handleSelectItem}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
